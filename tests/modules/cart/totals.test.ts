import { describe, expect, test } from "bun:test";
import { toCart, type CartLineFacts } from "@/modules/cart/totals";

const facts = (overrides: Partial<CartLineFacts> = {}): CartLineFacts => ({
  variantId: "variant-1",
  variantName: "Preto",
  productName: "Fone WH-1000XM5",
  productSlug: "fone-wh-1000xm5",
  productStatus: "active",
  coverS3Key: "products/cover.webp",
  coverAltText: "Fone preto de perfil",
  unitPriceAmount: 199_900,
  stockQuantity: 10,
  quantity: 1,
  ...overrides,
});

describe("toCart", () => {
  test("an empty Cart totals nothing and cannot check out", () => {
    expect(toCart([])).toEqual({
      items: [],
      subtotalAmount: 0,
      totalQuantity: 0,
      canCheckout: false,
    });
  });

  test("prices each line at its current unit price times its quantity", () => {
    const cart = toCart([facts({ unitPriceAmount: 4_990, quantity: 3 })]);

    expect(cart.items[0]?.lineTotalAmount).toBe(14_970);
    expect(cart.items[0]?.availability).toBe("available");
  });

  test("sums available lines into the subtotal and lets the Cart check out", () => {
    const cart = toCart([
      facts({ variantId: "a", unitPriceAmount: 10_000, quantity: 2 }),
      facts({ variantId: "b", unitPriceAmount: 2_500, quantity: 1 }),
    ]);

    expect(cart.subtotalAmount).toBe(22_500);
    expect(cart.totalQuantity).toBe(3);
    expect(cart.canCheckout).toBe(true);
  });

  test("excludes an unavailable line from the subtotal but still counts its quantity", () => {
    const cart = toCart([
      facts({ variantId: "a", unitPriceAmount: 10_000, quantity: 2 }),
      facts({
        variantId: "b",
        unitPriceAmount: 2_500,
        stockQuantity: 1,
        quantity: 4,
      }),
    ]);

    expect(cart.items[1]?.availability).toBe("insufficient_stock");
    // Still priced, so the line can show what it would cost once corrected.
    expect(cart.items[1]?.lineTotalAmount).toBe(10_000);
    expect(cart.subtotalAmount).toBe(20_000);
    // It is still in the Cart, so the header badge still counts it.
    expect(cart.totalQuantity).toBe(6);
  });

  test("one unavailable line blocks checkout until it is corrected or removed", () => {
    const cart = toCart([
      facts({ variantId: "a" }),
      facts({ variantId: "b", productStatus: "archived" }),
    ]);

    expect(cart.canCheckout).toBe(false);
  });

  test("a Cart whose every line is unavailable cannot check out and totals zero", () => {
    const cart = toCart([
      facts({ variantId: "a", stockQuantity: 0 }),
      facts({ variantId: "b", productStatus: "archived", quantity: 2 }),
    ]);

    expect(cart.items.map((line) => line.availability)).toEqual([
      "out_of_stock",
      "product_unavailable",
    ]);
    expect(cart.subtotalAmount).toBe(0);
    expect(cart.totalQuantity).toBe(3);
    expect(cart.canCheckout).toBe(false);
  });

  test("keeps the lines in the order it was given", () => {
    const cart = toCart([
      facts({ variantId: "c" }),
      facts({ variantId: "a" }),
      facts({ variantId: "b" }),
    ]);

    expect(cart.items.map((line) => line.variantId)).toEqual(["c", "a", "b"]);
  });
});
