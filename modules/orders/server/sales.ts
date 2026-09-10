import "server-only";

import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { order, orderItem } from "@/db/schema";
import { BEST_SELLER_ORDER_STATUSES } from "@/modules/orders/status";

/**
 * Units sold per Variant, as an **unexecuted** relation (ADR-0047):
 * `{ variantId, unitsSold }`, one row per Variant that has sold at all.
 *
 * The one analytical read that crosses a boundary against the foreign key.
 * `products/server/shop.ts` joins it to Variants, folds it into one total per
 * Product and applies every catalogue predicate before its `LIMIT` — executing
 * this half first would need either an unbounded transfer of every Variant's
 * total or a top-Variant cut that mis-ranks a Product whose sales are spread
 * across Variants. So this never runs on its own, and nothing but Variant
 * identity and the measure leaves the module: no Order column, no status, no
 * quantity.
 *
 * It reads the Order's **current** status, never its history, through the
 * tuple `status.ts` owns. It reads neither `product_variant` nor `product`.
 *
 * `unitsSold` is PostgreSQL's `sum(integer)`, a `bigint`, and stays one inside
 * the query: a lifetime total is not squeezed back into 32 bits for a driver's
 * convenience. It is typed as the `string` the driver would decode a `bigint`
 * to — which is moot, because the consumer only orders by it.
 */
export function soldUnitsByVariant() {
  return db
    .select({
      variantId: orderItem.variantId,
      unitsSold: sql<string>`sum(${orderItem.quantity})`.as("units_sold"),
    })
    .from(orderItem)
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .where(inArray(order.status, [...BEST_SELLER_ORDER_STATUSES]))
    .groupBy(orderItem.variantId)
    .as("sold_units_by_variant");
}
