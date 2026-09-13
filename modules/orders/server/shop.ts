import "server-only";

import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { order, orderItem } from "@/db/schema";
import { ORDERS_PER_PAGE } from "@/modules/orders/shop/constants";
import { orderListParamsSchema } from "@/modules/orders/shop/schemas";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

/**
 * Number of snapshotted Order Items, without reading current Product or
 * Variant data. PostgreSQL returns `count(*)` as bigint, so cast it before it
 * crosses the procedure boundary.
 */
const itemCount = sql<number>`(${db
  .select({ value: count() })
  .from(orderItem)
  .where(eq(orderItem.orderId, order.id))})::int`;

/** Shopper-facing Order reads, scoped exclusively by the authenticated User. */
export const shopRouter = createTRPCRouter({
  /**
   * One page of immutable Order history. The stable id tie-break keeps equal
   * creation timestamps from moving between pages, and an out-of-range page
   * naturally returns an empty `items` array rather than clamping or 404ing.
   */
  list: protectedProcedure
    .input(orderListParamsSchema)
    .query(async ({ ctx, input }) => {
      const owner = eq(order.userId, ctx.auth.user.id);

      const page = db
        .select({
          id: order.id,
          number: order.number,
          createdAt: order.createdAt,
          status: order.status,
          itemCount,
          totalAmount: sql<number>`${order.totalAmount}`,
        })
        .from(order)
        .where(owner)
        .orderBy(desc(order.createdAt), desc(order.id))
        .limit(ORDERS_PER_PAGE)
        .offset((input.page - 1) * ORDERS_PER_PAGE);

      const total = db
        .select({ value: count() })
        .from(order)
        .where(owner);

      const [items, [totalRow]] = await Promise.all([page, total]);

      return { items, total: totalRow?.value ?? 0 };
    }),
});
