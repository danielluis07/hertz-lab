import "server-only";

import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  isNull,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias, type PgColumn } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "@/db";
import { category, product } from "@/db/schema";
import { client } from "@/lib/s3";
import { imageUploadSchema, IMAGE_EXTENSIONS } from "@/lib/utils/image";
import { adminProcedure, createTRPCRouter, FieldError } from "@/trpc/init";
import { categoryListParamsSchema } from "@/modules/categories/admin/schemas";
import type { CategorySortField } from "@/modules/categories/constants";
import {
  CATEGORY_IMAGE_PREFIX,
  isCategoryImageKey,
} from "@/modules/categories/images";
import { categorySchema } from "@/modules/categories/schemas";
import {
  findCategoryIdWithSlug,
  findParentCandidate,
} from "@/modules/categories/server/queries";

/**
 * How long a minted upload URL is good for. Long enough for a large photograph
 * on a Brazilian connection, short enough that a URL copied out of the network
 * tab is worthless by the time it is used.
 *
 * The same number the products module keeps, and a second copy of it on
 * purpose: categories may not import products (ADR-0009), and a global home
 * for one constant two modules happen to agree on would be the global layer
 * knowing a rule (ADR-0007).
 */
const UPLOAD_URL_TTL_SECONDS = 10 * 60;

/**
 * The Category a row hangs under, joined to itself. `parentId` is nullable — a
 * root has none — so this is a **left** join, and `parentName` comes back
 * `null` for a root rather than dropping the row from the list.
 */
const parent = alias(category, "parent");

/** The same table once more, as the Categories that hang under *this* one. */
const child = alias(category, "child");

/**
 * How many Products sit in a Category, and how many Categories sit under it —
 * the two numbers ADR-0023's delete rule is written in. They are on the row so
 * that an Admin reads why a Category may not be deleted before walking into
 * the refusal, rather than after it.
 *
 * **Correlated subqueries rather than joins.** Two `leftJoin`s and a `groupBy`
 * would multiply the Products against the children and need
 * `count(distinct …)` to undo it; on a set of tens of rows these cost nothing
 * and say what they mean. The `::int` is because `count(*)` is a `bigint`,
 * which arrives over the wire as a string.
 *
 * **Counting `product` from inside `categories` is ADR-0024**, and it is worth
 * knowing that ADR-0009 settled the opposite for the surface it could see: a
 * Category page wanting a count was to compose two calls. That remedy cannot
 * survive a *sortable* count, which has to be a term in the `ORDER BY` that
 * chose the rows. What is read here is how many rows hold a key to this one —
 * through the key that already points this way, and nothing else of that
 * table. A `leftJoin` pulling a Product's name or price into a Category row
 * would be over the line ADR-0024 draws.
 */
const productCount = sql<number>`(${db
  .select({ value: count() })
  .from(product)
  .where(eq(product.categoryId, category.id))})::int`;

const childCount = sql<number>`(${db
  .select({ value: count() })
  .from(child)
  .where(eq(child.parentId, category.id))})::int`;

/**
 * The sortable columns, as the expressions `orderBy` takes. Two of the three
 * are derived — the parent's name from the self-join, the count from a
 * subquery — which is why sorting is the query's job and never the browser's:
 * a client-side comparator would be a second sorting implementation, one that
 * has to know which of these are text and which are numbers, sitting beside
 * the `buildSortHref` that already builds the URL.
 */
const SORT_COLUMNS = {
  name: category.name,
  parentName: parent.name,
  productCount,
} satisfies Record<CategorySortField, PgColumn | SQL>;

export const adminRouter = createTRPCRouter({
  /**
   * Every Category, in one unpaginated fetch, sorted the way the URL says.
   *
   * **It returns a bare array, not `{ items, total }`.** `total` exists in the
   * products list because `PaginationNav` needs a page count, and there is no
   * nav here: the set is tens of rows and an Admin sees it whole (#56), so a
   * second `count(*)` would be a number nothing renders. `docs/MODULES.md`
   * carries the exception and the condition it holds under.
   *
   * **Roots and children interleave.** Under name-ascending a child sorts
   * among unrelated roots, and that is correct: grouping by parent would make
   * "sorted by Nome" a claim the table visibly does not honour. The tree is
   * two levels deep (ADR-0022), and "Categoria pai" is the column that shows
   * where a row sits in it.
   *
   * No `createdAt`. A date answers "what changed recently", which is a
   * question about a list you cannot see all of.
   */
  list: adminProcedure
    .input(categoryListParamsSchema)
    .query(async ({ input }) => {
      const direction = input.sortOrder === "asc" ? asc : desc;

      return db
        .select({
          id: category.id,
          name: category.name,
          slug: category.slug,
          imageS3Key: category.imageS3Key,
          parentName: parent.name,
          productCount,
          childCount,
        })
        .from(category)
        .leftJoin(parent, eq(parent.id, category.parentId))
        .orderBy(
          direction(SORT_COLUMNS[input.sortBy]),
          // uuidv7 ids sort by creation, so two Categories sharing a name — or
          // a parent, or a count — come back in the same order on every
          // request rather than in whatever order the planner happened to
          // produce. Reloading a sorted URL reproduces the page exactly.
          asc(category.id),
        );
    }),
  /**
   * Every Category as `{ id, name }`, unpaginated — the twin of
   * `brands.admin.options`, and there for the same composing route
   * (ADR-0008's rule 4).
   *
   * **Flat, and sorted by name.** The tree is real — a Category has a
   * `parentId` — but a filter asks "which section", not "where in the
   * hierarchy", and an indented tree is the categories list's own surface to
   * build. Nothing here knows the tree, so nothing here goes stale when it
   * gains one.
   */
  options: adminProcedure.query(async () =>
    db
      .select({ id: category.id, name: category.name })
      .from(category)
      .orderBy(asc(category.name)),
  ),

  /**
   * The Categories a new or edited one may hang under: **roots only**, sorted
   * by name, minus the row being edited.
   *
   * **`options` cannot serve this, and that is the point of a second
   * procedure** (ADR-0022). `options` lists every Category, children
   * included, and children cannot be parents — a tree two levels deep has no
   * third. Filtering it in the browser would mean the form re-deriving "is a
   * root" from a payload that does not carry `parentId`, and `options`
   * promises in its own docblock to know nothing of the hierarchy. That
   * promise is worth keeping: it is what stops the products filter from going
   * stale every time the tree changes shape.
   *
   * `excludeId` is the Category being edited, which may not be its own parent
   * — refusal 1 of ADR-0022, kept out of the Admin's reach rather than only
   * refused after the save. It is optional because a Category that does not
   * exist yet has no id to exclude.
   *
   * The list is short by construction and the input is one optional id, so it
   * is read through `caller` by the route that composes the form — the same
   * path `options` takes (ADR-0008's rule 4).
   */
  parentOptions: adminProcedure
    .input(z.object({ excludeId: z.string().optional() }).optional())
    .query(async ({ input }) =>
      db
        .select({ id: category.id, name: category.name })
        .from(category)
        .where(
          and(
            isNull(category.parentId),
            input?.excludeId ? ne(category.id, input.excludeId) : undefined,
          ),
        )
        .orderBy(asc(category.name)),
    ),

  /**
   * Writes one Category, in **one transaction** — the first write this
   * application has ever had against the `category` table.
   *
   * The order of what happens inside it is the whole of the procedure, and it
   * is not arbitrary:
   *
   * **The parent is checked first** (ADR-0022). Two of the tree's three
   * refusals apply to a row being created — the proposed parent must exist,
   * and it must itself be a root. The third, "a Category that already has
   * children may not take a parent", cannot: a Category being created has
   * none. Both live here rather than in `categorySchema` because both need a
   * read — the deliberate exception ADR-0022 takes to `docs/MODULES.md`'s
   * *if it can be a pure function, it must be one*.
   *
   * **Then the slug**, and **inside the transaction**, because it has to see
   * what this write has done so far. Read-then-write, so two Admins racing on
   * one slug can still collide on the unique index and the loser reads the
   * generic pt-BR toast; asking first is what turns a Postgres index name into
   * a sentence under the field that caused it.
   *
   * Both reads live in `server/queries.ts` now: ADR-0010 creates a query
   * layer on the **second** caller, and `update` (#61) is it — asking the
   * parent question verbatim, and the slug question with an `exceptId`.
   *
   * Every refusal names its field (ADR-0013), so the form renders the sentence
   * under the control that caused it and the global toast stands down. The
   * codes differ because the failures do: a parent that has been deleted since
   * the Select was filled is `NOT_FOUND`, while a parent that is a child is a
   * `CONFLICT` between the write and the shape the tree is in.
   *
   * It returns the new id so the call site can push to the Category's page.
   */
  create: adminProcedure.input(categorySchema).mutation(async ({ input }) =>
    db.transaction(async (tx) => {
      if (input.parentId !== null) {
        const proposed = await findParentCandidate(tx, input.parentId);

        if (!proposed) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "A categoria pai escolhida não existe mais.",
            cause: new FieldError("parentId"),
          });
        }

        if (proposed.parentId !== null) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "A categoria pai já é uma subcategoria: as categorias têm no máximo dois níveis.",
            cause: new FieldError("parentId"),
          });
        }
      }

      // No `exceptId`: a Category that does not exist yet has no slug of its
      // own to collide with.
      const taken = await findCategoryIdWithSlug(tx, { slug: input.slug });

      if (taken) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe uma categoria com esta URL.",
          cause: new FieldError("slug"),
        });
      }

      const [created] = await tx
        .insert(category)
        .values({
          name: input.name,
          slug: input.slug,
          description: input.description,
          parentId: input.parentId,
          imageS3Key: input.imageS3Key,
        })
        .returning({ id: category.id });

      return { id: created.id };
    }),
  ),

  /**
   * The whole row behind `/admin/categories/[id]` — every column, because the
   * form edits nearly all of them and the page's heading needs the name.
   *
   * **No counts and no parent name**, unlike `list`. Those two are on the list
   * row so that an Admin reads why a Category may not be deleted *before*
   * walking into the refusal (ADR-0023); here the parent is a Select the Admin
   * is about to change, and it is bound to the `parentId` this returns.
   *
   * **Returns `null`, never `NOT_FOUND`.** A read resolves absence to
   * "absent", and the page turns the `null` into `notFound()` — which keeps
   * the control flow in `page.tsx`, where ADR-0006 already put the auth check
   * (`docs/DATA-FLOW.md`). Writes are the other half of that asymmetry:
   * `update` below throws.
   */
  byId: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const row = await db.query.category.findFirst({
        where: { id: input.id },
      });

      return row ?? null;
    }),

  /**
   * Rewrites one Category, in **one transaction**, in the same order `create`
   * writes one — parent, then slug, then the row — with two additions the
   * existence of a row before the write makes possible.
   *
   * **The first is the transaction's own first read.** A Category that no
   * longer exists is a `NOT_FOUND` with no message of its own: the client's
   * code map already says "Este item não existe mais. Atualize a página."
   * (ADR-0013), and there is nothing to add to it. It is read inside the
   * transaction rather than before it, so what the guard saw is what the
   * `UPDATE` writes.
   *
   * **The second is ADR-0022's third refusal**, the one `create` cannot have:
   * a Category that already has children may not itself take a parent, because
   * a tree two levels deep has no third. Re-parenting is refused from this end
   * rather than by dragging a subtree down. What stays allowed is everything
   * that keeps the bound: a child moves between roots, a child is promoted to
   * a root by choosing "Nenhuma — categoria raiz", and a childless root is
   * demoted freely.
   *
   * Refusal 1 — a Category may not be its own parent — is checked here as well
   * as kept out of the Admin's reach by `parentOptions({ excludeId })`. The
   * Select cannot offer it; a payload can still name it, and it is the one
   * choice the other two refusals would let through: a childless root naming
   * itself passes "exists" and passes "is a root", and writes a row that is its
   * own ancestor.
   *
   * **`slug` is an ordinary editable field with no linkage to `name`.** It is a
   * public URL (ADR-0005): renaming a Category leaves its address alone,
   * because a Slug that changes breaks every link that was ever shared.
   *
   * The picture is not part of this write yet beyond the key riding through
   * (ADR-0018); the post-commit deletion of a replaced object lands with the
   * upload field.
   */
  update: adminProcedure
    .input(categorySchema.extend({ id: z.string() }))
    .mutation(async ({ input }) =>
      db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: category.id })
          .from(category)
          .where(eq(category.id, input.id))
          .limit(1);

        // No message: an English one would win over the pt-BR code map on the
        // client (ADR-0013), and no field either — the row the Admin is
        // editing is not an input they can correct.
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

        if (input.parentId !== null) {
          if (input.parentId === input.id) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Uma categoria não pode ser a própria categoria pai.",
              cause: new FieldError("parentId"),
            });
          }

          // One row is the whole question: whether this Category has *any*
          // child, not how many. `list` counts them because a number is what
          // ADR-0023's delete rule is read in; a refusal only needs the first.
          const [firstChild] = await tx
            .select({ id: category.id })
            .from(category)
            .where(eq(category.parentId, input.id))
            .limit(1);

          if (firstChild) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "Esta categoria já tem subcategorias e por isso não pode virar subcategoria de outra: as categorias têm no máximo dois níveis.",
              cause: new FieldError("parentId"),
            });
          }

          const proposed = await findParentCandidate(tx, input.parentId);

          if (!proposed) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "A categoria pai escolhida não existe mais.",
              cause: new FieldError("parentId"),
            });
          }

          if (proposed.parentId !== null) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "A categoria pai já é uma subcategoria: as categorias têm no máximo dois níveis.",
              cause: new FieldError("parentId"),
            });
          }
        }

        // This Category holds its own URL, so a Slug nobody changed is not a
        // collision with itself.
        const taken = await findCategoryIdWithSlug(tx, {
          slug: input.slug,
          exceptId: input.id,
        });

        if (taken) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Já existe uma categoria com esta URL.",
            cause: new FieldError("slug"),
          });
        }

        // Field by field rather than by spread: `id` is the row being written
        // and not a column to write, and `updatedAt` is `timestamps()`' own,
        // maintained by `$onUpdate`.
        await tx
          .update(category)
          .set({
            name: input.name,
            slug: input.slug,
            description: input.description,
            parentId: input.parentId,
            imageS3Key: input.imageS3Key,
          })
          .where(eq(category.id, input.id));

        return { id: input.id };
      }),
    ),

  /**
   * Authorises one Category picture upload: takes what the browser knows about
   * the file and returns the key it will be stored under together with a
   * presigned PUT (ADR-0018). The file never transits this server.
   *
   * **The key is minted here, and that is the whole point.** A client that
   * cannot name a key cannot overwrite an existing object, cannot escape the
   * `categories/` prefix, and cannot put a filename of its own choosing in
   * front of anyone. It is `categories/<uuidv7>.<ext>`, reusing the
   * `Bun.randomUUIDv7()` that `db/schema/columns.ts` already mints ids with.
   *
   * **This is the products procedure's twin and not a call to it.** The prefix
   * is what differs, and it is what makes a `categories/` key a different
   * object from a `products/` one — so a shared implementation would have to
   * take the prefix from its caller, and importing the products module to get
   * one is what ADR-0009 forbids outright.
   *
   * **Neither the size nor the type is enforced by the signature.** `presign`
   * signs one method and has no `content-length-range`, and a query-signed PUT
   * does not carry `Content-Type` among its signed headers — S3 takes a
   * mismatched one. So the input's `contentType` decides what the object will
   * be *called*, the input's `size` refuses the Admin before the bytes move,
   * and the write that keeps the key `stat`s the object as the guard that
   * holds (ADR-0018). That write is the Category form's, and lands with it.
   *
   * The refusals an Admin reads for a bad file are `imageUploadSchema`'s, in
   * pt-BR beside the rule they enforce (ADR-0013).
   *
   * Named for the act rather than the mechanism (ADR-0010), so a later move to
   * a POST policy does not rename it.
   */
  createImageUpload: adminProcedure
    .input(imageUploadSchema)
    .mutation(({ input }) => {
      const key = `${CATEGORY_IMAGE_PREFIX}/${Bun.randomUUIDv7()}.${
        IMAGE_EXTENSIONS[input.contentType]
      }`;

      const url = client.presign(key, {
        method: "PUT",
        type: input.contentType,
        expiresIn: UPLOAD_URL_TTL_SECONDS,
      });

      return { key, url };
    }),

  /**
   * Throws away an upload nobody kept: the object behind a tile the Admin
   * removed before the Category was ever saved with it. **The one orphan we
   * can see, so we take it** (ADR-0018) — every other abandoned object stays,
   * because there is no scheduled runner to sweep them and a sweep nobody runs
   * reads as though orphans were handled.
   *
   * Two things make an admin-only delete-by-key safe to expose. The key must
   * look like one *this module* minted, so no path can be walked out of the
   * prefix and a `products/` key is refused here; and **an object a `category`
   * row references is refused**, which is what confines this to uploads that
   * were never persisted. A persisted picture's object dies with the write
   * that drops its key.
   *
   * That second guard is why this cannot be the products procedure under
   * another name: "a key any `product_image` row references is refused" and
   * "a key any `category` row references is refused" are two queries against
   * two tables, and a procedure that ran only one of them would delete the
   * other module's live object.
   *
   * **It never throws for a failed delete.** The Admin asked to remove a tile,
   * not to clean a bucket, and a toast about S3 for an act that visibly
   * succeeded would be noise; what is left behind is exactly the orphan
   * ADR-0018 already tolerates.
   */
  discardImageUpload: adminProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      if (!isCategoryImageKey(input.key)) return { discarded: false };

      const [persisted] = await db
        .select({ id: category.id })
        .from(category)
        .where(eq(category.imageS3Key, input.key))
        .limit(1);

      if (persisted) return { discarded: false };

      try {
        await client.delete(input.key);
      } catch {
        return { discarded: false };
      }

      return { discarded: true };
    }),
});
