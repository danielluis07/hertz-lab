import "server-only";

import { and, eq } from "drizzle-orm";
import type { Transaction } from "@/db";
import { cart, cartItem, product, productVariant } from "@/db/schema";

/**
 * The reads more than one Cart write shares (ADR-0010).
 *
 * **Every Cart write locks the Cart row first** — `add` through the upsert
 * that also creates it, `setQuantity` and `remove` through `lockCart`. A Cart
 * is one per User, so the lock serialises one shopper against themselves: two
 * adds of the same Variant cannot both read the old quantity and lose an
 * increment, nor can both pass the stock ceiling with half each. It is also
 * the lock checkout takes first (ADR-0039, step 1), so a Cart write and a
 * checkout never interleave either. Stock itself is read but not locked: a
 * Cart is not a reservation, and checkout re-reads it under its own lock.
 */

/** The locked Cart id, or `undefined` for a User who has never added. */
export async function lockCart(
  tx: Transaction,
  userId: string,
): Promise<string | undefined> {
  const [owned] = await tx
    .select({ id: cart.id })
    .from(cart)
    .where(eq(cart.userId, userId))
    .limit(1)
    .for("update");

  return owned?.id;
}

/**
 * What a write needs to judge one Variant in this Cart: its stock, its
 * Product's status, and the quantity the Cart already holds (`null` for no
 * line). `undefined` when the Variant no longer exists.
 */
export async function findLineFacts(
  tx: Transaction,
  { cartId, variantId }: { cartId: string; variantId: string },
) {
  const [facts] = await tx
    .select({
      stockQuantity: productVariant.stockQuantity,
      productStatus: product.status,
      lineQuantity: cartItem.quantity,
    })
    .from(productVariant)
    .innerJoin(product, eq(product.id, productVariant.productId))
    .leftJoin(
      cartItem,
      and(
        eq(cartItem.variantId, productVariant.id),
        eq(cartItem.cartId, cartId),
      ),
    )
    .where(eq(productVariant.id, variantId))
    .limit(1);

  return facts;
}
