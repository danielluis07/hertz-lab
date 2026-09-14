import type { ProductStatus } from "@/modules/products/constants";
import { isOnSale } from "@/modules/products/status";

/** The current purchase state of a saved Variant. */
export type WishlistAvailability =
  | "available"
  | "out_of_stock"
  | "product_unavailable";

/**
 * Map current Catalog facts to the state a Wishlist row renders.
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

/**
 * Whether the saved Product still has a route to link to. An archived or
 * draft Product's route is a 404, so its entry names it without sending the
 * shopper there; a sold-out Variant is still on a live page.
 */
export function isWishlistProductLinked(
  availability: WishlistAvailability,
): boolean {
  return availability !== "product_unavailable";
}

/** Whether the entry offers add-to-Cart: only while it can be bought now. */
export function canAddWishlistItemToCart(
  availability: WishlistAvailability,
): boolean {
  return availability === "available";
}

/**
 * Why an entry cannot be bought right now, in the sentence the row renders —
 * or `null` for an available entry. Worded as the Cart words the same facts
 * (`modules/cart/format.ts`), so one fact reads the same on both surfaces.
 */
export function wishlistUnavailableReason(
  availability: WishlistAvailability,
): string | null {
  switch (availability) {
    case "available":
      return null;
    case "out_of_stock":
      return "Esta variação está esgotada.";
    case "product_unavailable":
      return "Este produto não está mais à venda.";
  }
}
