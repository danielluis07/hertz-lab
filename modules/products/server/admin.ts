import "server-only";

import { and, asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { brand, category, product, productVariant } from "@/db/schema";
import { adminProcedure, createTRPCRouter } from "@/trpc/init";
import { productListParamsSchema } from "@/modules/products/admin/schemas";
import {
  PRODUCTS_PER_PAGE,
  type ProductSortField,
} from "@/modules/products/constants";

/**
 * The sortable columns. A predicate that exists only as SQL is not a pure rule
 * and stays in the query (`docs/MODULES.md`); the *directions* are the rule,
 * and they live in the module's constants.
 */
const SORT_COLUMNS = {
  name: product.name,
  ratingAverage: product.ratingAverage,
  createdAt: product.createdAt,
} satisfies Record<ProductSortField, PgColumn>;

export const adminRouter = createTRPCRouter({
  /**
   * Every Product in every status, one page at a time. `perPage` is not an
   * input (ADR-0014): it is `PRODUCTS_PER_PAGE`.
   *
   * A list always succeeds. A `categoryId` that no longer exists matches
   * nothing and yields an empty page, never a 404 — absence resolves to
   * "absent" on a read (`docs/DATA-FLOW.md`).
   */
  list: adminProcedure
    .input(productListParamsSchema)
    .query(async ({ input }) => {
      const where = and(
        // The GIN index over the Portuguese tsvector, `product_search_idx`.
        // `plainto_tsquery` takes whatever an Admin typed and ands the lexemes,
        // so "fone bluetooth" needs both and no input can be a syntax error.
        input.search
          ? sql`${product.searchVector} @@ plainto_tsquery('portuguese', ${input.search})`
          : undefined,
        input.status ? eq(product.status, input.status) : undefined,
        input.categoryId ? eq(product.categoryId, input.categoryId) : undefined,
        input.brandId ? eq(product.brandId, input.brandId) : undefined,
      );

      const direction = input.sortOrder === "asc" ? asc : desc;
      const orderBy: SQL[] = [
        direction(SORT_COLUMNS[input.sortBy]),
        // uuidv7 ids sort by creation, so this breaks ties in a stable order
        // rather than letting a row cross a page boundary between requests.
        asc(product.id),
      ];

      const items = db
        .select({
          id: product.id,
          name: product.name,
          slug: product.slug,
          status: product.status,
          ratingAverage: product.ratingAverage,
          ratingCount: product.ratingCount,
          createdAt: product.createdAt,
          brandName: brand.name,
          categoryName: category.name,
          // Both FKs are notNull with `onDelete: "restrict"`, so an inner join
          // can never drop a Product — which is also why `total` below can
          // count the same `where` without repeating them.
          variantCount: count(productVariant.id),
          totalStock: sql<number>`coalesce(sum(${productVariant.stockQuantity}), 0)::int`,
        })
        .from(product)
        .innerJoin(brand, eq(brand.id, product.brandId))
        .innerJoin(category, eq(category.id, product.categoryId))
        .leftJoin(productVariant, eq(productVariant.productId, product.id))
        .where(where)
        .groupBy(product.id, brand.id, category.id)
        .orderBy(...orderBy)
        .limit(PRODUCTS_PER_PAGE)
        .offset((input.page - 1) * PRODUCTS_PER_PAGE);

      // The count before pagination: `PaginationNav` needs a page count, and
      // the aggregate join above makes it a second query rather than a window.
      const total = db.select({ value: count() }).from(product).where(where);

      const [rows, [totalRow]] = await Promise.all([items, total]);

      return { items: rows, total: totalRow?.value ?? 0 };
    }),
});
