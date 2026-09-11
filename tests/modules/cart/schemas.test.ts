import { describe, expect, test } from "bun:test";
import {
  addToCartSchema,
  setCartQuantitySchema,
} from "@/modules/cart/schemas";

/**
 * A quantity is a positive whole number of units. Zero is not a quantity and
 * never an alias for removal: `cart.remove` is its own write. Only that clause
 * is a rule; the rest of each schema describes a shape (ADR-0017).
 */
describe.each([
  ["addToCartSchema", addToCartSchema],
  ["setCartQuantitySchema", setCartQuantitySchema],
])("%s", (_name, schema) => {
  test("accepts a positive whole quantity", () => {
    expect(schema.safeParse({ variantId: "v1", quantity: 1 }).success).toBe(true);
    expect(schema.safeParse({ variantId: "v1", quantity: 12 }).success).toBe(true);
  });

  test("refuses zero rather than reading it as a removal", () => {
    expect(schema.safeParse({ variantId: "v1", quantity: 0 }).success).toBe(false);
  });

  test("refuses a negative quantity", () => {
    expect(schema.safeParse({ variantId: "v1", quantity: -1 }).success).toBe(false);
  });

  test("refuses a fraction of a unit", () => {
    expect(schema.safeParse({ variantId: "v1", quantity: 1.5 }).success).toBe(false);
  });
});
