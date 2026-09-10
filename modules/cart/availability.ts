import type { ProductStatus } from "@/modules/products/constants";
import { isOnSale } from "@/modules/products/status";

/**
 * Whether a Cart line can be bought right now. A Cart stores intent — a
 * Variant and a quantity — and never rewrites it when the Catalog changes, so
 * this is derived on every read from current facts and never stored.
 *
 * - `available` — the Product is on sale and stock covers the quantity;
 * - `product_unavailable` — the Product is not on sale (archived, or back in
 *   draft), whatever its stock;
 * - `out_of_stock` — the Variant has no units at all;
 * - `insufficient_stock` — some units, but fewer than the line asks for.
 *
 * A deleted Variant has no state here: `cart_item.variant_id` cascades, so
 * the line is gone before anything could read it.
 */
export const CART_LINE_AVAILABILITIES = [
  "available",
  "product_unavailable",
  "out_of_stock",
  "insufficient_stock",
] as const;

export type CartLineAvailability = (typeof CART_LINE_AVAILABILITIES)[number];

export function lineAvailability({
  productStatus,
  stockQuantity,
  quantity,
}: {
  productStatus: ProductStatus;
  stockQuantity: number;
  quantity: number;
}): CartLineAvailability {
  if (!isOnSale(productStatus)) return "product_unavailable";
  return stockAvailability(stockQuantity, quantity);
}

/**
 * The half of `lineAvailability` a quantity can change, for a line whose
 * Product has already been judged on sale. The optimistic transforms use it:
 * a line in the client cache carries its availability, not its Product's
 * status.
 */
export function stockAvailability(
  stockQuantity: number,
  quantity: number,
): Exclude<CartLineAvailability, "product_unavailable"> {
  if (stockQuantity <= 0) return "out_of_stock";
  if (stockQuantity < quantity) return "insufficient_stock";
  return "available";
}

/**
 * Whether the line's Product is still on sale — the one part of its status a
 * line keeps. It is also whether the Product name links: an archived
 * Product's route is a 404 (`docs/MODULES.md`), so its line names it without
 * sending the shopper there.
 */
export function isProductOnSale(availability: CartLineAvailability): boolean {
  return availability !== "product_unavailable";
}
