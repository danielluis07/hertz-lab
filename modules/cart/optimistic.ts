import { isProductOnSale, stockAvailability } from "@/modules/cart/availability";
import { lineTotal, withTotals } from "@/modules/cart/totals";
import type { Cart } from "@/modules/cart/types";

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

  return withTotals(
    cart.items.map((line) =>
      line.variantId === variantId
        ? {
            ...line,
            quantity,
            lineTotalAmount: lineTotal({ ...line, quantity }),
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
  return withTotals(cart.items.filter((line) => line.variantId !== variantId));
}

/**
 * One line as `snapshot` held it, where `snapshot` held it, and every
 * **other** line as `current` has it.
 *
 * It is how a failed write rolls back: restoring the whole snapshot would
 * also undo a change to another line made after the snapshot was taken and
 * still waiting on the server, which then flickers back when that write
 * settles. Only the line this write touched is the failed write's to undo.
 *
 * It is also how a write queued behind a failed one for the same line is
 * re-based: that write's snapshot was the failed write's optimistic value,
 * which the server never held.
 */
export function restoreLine(
  current: Cart,
  snapshot: Cart,
  variantId: string,
): Cart {
  const index = snapshot.items.findIndex((line) => line.variantId === variantId);
  const restored = snapshot.items[index];
  const others = current.items.filter((line) => line.variantId !== variantId);

  if (!restored) return withTotals(others);

  // After the nearest line that preceded it in the snapshot and is still here;
  // first when none is.
  const before = new Set(
    snapshot.items.slice(0, index).map((line) => line.variantId),
  );
  const anchor = others.findLastIndex((line) => before.has(line.variantId));

  return withTotals([
    ...others.slice(0, anchor + 1),
    restored,
    ...others.slice(anchor + 1),
  ]);
}

/**
 * A Cart write still waiting on the server. `snapshot` is the Cart it painted
 * over; a write that paints nothing — an add — has none.
 */
export type QueuedWrite = {
  variantId: string | undefined;
  snapshot: Cart | undefined;
};

/**
 * Roll back one failed optimistic write, given the Cart writes queued behind
 * it in the order they were fired.
 *
 * Every write snapshots the cache its predecessor painted, so only the
 * **next** write to the same line took its snapshot from the failed write's
 * value, which the server never held. That one snapshot is re-based and
 * returned for the caller to store; the cache keeps showing the queued write,
 * which is the shopper's latest intent. Writes further along snapshotted their
 * own predecessors, whose outcome is not yet known, and are left alone. With
 * nothing queued on the line, the line goes back as the failed write's
 * snapshot held it.
 *
 * `rebased.index` is the re-based write's position in `queuedAfter`.
 */
export function rollBackWrite(
  current: Cart,
  failed: { variantId: string; snapshot: Cart },
  queuedAfter: readonly QueuedWrite[],
): { cart: Cart; rebased?: { index: number; snapshot: Cart } } {
  const index = queuedAfter.findIndex(
    (write) => write.snapshot && write.variantId === failed.variantId,
  );
  const next = queuedAfter[index]?.snapshot;

  if (!next) {
    return { cart: restoreLine(current, failed.snapshot, failed.variantId) };
  }

  return {
    cart: current,
    rebased: {
      index,
      snapshot: restoreLine(next, failed.snapshot, failed.variantId),
    },
  };
}
