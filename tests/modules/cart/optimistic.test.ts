import { describe, expect, test } from "bun:test";
import {
  restoreLine,
  withoutLine,
  withQuantity,
} from "@/modules/cart/optimistic";
import { toCart, type CartLineFacts } from "@/modules/cart/totals";

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

describe("two queued changes to one line, both refused", () => {
  /**
   * Stock 5, quantity 2: the shopper sets 6, then 7. The second write
   * snapshotted the first's optimistic 6, which the server never held, so the
   * first failure re-bases it on the first's own snapshot — and the second
   * failure then lands on the quantity the server still has.
   */
  test("roll back to the quantity before the first", () => {
    const confirmed = cart();
    // What the queued second write snapshotted: the first's optimistic value.
    const secondSnapshot = withQuantity(confirmed, "a", 6);
    const shown = withQuantity(secondSnapshot, "a", 7);

    // The first write fails and re-bases the second rather than the cache.
    const rebased = restoreLine(secondSnapshot, confirmed, "a");

    // The second fails and rolls back from its re-based snapshot.
    expect(restoreLine(shown, rebased, "a")).toEqual(confirmed);
  });
});
