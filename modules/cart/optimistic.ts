import { isProductOnSale, stockAvailability } from "@/modules/cart/availability";
import { cartTotals } from "@/modules/cart/totals";
import type { Cart, CartLine } from "@/modules/cart/types";

/**
 * What the Cart's optimistic writes do to the cached `cart.get` value, as pure
 * functions of it. The hooks only move values in and out of the cache; the
 * Cart rules — a line total, availability, the three totals — are the same
 * ones `toCart` applied on the server, recomputed here against the stock and
 * price the cache was read with. The server's answer replaces all of it when
 * the write settles.
 *
 * None of them mutates its input: the value a hook snapshots before a write
 * must still be the pre-write Cart when it is needed for a rollback.
 */

function withItems(items: CartLine[]): Cart {
  return { items, ...cartTotals(items) };
}

/**
 * The Cart with one line set to an absolute quantity, in place — a quantity
 * change never reorders lines. A line whose Product left sale stays
 * unavailable; any other is re-judged against its stock.
 */
export function withQuantity(
  cart: Cart,
  variantId: string,
  quantity: number,
): Cart {
  if (!cart.items.some((line) => line.variantId === variantId)) return cart;

  return withItems(
    cart.items.map((line) =>
      line.variantId === variantId
        ? {
            ...line,
            quantity,
            lineTotalAmount: line.unitPriceAmount * quantity,
            availability: isProductOnSale(line.availability)
              ? stockAvailability(line.stockQuantity, quantity)
              : line.availability,
          }
        : line,
    ),
  );
}

/** The Cart without one line. */
export function withoutLine(cart: Cart, variantId: string): Cart {
  return withItems(cart.items.filter((line) => line.variantId !== variantId));
}

/**
 * Roll one failed write back: the line as the snapshot held it, where the
 * snapshot held it, and every **other** line as it is now.
 *
 * Restoring the whole snapshot would also undo a change to another line made
 * after the snapshot was taken and still waiting on the server — which then
 * flickers back when that write settles. Only the line this write touched is
 * the failed write's to undo.
 */
export function restoreLine(
  current: Cart,
  snapshot: Cart,
  variantId: string,
): Cart {
  const index = snapshot.items.findIndex((line) => line.variantId === variantId);
  const restored = snapshot.items[index];
  const others = current.items.filter((line) => line.variantId !== variantId);

  if (!restored) return withItems(others);

  // After the nearest line that preceded it in the snapshot and is still here;
  // first when none is.
  const before = new Set(
    snapshot.items.slice(0, index).map((line) => line.variantId),
  );
  const anchor = others.findLastIndex((line) => before.has(line.variantId));

  return withItems([
    ...others.slice(0, anchor + 1),
    restored,
    ...others.slice(anchor + 1),
  ]);
}
