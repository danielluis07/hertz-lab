import { imageKeyMatcher } from "@/lib/utils/image";

/**
 * A Category picture's place in the bucket, and the guard that keeps it there.
 * The shape of any image key is `lib/utils/image.ts`'s (ADR-0021); what this
 * module owns is the one prefix it mints under, bound once so the mint and the
 * guard cannot drift into two different answers.
 *
 * The twin of `modules/products/images.ts`, and deliberately a copy of it
 * rather than a shared import: `product.category_id` points this way, so
 * categories may never import products (ADR-0009).
 */
export const CATEGORY_IMAGE_PREFIX = "categories";

/**
 * Recognises a key `createImageUpload` minted for a Category. A `products/`
 * key is a well-formed image key and is not one of these, which is the whole
 * reason the prefix is bound per module.
 */
export const isCategoryImageKey = imageKeyMatcher(CATEGORY_IMAGE_PREFIX);
