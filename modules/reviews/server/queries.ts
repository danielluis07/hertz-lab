import "server-only";

import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { db, Transaction } from "@/db";
import { order, orderItem, productVariant, review } from "@/db/schema";

type QueryExecutor = Transaction | typeof db;
type ReviewIdentity = { userId: string; productId: string };

/** The persisted moderation state for one User/Product Review, if it exists. */
export async function findReviewStatus(
  executor: QueryExecutor,
  { userId, productId }: ReviewIdentity,
) {
  const [existing] = await executor
    .select({ status: review.status })
    .from(review)
    .where(and(eq(review.userId, userId), eq(review.productId, productId)))
    .limit(1);

  return existing?.status;
}

/** The newest delivered Order that proves this User purchased this Product. */
export async function findQualifyingOrder(
  executor: QueryExecutor,
  {
    userId,
    productId,
    lock = false,
  }: ReviewIdentity & { lock?: boolean },
) {
  const query = executor
    .select({ id: order.id })
    .from(order)
    .innerJoin(orderItem, eq(orderItem.orderId, order.id))
    .innerJoin(productVariant, eq(productVariant.id, orderItem.variantId))
    .where(
      and(
        eq(order.userId, userId),
        eq(order.status, "delivered"),
        isNotNull(order.deliveredAt),
        eq(productVariant.productId, productId),
      ),
    )
    .orderBy(desc(order.deliveredAt), desc(order.id))
    .limit(1);

  const [qualifyingOrder] = lock
    ? await query.for("share", { of: order })
    : await query;

  return qualifyingOrder;
}
