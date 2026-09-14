import { describe, expect, test } from "bun:test";
import {
  galleryImages,
  initialPurchase,
  isBuyable,
  quantitySteps,
  selectedVariant,
  selectImage,
  selectVariant,
  setQuantity,
  variantPrice,
  type PurchaseState,
} from "@/modules/products/shop/purchase";

const soldOut = { id: "preto", stockQuantity: 0 };
const inStock = { id: "branco", stockQuantity: 3 };

describe("initialPurchase", () => {
  test("selects the first ordered Variant, its first photograph and one unit", () => {
    expect(initialPurchase([inStock, soldOut])).toEqual({
      variantId: "branco",
      imageIndex: 0,
      quantity: 1,
    });
  });

  test("selects the first Variant even when it is out of stock", () => {
    expect(initialPurchase([soldOut, inStock]).variantId).toBe("preto");
  });
});

describe("selectedVariant", () => {
  test("finds the Variant the state points at", () => {
    expect(selectedVariant([soldOut, inStock], { variantId: "branco" })).toBe(
      inStock,
    );
  });

  test("falls back to the first Variant for an id it does not hold", () => {
    expect(selectedVariant([soldOut, inStock], { variantId: "azul" })).toBe(
      soldOut,
    );
  });
});

describe("selectVariant", () => {
  const browsing: PurchaseState = {
    variantId: "branco",
    imageIndex: 2,
    quantity: 3,
  };

  test("resets the photograph and the quantity to their first values", () => {
    expect(selectVariant(browsing, "preto")).toEqual({
      variantId: "preto",
      imageIndex: 0,
      quantity: 1,
    });
  });

  test("re-selecting the current Variant changes nothing", () => {
    expect(selectVariant(browsing, "branco")).toBe(browsing);
  });
});

describe("selectImage", () => {
  const state = initialPurchase([inStock]);

  test("shows a photograph inside the Gallery", () => {
    expect(selectImage(state, 2, 3).imageIndex).toBe(2);
  });

  test("ignores an index outside the Gallery", () => {
    expect(selectImage(state, 3, 3)).toBe(state);
    expect(selectImage(state, -1, 3)).toBe(state);
  });
});

describe("setQuantity", () => {
  const state = initialPurchase([inStock]);

  test("sets a quantity within stock", () => {
    expect(setQuantity(state, 2, 3).quantity).toBe(2);
    expect(setQuantity(state, 3, 3).quantity).toBe(3);
  });

  test("never exceeds the selected stock", () => {
    expect(setQuantity(state, 9, 3).quantity).toBe(3);
  });

  test("never falls below one", () => {
    expect(setQuantity(state, 0, 3).quantity).toBe(1);
    expect(setQuantity(state, -4, 3).quantity).toBe(1);
  });

  test("leaves a zero-stock Variant's quantity alone", () => {
    const onSoldOut = initialPurchase([soldOut]);
    expect(setQuantity(onSoldOut, 2, 0)).toBe(onSoldOut);
  });
});

describe("quantitySteps", () => {
  test("offers both directions strictly inside the bounds", () => {
    expect(quantitySteps(2, 3)).toEqual({ decrease: 1, increase: 3 });
  });

  test("cannot go below one", () => {
    expect(quantitySteps(1, 3)).toEqual({ decrease: null, increase: 2 });
  });

  test("cannot go above stock", () => {
    expect(quantitySteps(3, 3)).toEqual({ decrease: 2, increase: null });
  });

  test("a single unit in stock offers neither direction", () => {
    expect(quantitySteps(1, 1)).toEqual({ decrease: null, increase: null });
  });

  test("offers nothing on a zero-stock Variant", () => {
    expect(quantitySteps(1, 0)).toEqual({ decrease: null, increase: null });
  });
});

describe("isBuyable", () => {
  test("only a Variant with stock goes into the Cart", () => {
    expect(isBuyable(inStock)).toBe(true);
    expect(isBuyable(soldOut)).toBe(false);
  });
});

describe("galleryImages", () => {
  const productShot = { id: "p1", variantId: null };
  const productShot2 = { id: "p2", variantId: null };
  const pretoShot = { id: "v1", variantId: "preto" };
  const pretoShot2 = { id: "v2", variantId: "preto" };
  const brancoShot = { id: "v3", variantId: "branco" };

  test("uses the selected Variant's own Images, in order, when it has any", () => {
    expect(
      galleryImages(
        [productShot, pretoShot, brancoShot, pretoShot2],
        "preto",
      ),
    ).toEqual([pretoShot, pretoShot2]);
  });

  test("falls back to the Product-level Images when the Variant has none", () => {
    expect(
      galleryImages([pretoShot, productShot, productShot2], "azul"),
    ).toEqual([productShot, productShot2]);
  });

  test("never borrows a sibling Variant's photograph", () => {
    expect(galleryImages([pretoShot, brancoShot], "azul")).toEqual([]);
  });

  test("is empty when nothing applies at all", () => {
    expect(galleryImages([], "preto")).toEqual([]);
  });
});

describe("variantPrice", () => {
  test("strikes through a compare-at above the price", () => {
    expect(
      variantPrice({ priceAmount: 89_900, compareAtPriceAmount: 99_900 }),
    ).toEqual({ amount: 89_900, compareAt: 99_900 });
  });

  test("drops a compare-at at or below the price", () => {
    expect(
      variantPrice({ priceAmount: 89_900, compareAtPriceAmount: 89_900 }),
    ).toEqual({ amount: 89_900, compareAt: null });
    expect(
      variantPrice({ priceAmount: 89_900, compareAtPriceAmount: null }),
    ).toEqual({ amount: 89_900, compareAt: null });
  });
});
