import type { WishlistListInput } from "@/modules/wishlist/schemas";

/**
 * Saved Variants per account page. The page size belongs to the Wishlist and
 * is never accepted from public input (ADR-0014).
 */
export const WISHLIST_PER_PAGE = 24;

/** The public URL spelling for the Wishlist list input (ADR-0005). */
export const WISHLIST_PARAMS = {
  page: "pagina",
} as const satisfies Record<keyof WishlistListInput, string>;
