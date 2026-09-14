import { describe, expect, test } from "bun:test";
import {
  formatProductCount,
  formatReviewCount,
  ratingSummary,
} from "@/modules/products/shop/format";

describe("formatProductCount", () => {
  test("is singular for exactly one", () => {
    expect(formatProductCount(1)).toBe("1 produto");
  });

  test("is plural for zero, as Brazilians say it", () => {
    // CLDR files 0 under pt's "one", and "0 produto" is not how anyone
    // writes it — which is why this does not use Intl.PluralRules.
    expect(formatProductCount(0)).toBe("0 produtos");
  });

  test("is plural above one, with pt-BR grouping", () => {
    expect(formatProductCount(24)).toBe("24 produtos");
    expect(formatProductCount(1234)).toBe("1.234 produtos");
  });
});

describe("formatReviewCount", () => {
  test("is singular for exactly one", () => {
    expect(formatReviewCount(1)).toBe("1 avaliação");
  });

  test("is plural otherwise, with pt-BR grouping", () => {
    expect(formatReviewCount(12)).toBe("12 avaliações");
    expect(formatReviewCount(1234)).toBe("1.234 avaliações");
  });
});

describe("ratingSummary", () => {
  test("is absent with zero approved Reviews, never a 0,0", () => {
    expect(ratingSummary({ ratingAverage: 0, ratingCount: 0 })).toBeNull();
  });

  test("formats the hundredths average beside the count", () => {
    expect(ratingSummary({ ratingAverage: 450, ratingCount: 12 })).toEqual({
      average: "4,5",
      count: "12 avaliações",
    });
  });
});
