import type { orderStatusEnum } from "@/db/schema";

/**
 * Which Orders count as sales (ADR-0047). A type-only import: the enum is the
 * single declaration of the six statuses, and nothing from the database driver
 * reaches whatever imports this rule.
 */
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

/**
 * The statuses whose Items count toward a Product's sold units: payment has
 * cleared, and the Order has not been cancelled since.
 *
 * It is read against the Order's **current** status, never its history —
 * history would count one Order once per transition, and would keep a sale
 * that was later cancelled. `pending_payment` has not sold yet; `cancelled`
 * no longer has.
 *
 * The canonical tuple: `server/sales.ts` hands it to SQL, and a status
 * transition asks `countsTowardBestSellers` about both ends of itself.
 */
export const BEST_SELLER_ORDER_STATUSES = [
  "paid",
  "processing",
  "shipped",
  "delivered",
] as const satisfies readonly OrderStatus[];

const COUNTED: ReadonlySet<OrderStatus> = new Set(BEST_SELLER_ORDER_STATUSES);

/**
 * Whether an Order in this status contributes to the best-selling ranking.
 *
 * A transition whose two ends answer this differently changes the ranking, and
 * is the one that owes `revalidatePath("/")` after it commits (ADR-0047).
 */
export function countsTowardBestSellers(status: OrderStatus): boolean {
  return COUNTED.has(status);
}
