import "server-only";

import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { db, Transaction } from "@/db";
import { product, productImage, productVariant } from "@/db/schema";

/**
 * Turn Variant ids into renderable lines (ADR-0030): for each Variant, its
 * name, current price and stock, its Product's name, slug and status, and the
 * picture that stands for it.
 *
 * The rule this file exists to hold is that picture. A line is one Variant, so
 * it is the Variant's first Image in the Admin's order, falling back to the
 * Product-level Images — never a sibling Variant's, which would show the
 * shopper a colour they did not choose. That is the Gallery's rule
 * (`docs/STOREFRONT.md`) seen through a single frame, and it is a query rather
 * than a pure function, which is why `cart`, `wishlist` and `checkout` call
 * this instead of each writing their own.
 *
 * **No visibility clause.** A Cart keeps a line whose Product was archived so
 * the shopper can see why it cannot be bought; `productStatus` is returned for
 * the caller to judge. Both Cover fields are nullable for the same reason: the
 * inner join the shop card relies on (ADR-0045) holds only for an active
 * Product, and an archived one may have lost its photographs.
 *
 * Rows come back in no particular order and only for ids that still exist —
 * a deleted Variant has taken its `cart_item` with it — so callers index by
 * `variantId`. Takes the caller's transaction, when it has one, so `checkout`
 * can read the lines it snapshots inside the transaction that places the
 * Order (ADR-0039).
 */
export async function variantLines(
  tx: Transaction | typeof db,
  variantIds: readonly string[],
) {
  if (variantIds.length === 0) return [];

  const cover = tx
    .select({ s3Key: productImage.s3Key, altText: productImage.altText })
    .from(productImage)
    .where(
      and(
        eq(productImage.productId, productVariant.productId),
        or(
          eq(productImage.variantId, productVariant.id),
          isNull(productImage.variantId),
        ),
      ),
    )
    // The Variant's own Images first (`is null` is false for them), then the
    // Admin's order, then the id so the choice is total.
    .orderBy(
      sql`${productImage.variantId} is null`,
      asc(productImage.position),
      asc(productImage.id),
    )
    .limit(1)
    .as("cover");

  return tx
    .select({
      variantId: productVariant.id,
      variantName: productVariant.name,
      /** BRL cents: what the Variant costs now. */
      priceAmount: productVariant.priceAmount,
      stockQuantity: productVariant.stockQuantity,
      productName: product.name,
      productSlug: product.slug,
      productStatus: product.status,
      coverS3Key: cover.s3Key,
      coverAltText: cover.altText,
    })
    .from(productVariant)
    .innerJoin(product, eq(product.id, productVariant.productId))
    .leftJoinLateral(cover, sql`true`)
    .where(inArray(productVariant.id, [...variantIds]));
}
