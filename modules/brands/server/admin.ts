import "server-only";

import { TRPCError } from "@trpc/server";
import { asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "@/db";
import { brand, product } from "@/db/schema";
import { adminProcedure, createTRPCRouter, FieldError } from "@/trpc/init";
import { brandListParamsSchema } from "@/modules/brands/admin/schemas";
import type { BrandSortField } from "@/modules/brands/constants";
import { brandSchema } from "@/modules/brands/schemas";
import { findBrandIdWithName } from "@/modules/brands/server/queries";

/**
 * How many Products name this Brand — **every** one of them, archived
 * included. That is exactly the set `product.brand_id`'s `on delete restrict`
 * protects, so it is exactly the number a delete refusal will be about; a count
 * that quietly skipped archived Products would show 0 beside a Brand the
 * database will not let go, and the Admin would read the refusal as a bug.
 *
 * **A correlated subquery rather than a join**, for the reason
 * `categories.admin.list` gives: a `leftJoin` plus `groupBy` multiplies rows
 * and needs `count(distinct …)` to undo it, while on a set of tens of rows this
 * costs nothing and says what it means. The `::int` is because `count(*)` is a
 * `bigint`, which arrives over the wire as a string.
 *
 * **Counting `product` from inside `brands` is ADR-0024.** What is read is how
 * many rows hold a key to this one — through the key that already points this
 * way, and nothing else of that table. A join pulling a Product's name or price
 * onto a Brand row would be over the line the ADR draws.
 */
const productCount = sql<number>`(${db
  .select({ value: count() })
  .from(product)
  .where(eq(product.brandId, brand.id))})::int`;

/**
 * The sortable columns, as the expressions `orderBy` takes. One of the two is
 * derived, which is why sorting is the query's job and never the browser's: a
 * client-side comparator would be a second sorting implementation — one that
 * has to know which of these is text and which is a number — sitting beside the
 * `buildSortHref` that already builds the URL.
 */
const SORT_COLUMNS = {
  name: brand.name,
  productCount,
} satisfies Record<BrandSortField, PgColumn | SQL>;

export const adminRouter = createTRPCRouter({
  /**
   * Every Brand, in one unpaginated fetch, sorted the way the URL says.
   *
   * **It returns a bare array, not `{ items, total }`.** `total` exists in the
   * products list because `PaginationNav` needs a page count, and there is no
   * nav here: the set is tens of rows and an Admin sees it whole (ADR-0025), so
   * a second `count(*)` would be a number nothing renders. `docs/MODULES.md`
   * already carries the exception and the condition it holds under, so this is
   * not a deviation for anyone to record a second time.
   *
   * **The table is not its only reader — the Brand form is the second**
   * (ADR-0026). That form opens in a dialog, and a dialog mounts on a click
   * rather than on a navigation, so it has no prefetch site of its own:
   * whatever it edits must already be on the row the Admin opened it from.
   * `BrandFormValues` is one `name`, which this row carries, and the form's
   * `defaultValues` type off `RouterOutput["brands"]["admin"]["list"][number]`
   * — so a field the form grows and this `select` forgets is a type error
   * rather than a blank input saving over real data.
   *
   * No `createdAt`. A date answers "what changed recently", which is a question
   * about a list you cannot see all of.
   */
  list: adminProcedure
    .input(brandListParamsSchema)
    .query(async ({ input }) => {
      const direction = input.sortOrder === "asc" ? asc : desc;

      return db
        .select({ id: brand.id, name: brand.name, productCount })
        .from(brand)
        .orderBy(
          direction(SORT_COLUMNS[input.sortBy]),
          // uuidv7 ids sort by creation, so two Brands sharing a product count
          // come back in the same order on every request rather than in
          // whatever order the planner happened to produce. Reloading a sorted
          // URL reproduces the page exactly.
          asc(brand.id),
        );
    }),

  /**
   * Every Brand as `{ id, name }`, unpaginated, for a select on another
   * module's surface — the products list filter today, the product form next.
   *
   * It exists for the **composing route**, not for the brands list: ADR-0008's
   * rule 4 has the route read both option sets and hand them down, rather than
   * `products` reaching into `brands`. The route calls it through `caller`,
   * because no client component reads it as a query (`docs/MODULES.md`).
   *
   * No pagination and no search on purpose. A dropdown has to offer every
   * option, and a store has tens of brands; the day it has thousands, the
   * control becomes a combobox and this becomes a search procedure.
   */
  options: adminProcedure.query(async () =>
    db
      .select({ id: brand.id, name: brand.name })
      .from(brand)
      .orderBy(asc(brand.name)),
  ),

  /**
   * A new manufacturer, from the dialog beside the list's heading (ADR-0026).
   *
   * **One transaction holding a read and a write**, and the order inside it is
   * the whole of the procedure: the name is asked about first, and *inside*,
   * because the lookup has to see what this write has done so far.
   *
   * The question is `findBrandIdWithName`'s and it is asked in SQL over
   * `lower(name)` — the expression `brand_name_unique_idx` is built over — so
   * the pre-check and the constraint refuse the same set of names rather than
   * two subtly different ones.
   *
   * **The pre-check does not replace the index.** Two Admins racing on one
   * name can both read it free and only one can insert it; the loser's
   * statement lands on the unique index and degrades to ADR-0013's generic
   * pt-BR toast. That is the trade the read buys: the common case gets a
   * sentence under the field that caused it, instead of a Postgres index name
   * nothing on the client could turn into copy.
   *
   * **Nothing is normalised on write** (`CONTEXT.md`). "JBL" is stored as
   * "JBL"; the index is what makes "Sony" and "SONY" one manufacturer.
   *
   * It returns the new id for symmetry with `categories.admin.create` and for
   * whatever reads it next — the dialog itself only closes (ADR-0026), because
   * a Brand has no page to push to.
   */
  create: adminProcedure.input(brandSchema).mutation(async ({ input }) =>
    db.transaction(async (tx) => {
      // No `exceptId`: a Brand that does not exist yet has no name of its own
      // to collide with.
      const taken = await findBrandIdWithName(tx, { name: input.name });

      if (taken) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe uma marca com este nome.",
          cause: new FieldError("name"),
        });
      }

      const [created] = await tx
        .insert(brand)
        .values({ name: input.name })
        .returning({ id: brand.id });

      return { id: created.id };
    }),
  ),

  /**
   * A rename, from the dialog in the row (ADR-0026). A Brand is a name, so
   * this is the only edit there is.
   *
   * Same transaction and same order as `create`, with one addition ahead of
   * it: **the row is read `FOR UPDATE` first.** The lock is what makes the
   * name check and the write one moment rather than two — without it a
   * concurrent rename of this same row fits between them, and the row that
   * commits second overwrites a name the first was refused for.
   *
   * **A row that is gone is a bare `NOT_FOUND`.** No message, because an
   * English one would win over the client's pt-BR code map, which already
   * says *"Este item não existe mais. Atualize a página."*; and no field,
   * because the Brand an Admin is editing is not an input they can correct
   * (ADR-0013).
   *
   * The lookup then runs with `exceptId`, so a Brand does not collide with
   * itself — an Admin correcting "sony" to "Sony" is changing the row's own
   * name, not taking another's.
   */
  update: adminProcedure
    .input(brandSchema.extend({ id: z.string() }))
    .mutation(async ({ input }) =>
      db.transaction(async (tx) => {
        // Only the id: nothing else of the row decides anything here, and a
        // procedure selecting columns it does not decide on invites the next
        // reader to use them. `FOR UPDATE` is what the read is for.
        const [existing] = await tx
          .select({ id: brand.id })
          .from(brand)
          .where(eq(brand.id, input.id))
          .limit(1)
          .for("update");

        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

        // This Brand holds its own name, so a name nobody changed — or one
        // whose casing was corrected — is not a collision with itself.
        const taken = await findBrandIdWithName(tx, {
          name: input.name,
          exceptId: input.id,
        });

        if (taken) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Já existe uma marca com este nome.",
            cause: new FieldError("name"),
          });
        }

        // Field by field rather than by spread: `id` is the row being written
        // and not a column to write, and `updatedAt` is `timestamps()`' own,
        // maintained by `$onUpdate`.
        await tx
          .update(brand)
          .set({ name: input.name })
          .where(eq(brand.id, input.id));

        return { id: input.id };
      }),
    ),

  /**
   * A Brand goes away, and only when no Product names it. **This is ADR-0023
   * with the noun changed**: its amendment records the transfer, so the rule is
   * applied here rather than decided again, and there is no deletion ADR of
   * this module's own to go looking for.
   *
   * **One count, not two.** A Category is empty when both its Products and its
   * child Categories are zero; a Brand has no children, so `product.brand_id`
   * is the only key pointing this way and *empty* is one number — the Admin's
   * "from the leaves upward" two-step collapses to one step. Counting
   * `product` from inside `brands` is ADR-0024: how many rows hold a key to
   * this one, read through the key that already points this way, and nothing
   * else of that table.
   *
   * **The count is pre-checked rather than left to the database.**
   * `product.brand_id` stays `on delete restrict`, but a caught FK violation
   * can only say that there were *some* Products, and reaches the Admin as
   * ADR-0013's *"algo deu errado"*; the number is what turns the refusal into
   * a work order. The constraint stays as the backstop for the race where a
   * Product is assigned to this Brand between the count and the delete — which
   * is also why the row is read `FOR UPDATE` and the count and the delete sit
   * in one transaction.
   *
   * **A row that is gone is a bare `NOT_FOUND`**, for `update`'s reason: an
   * English message would win over the client's pt-BR code map, which already
   * says *"Este item não existe mais. Atualize a página."*
   *
   * Neither refusal carries a `field` — there is no form here, the Admin is
   * looking at a row — so ADR-0013's global tier renders them as toasts.
   *
   * **Nothing follows the commit.** A Category deletes its picture after the
   * row (ADR-0018); a Brand has no object, so the transaction is the whole
   * write.
   *
   * **There is no pure `isRemovable`.** The rule's whole content is *the count
   * is zero*, `Excluir` renders on every row, and no client asks it — ADR-0023
   * carries that call, and extracting one to earn a test would produce a test
   * of the fetch (ADR-0017).
   */
  remove: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) =>
      db.transaction(async (tx) => {
        // Only the id: nothing else of the row decides anything here — a Brand
        // is a name, and there is no S3 key to carry out of the transaction.
        // `FOR UPDATE` is what the read is for.
        const [existing] = await tx
          .select({ id: brand.id })
          .from(brand)
          .where(eq(brand.id, input.id))
          .limit(1)
          .for("update");

        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

        // Every Product naming this Brand, archived included: that is the set
        // the foreign key protects, so it is the number the refusal is about.
        const [products] = await tx
          .select({ value: count() })
          .from(product)
          .where(eq(product.brandId, input.id));

        if (products.value > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Não é possível excluir: ${products.value} ${
              products.value === 1 ? "produto está" : "produtos estão"
            } nesta marca.`,
          });
        }

        await tx.delete(brand).where(eq(brand.id, input.id));

        return { id: input.id };
      }),
    ),
});
