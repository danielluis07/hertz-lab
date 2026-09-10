import { describe, expect, test } from "bun:test";
import { formatProductCount } from "@/modules/products/shop/format";

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
