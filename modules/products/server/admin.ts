import "server-only";

import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "@/db";
import { brand, category, product, productVariant } from "@/db/schema";
import { adminProcedure, createTRPCRouter } from "@/trpc/init";
import { productListParamsSchema } from "@/modules/products/admin/schemas";
import {
  PRODUCTS_PER_PAGE,
  type ProductSortField,
  type ProductStatus,
} from "@/modules/products/constants";
import { isArchivable, isPublishable } from "@/modules/products/status";

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

/** What both transitions take, and all they take. */
const transitionInput = z.object({ id: z.string() });

/**
 * The current status of one Product, or `undefined` if there is no such row.
 * Both transitions read this before they write, because the rule they ask is a
 * pure function of already-fetched data (`docs/MODULES.md`).
 *
 * Read-then-write, not one conditional `UPDATE`. Two Admins racing on the same
 * Product is not a failure worth writing code about: both acts are reversible
 * from the row that fired them, which is the same property that spends no
 * confirmation dialog on them (`docs/DATA-FLOW.md`).
 */
async function readStatus(id: string): Promise<ProductStatus | undefined> {
  const [row] = await db
    .select({ status: product.status })
    .from(product)
    .where(eq(product.id, id));

  return row?.status;
}

/**
 * No message: the global map already says "this item no longer exists, refresh
 * the page", and anything written here would win over it (ADR-0013) without
 * saying more.
 */
const notFound = () => new TRPCError({ code: "NOT_FOUND" });

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

  /**
   * Puts a Product on sale: `draft | archived → active`.
   *
   * A domain verb rather than a `status` field on the form — a form edits what
   * a Product *is*, a transition is what it *does*, and this one fires from a
   * list row where no form exists (`docs/MODULES.md`, "Naming").
   *
   * It orchestrates and decides nothing: `isPublishable` is the rule, and it
   * lives at the module root where `bun test` reaches it without a database.
   * The refusal is a `CONFLICT` carrying its own pt-BR sentence — ADR-0013's
   * module tier, written beside the condition that raises it, winning over the
   * global code map. It names no field, so the global net toasts it rather
   * than standing down for a form that is not there.
   */
  publish: adminProcedure
    .input(transitionInput)
    .mutation(async ({ input }) => {
      const status = await readStatus(input.id);
      if (!status) throw notFound();

      if (!isPublishable(status)) {
        throw new TRPCError({
          code: "CONFLICT",
          // `active` is the only status `isPublishable` refuses, so the
          // sentence can name it instead of describing the rule.
          message: "Este produto já está à venda.",
        });
      }

      await db
        .update(product)
        .set({ status: "active" })
        .where(eq(product.id, input.id));

      return { id: input.id };
    }),

  /**
   * Withdraws a Product from sale: `draft | active → archived`. A Product is
   * never deleted (`CONTEXT.md`) — Orders still refer to it — and archiving is
   * undone by `publish`, which is why neither act asks for confirmation.
   *
   * Written out rather than shared with `publish` above. The two differ by a
   * rule and a status, and a factory taking both as parameters would move the
   * refusal copy away from the throw that raises it — the proximity ADR-0013
   * is for — and would read, in the module the other eight copy, as though
   * every status transition needs one built first.
   */
  archive: adminProcedure
    .input(transitionInput)
    .mutation(async ({ input }) => {
      const status = await readStatus(input.id);
      if (!status) throw notFound();

      if (!isArchivable(status)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este produto já está arquivado.",
        });
      }

      await db
        .update(product)
        .set({ status: "archived" })
        .where(eq(product.id, input.id));

      return { id: input.id };
    }),
});
