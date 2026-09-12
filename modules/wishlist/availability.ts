import type { ProductStatus } from "@/modules/products/constants";
import { isOnSale } from "@/modules/products/status";

/** The current purchase state of a saved Variant. */
export type WishlistAvailability =
  | "available"
  | "out_of_stock"
  | "product_unavailable";

/**
 * Map current Catalog facts to the state a future Wishlist row will render.
 * Archived and draft Products stay visible but cannot link or be bought;
 * active sold-out Variants stay visible and linked but cannot be bought.
 */
export function wishlistAvailability({
  productStatus,
  stockQuantity,
}: {
  productStatus: ProductStatus;
  stockQuantity: number;
}): WishlistAvailability {
  if (!isOnSale(productStatus)) return "product_unavailable";
  if (stockQuantity <= 0) return "out_of_stock";
  return "available";
}
