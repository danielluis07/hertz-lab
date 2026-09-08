import "server-only";

import { asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { brand, product } from "@/db/schema";
import { adminProcedure, createTRPCRouter } from "@/trpc/init";
import { brandListParamsSchema } from "@/modules/brands/admin/schemas";
import type { BrandSortField } from "@/modules/brands/constants";

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
});
