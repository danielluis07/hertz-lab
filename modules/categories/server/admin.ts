import "server-only";

import { asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { alias, type PgColumn } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "@/db";
import { category, product } from "@/db/schema";
import { client } from "@/lib/s3";
import { imageUploadSchema, IMAGE_EXTENSIONS } from "@/lib/utils/image";
import { adminProcedure, createTRPCRouter } from "@/trpc/init";
import { categoryListParamsSchema } from "@/modules/categories/admin/schemas";
import type { CategorySortField } from "@/modules/categories/constants";
import {
  CATEGORY_IMAGE_PREFIX,
  isCategoryImageKey,
} from "@/modules/categories/images";

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
 * Reading the `product` table is not importing the products module: ADR-0009
 * constrains imports, and `product.category_id` already points this way.
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
