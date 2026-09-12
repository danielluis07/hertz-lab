import { describe, expect, test } from "bun:test";
import { wishlistAvailability } from "@/modules/wishlist/availability";

describe("wishlistAvailability", () => {
  test("is available for an active Product with stock", () => {
    expect(
      wishlistAvailability({ productStatus: "active", stockQuantity: 1 }),
    ).toBe("available");
  });

  test("is out of stock for an active Product with no stock", () => {
    expect(
      wishlistAvailability({ productStatus: "active", stockQuantity: 0 }),
    ).toBe("out_of_stock");
  });

  test("is unavailable when the Product is not active", () => {
    expect(
      wishlistAvailability({ productStatus: "draft", stockQuantity: 4 }),
    ).toBe("product_unavailable");
    expect(
      wishlistAvailability({ productStatus: "archived", stockQuantity: 4 }),
    ).toBe("product_unavailable");
  });

  test("Product status takes precedence over stock", () => {
    expect(
      wishlistAvailability({ productStatus: "archived", stockQuantity: 0 }),
    ).toBe("product_unavailable");
  });
});
