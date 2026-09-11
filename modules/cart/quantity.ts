import { isProductOnSale } from "@/modules/cart/availability";
import type { CartLine } from "@/modules/cart/types";

/**
 * What a line's quantity control may send. Each value is an absolute quantity
 * `cart.setQuantity` would accept against the stock the Cart was read with,
 * or `null` where that control has nothing acceptable to send — so the
 * control is disabled rather than fired into a refusal.
 *
 * - `decrease` never reaches zero: zero is not a quantity (`schemas.ts`), and
 *   removal is its own control. On an under-stocked line it lands on the
 *   stock, the nearest quantity the server would accept — one unit down from
 *   an over-stock quantity would be refused just the same.
 * - `increase` never passes the stock.
 * - `correction` is the quantity that makes an under-stocked line buyable
 *   again, offered beside its reason.
 *
 * A line whose Product left sale, or whose Variant has no units, has no
 * quantity the server would accept: the shopper can only remove it.
 */
export type QuantitySteps = {
  decrease: number | null;
  increase: number | null;
  correction: number | null;
};

export function quantitySteps({
  availability,
  quantity,
  stockQuantity,
}: Pick<CartLine, "availability" | "quantity" | "stockQuantity">): QuantitySteps {
  if (!isProductOnSale(availability) || stockQuantity <= 0) {
    return { decrease: null, increase: null, correction: null };
  }

  return {
    decrease: quantity > 1 ? Math.min(quantity - 1, stockQuantity) : null,
    increase: quantity < stockQuantity ? quantity + 1 : null,
    correction: availability === "insufficient_stock" ? stockQuantity : null,
  };
}
