import { describe, expect, test } from "bun:test";
import {
  isProductOnSale,
  lineAvailability,
} from "@/modules/cart/availability";

/**
 * Whether a Cart line can be bought right now, from current Catalog facts
 * only. The Cart stores the shopper's intent — a Variant and a quantity — and
 * never rewrites it when the Catalog changes, so every state below is derived.
 */
describe("lineAvailability", () => {
  test("is available when the Product is on sale and stock covers the quantity", () => {
    expect(
      lineAvailability({ productStatus: "active", stockQuantity: 5, quantity: 2 }),
    ).toBe("available");
  });

  test("is available when the quantity takes exactly the last units", () => {
    expect(
      lineAvailability({ productStatus: "active", stockQuantity: 2, quantity: 2 }),
    ).toBe("available");
  });

  test("is product_unavailable once the Product is archived, whatever the stock", () => {
    expect(
      lineAvailability({ productStatus: "archived", stockQuantity: 5, quantity: 1 }),
    ).toBe("product_unavailable");
    expect(
      lineAvailability({ productStatus: "archived", stockQuantity: 0, quantity: 1 }),
    ).toBe("product_unavailable");
  });

  test("is product_unavailable for a Product back in draft", () => {
    expect(
      lineAvailability({ productStatus: "draft", stockQuantity: 5, quantity: 1 }),
    ).toBe("product_unavailable");
  });

  test("is out_of_stock when the Variant has no units left", () => {
    expect(
      lineAvailability({ productStatus: "active", stockQuantity: 0, quantity: 1 }),
    ).toBe("out_of_stock");
  });

  test("is insufficient_stock when stock fell below a quantity the line kept", () => {
    expect(
      lineAvailability({ productStatus: "active", stockQuantity: 2, quantity: 5 }),
    ).toBe("insufficient_stock");
  });
});

/**
 * A line's Product name links to its route only while the Product is on sale:
 * an archived Product's page is a deliberate 404. Stock does not enter into
 * it — an active, sold-out Product's page stays up.
 */
describe("isProductOnSale", () => {
  test("is true for every state an active Product can be in", () => {
    expect(isProductOnSale("available")).toBe(true);
    expect(isProductOnSale("out_of_stock")).toBe(true);
    expect(isProductOnSale("insufficient_stock")).toBe(true);
  });

  test("is false once the Product left sale", () => {
    expect(isProductOnSale("product_unavailable")).toBe(false);
  });
});
