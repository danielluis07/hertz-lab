import { z } from "zod";
import { WISHLIST_PARAMS } from "@/modules/wishlist/constants";

/**
 * The Wishlist's lenient list input. It parses a hand-edited URL and validates
 * the procedure input with the same idempotent schema (ADR-0014).
 */
export const wishlistListParamsSchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
});

export type WishlistListInput = z.infer<typeof wishlistListParamsSchema>;

/**
 * Translate the Portuguese public parameter into the English procedure input.
 * Only the declared public spelling is read, so `?page=` cannot become a
 * second URL for the same Wishlist view.
 */
export function parseWishlistListParams(
  searchParams: Record<string, string | string[] | undefined>,
): WishlistListInput {
  return wishlistListParamsSchema.parse({
    page: searchParams[WISHLIST_PARAMS.page],
  });
}

/** The Variant addressed by membership reads and explicit writes. */
export const wishlistVariantSchema = z.object({
  variantId: z.string().min(1),
});
