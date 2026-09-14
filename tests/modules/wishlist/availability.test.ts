import { describe, expect, test } from "bun:test";
import {
  canAddWishlistItemToCart,
  isWishlistProductLinked,
  wishlistAvailability,
  wishlistUnavailableReason,
} from "@/modules/wishlist/availability";

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

describe("isWishlistProductLinked", () => {
  test("links an on-sale Product whether or not the Variant has stock", () => {
    expect(isWishlistProductLinked("available")).toBe(true);
    expect(isWishlistProductLinked("out_of_stock")).toBe(true);
  });

  test("does not link a Product that is no longer on sale", () => {
    expect(isWishlistProductLinked("product_unavailable")).toBe(false);
  });
});

describe("canAddWishlistItemToCart", () => {
  test("offers add-to-Cart only for an available entry", () => {
    expect(canAddWishlistItemToCart("available")).toBe(true);
    expect(canAddWishlistItemToCart("out_of_stock")).toBe(false);
    expect(canAddWishlistItemToCart("product_unavailable")).toBe(false);
  });
});

describe("wishlistUnavailableReason", () => {
  test("has no reason for an available entry", () => {
    expect(wishlistUnavailableReason("available")).toBeNull();
  });

  test("names sold-out and no-longer-on-sale entries differently", () => {
    expect(wishlistUnavailableReason("out_of_stock")).toBe(
      "Esta variação está esgotada.",
    );
    expect(wishlistUnavailableReason("product_unavailable")).toBe(
      "Este produto não está mais à venda.",
    );
  });
});
