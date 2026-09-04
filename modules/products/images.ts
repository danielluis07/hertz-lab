import { imageKeyMatcher } from "@/lib/utils/image";

/**
 * A Product photograph's place in the bucket, and the guard that keeps it
 * there. The shape of any image key is `lib/utils/image.ts`'s (ADR-0021); what
 * this module owns is the one prefix it mints under, bound once so the mint
 * and the guard cannot drift into two different answers.
 */
export const PRODUCT_IMAGE_PREFIX = "products";

/**
 * Recognises a key `createImageUpload` minted for a Product. A `categories/`
 * key is a well-formed image key and is not one of these, which is the whole
 * reason the prefix is bound per module.
 */
export const isProductImageKey = imageKeyMatcher(PRODUCT_IMAGE_PREFIX);
