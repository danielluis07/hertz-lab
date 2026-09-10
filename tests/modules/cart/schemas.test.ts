import { describe, expect, test } from "bun:test";
import {
  addToCartSchema,
  removeCartItemSchema,
  setCartQuantitySchema,
} from "@/modules/cart/schemas";

/**
 * A quantity is a positive whole number of units. Zero is not a quantity and
 * never an alias for removal: `cart.remove` is its own write.
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

  test("refuses a quantity sent as text", () => {
    expect(schema.safeParse({ variantId: "v1", quantity: "2" }).success).toBe(false);
  });

  test("refuses a missing Variant", () => {
    expect(schema.safeParse({ variantId: "", quantity: 1 }).success).toBe(false);
    expect(schema.safeParse({ quantity: 1 }).success).toBe(false);
  });
});

describe("removeCartItemSchema", () => {
  test("takes a Variant and nothing else", () => {
    expect(removeCartItemSchema.parse({ variantId: "v1", quantity: 0 })).toEqual({
      variantId: "v1",
    });
  });

  test("refuses a missing Variant", () => {
    expect(removeCartItemSchema.safeParse({ variantId: "" }).success).toBe(false);
  });
});
