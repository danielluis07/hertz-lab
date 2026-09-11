import { describe, expect, test } from "bun:test";
import {
  restoreLine,
  rollBackWrite,
  withoutLine,
  withQuantity,
} from "@/modules/cart/optimistic";
import { toCart, type CartLineFacts } from "@/modules/cart/totals";
import type { Cart } from "@/modules/cart/types";

const facts = (
  variantId: string,
  overrides: Partial<CartLineFacts> = {},
): CartLineFacts => ({
  variantId,
  variantName: `Variação ${variantId}`,
  productName: "Caixa de som",
  productSlug: "caixa-de-som",
  productStatus: "active",
  coverS3Key: null,
  coverAltText: null,
  unitPriceAmount: 10_000,
  stockQuantity: 5,
  quantity: 1,
  ...overrides,
});

/** a: R$ 100 × 2, b: R$ 50 × 1, c: archived × 3 — subtotal R$ 250, 6 units. */
const cart = () =>
  toCart([
    facts("a", { quantity: 2 }),
    facts("b", { unitPriceAmount: 5_000 }),
    facts("c", { productStatus: "archived", quantity: 3 }),
  ]);

describe("withQuantity", () => {
  test("reprices the line and recomputes the totals", () => {
    const next = withQuantity(cart(), "a", 4);

    expect(next.items[0]?.quantity).toBe(4);
    expect(next.items[0]?.lineTotalAmount).toBe(40_000);
    expect(next.subtotalAmount).toBe(45_000);
    expect(next.totalQuantity).toBe(8);
  });

  test("never moves the line", () => {
    const next = withQuantity(cart(), "b", 3);

    expect(next.items.map((line) => line.variantId)).toEqual(["a", "b", "c"]);
  });

  test("judges the new quantity against the stock the line was read with", () => {
    const over = withQuantity(cart(), "a", 6);
    expect(over.items[0]?.availability).toBe("insufficient_stock");
    expect(over.subtotalAmount).toBe(5_000);

    const shortened = toCart([facts("a", { stockQuantity: 2, quantity: 5 })]);
    const corrected = withQuantity(shortened, "a", 2);
    expect(corrected.items[0]?.availability).toBe("available");
    expect(corrected.subtotalAmount).toBe(20_000);
    expect(corrected.canCheckout).toBe(true);
  });

  test("leaves a line whose Product left sale unavailable", () => {
    const next = withQuantity(cart(), "c", 1);

    expect(next.items[2]?.availability).toBe("product_unavailable");
    expect(next.items[2]?.quantity).toBe(1);
    expect(next.subtotalAmount).toBe(25_000);
  });

  test("changes nothing for a Variant the Cart does not hold", () => {
    expect(withQuantity(cart(), "missing", 2)).toEqual(cart());
  });

  test("leaves the snapshot it was given untouched", () => {
    const snapshot = cart();
    withQuantity(snapshot, "a", 4);

    expect(snapshot).toEqual(cart());
  });
});

describe("withoutLine", () => {
  test("removes the line and recomputes the totals", () => {
    const next = withoutLine(cart(), "a");

    expect(next.items.map((line) => line.variantId)).toEqual(["b", "c"]);
    expect(next.subtotalAmount).toBe(5_000);
    expect(next.totalQuantity).toBe(4);
  });

  test("removing the only unavailable line lets the Cart check out", () => {
    const next = withoutLine(cart(), "c");

    expect(next.canCheckout).toBe(true);
    expect(next.totalQuantity).toBe(3);
  });

  test("removing the last line leaves an empty Cart that cannot check out", () => {
    const single = toCart([facts("a")]);

    expect(withoutLine(single, "a")).toEqual(toCart([]));
  });

  test("leaves the snapshot it was given untouched", () => {
    const snapshot = cart();
    withoutLine(snapshot, "a");

    expect(snapshot).toEqual(cart());
  });
});

describe("restoreLine", () => {
  test("rolls a failed quantity change back to the snapshot", () => {
    const snapshot = cart();
    const optimistic = withQuantity(snapshot, "a", 4);

    expect(restoreLine(optimistic, snapshot, "a")).toEqual(snapshot);
  });

  test("puts a line whose removal failed back where it was", () => {
    const snapshot = cart();
    const optimistic = withoutLine(snapshot, "b");

    expect(restoreLine(optimistic, snapshot, "b")).toEqual(snapshot);
  });

  test("puts a failed removal of the first line back first", () => {
    const snapshot = cart();

    expect(restoreLine(withoutLine(snapshot, "a"), snapshot, "a")).toEqual(
      snapshot,
    );
  });

  test("keeps another line's change that is still in flight", () => {
    const snapshot = cart();
    // b's change is applied after a's snapshot was taken; a's write fails.
    const optimistic = withQuantity(withQuantity(snapshot, "a", 4), "b", 3);

    const rolledBack = restoreLine(optimistic, snapshot, "a");

    expect(rolledBack.items.map((line) => line.quantity)).toEqual([2, 3, 3]);
    expect(rolledBack.subtotalAmount).toBe(35_000);
    expect(rolledBack.totalQuantity).toBe(8);
  });

  test("drops a line the snapshot never held", () => {
    const snapshot = toCart([facts("a")]);
    const current = toCart([facts("a"), facts("b")]);

    expect(restoreLine(current, snapshot, "b")).toEqual(snapshot);
  });
});

/**
 * A queue of writes to line `a` (stock 5, quantity 2), each fired against the
 * cache the one before it painted — the way the hooks fire them. Returns the
 * cache as painted and the queue, each write holding the snapshot it took.
 */
function fire(quantities: number[]) {
  let shown = cart();
  const queue = quantities.map((quantity) => {
    const write = { variantId: "a", snapshot: shown };
    shown = withQuantity(shown, "a", quantity);
    return write;
  });
  return { shown, queue };
}

/** Line `a`'s quantity in a Cart. */
const quantityOfA = (value: Cart) =>
  value.items.find((line) => line.variantId === "a")?.quantity;

describe("rollBackWrite", () => {
  test("puts the line back when nothing is queued behind the write", () => {
    const { shown, queue } = fire([6]);

    const { cart: after, rebased } = rollBackWrite(shown, queue[0]!, []);

    expect(after).toEqual(cart());
    expect(rebased).toBeUndefined();
  });

  test("leaves the cache on a queued write to the same line and re-bases it", () => {
    const { shown, queue } = fire([6, 7]);

    const { cart: after, rebased } = rollBackWrite(shown, queue[0]!, queue.slice(1));

    // The shopper's latest intent stays on screen.
    expect(after).toBe(shown);
    // The queued write took the refused 6 as its snapshot; it now holds 2.
    expect(rebased?.index).toBe(0);
    expect(quantityOfA(rebased!.snapshot)).toBe(2);
  });

  test("ignores a queued write to another line", () => {
    const { shown, queue } = fire([6]);
    const other = { variantId: "b", snapshot: shown };

    const { cart: after, rebased } = rollBackWrite(shown, queue[0]!, [other]);

    expect(quantityOfA(after)).toBe(2);
    expect(rebased).toBeUndefined();
  });

  test("skips a queued write that painted nothing, such as an add", () => {
    const { shown, queue } = fire([6, 7]);
    const add = { variantId: "a", snapshot: undefined };

    const { rebased } = rollBackWrite(shown, queue[0]!, [add, queue[1]!]);

    expect(rebased?.index).toBe(1);
  });

  test("two refused changes land on the quantity before the first", () => {
    const { shown, queue } = fire([6, 7]);
    const [first, second] = queue;

    const afterFirst = rollBackWrite(shown, first!, [second!]);
    second!.snapshot = afterFirst.rebased!.snapshot;
    const afterSecond = rollBackWrite(afterFirst.cart, second!, []);

    expect(afterSecond.cart).toEqual(cart());
  });

  /**
   * 6 is refused, 4 is accepted, 7 is refused. Only 4 took its snapshot from
   * the refused 6; 7 took its from 4, which the server now holds — so 7's
   * rollback must land on 4, not on the 2 before the whole run.
   */
  test("re-bases only the next write to the line, not every one after it", () => {
    const { shown, queue } = fire([6, 4, 7]);
    const [six, four, seven] = queue;

    const afterSix = rollBackWrite(shown, six!, [four!, seven!]);
    expect(afterSix.rebased?.index).toBe(0);
    four!.snapshot = afterSix.rebased!.snapshot;

    // 4 succeeds: it settles out of the queue and touches nothing.
    const afterSeven = rollBackWrite(afterSix.cart, seven!, []);

    expect(quantityOfA(afterSeven.cart)).toBe(4);
  });
});
