import { describe, expect, test } from "bun:test";
import { cardPrice } from "@/modules/products/shop/card";

const row = {
  priceAmount: 129_900,
  compareAtPriceAmount: null,
  variantCount: 1,
};

describe("cardPrice", () => {
  test("prints the row's price", () => {
    expect(cardPrice(row).amount).toBe(129_900);
  });

  test("prefixes A partir de only when there is more than one Variant", () => {
    // ADR-0045: a fact about the Product having more than one thing to buy,
    // not about those things being priced differently.
    expect(cardPrice(row).fromPrice).toBe(false);
    expect(cardPrice({ ...row, variantCount: 2 }).fromPrice).toBe(true);
  });

  test("strikes through a compare-at price above the price", () => {
    expect(
      cardPrice({ ...row, compareAtPriceAmount: 149_900 }).compareAt,
    ).toBe(149_900);
  });

  test("strikes through nothing when the Variant carries no compare-at", () => {
    expect(cardPrice(row).compareAt).toBeNull();
  });

  test("never strikes through a price that is not a saving", () => {
    // The Admin schema checks each amount alone, so a compare-at at or below
    // the price can be stored; striking it through would claim a discount
    // that does not exist.
    expect(
      cardPrice({ ...row, compareAtPriceAmount: 129_900 }).compareAt,
    ).toBeNull();
    expect(
      cardPrice({ ...row, compareAtPriceAmount: 99_900 }).compareAt,
    ).toBeNull();
  });
});
