import { describe, expect, test } from "bun:test";
import { formatUnits, unavailableReason } from "@/modules/cart/format";

describe("formatUnits", () => {
  test("singular for exactly one", () => {
    expect(formatUnits(1)).toBe("1 unidade");
  });

  test("plural for every other count, zero included", () => {
    expect(formatUnits(0)).toBe("0 unidades");
    expect(formatUnits(3)).toBe("3 unidades");
  });

  test("groups thousands the Brazilian way", () => {
    expect(formatUnits(1200)).toBe("1.200 unidades");
  });
});

describe("unavailableReason", () => {
  test("an available line has none", () => {
    expect(
      unavailableReason({ availability: "available", stockQuantity: 5 }),
    ).toBeNull();
  });

  test("names a Product that left sale", () => {
    expect(
      unavailableReason({ availability: "product_unavailable", stockQuantity: 5 }),
    ).toBe("Este produto não está mais à venda.");
  });

  test("names an exhausted Variant", () => {
    expect(
      unavailableReason({ availability: "out_of_stock", stockQuantity: 0 }),
    ).toBe("Esta variação está esgotada.");
  });

  test("names the stock an under-stocked line is held to", () => {
    expect(
      unavailableReason({ availability: "insufficient_stock", stockQuantity: 1 }),
    ).toBe("Só temos 1 unidade em estoque.");
    expect(
      unavailableReason({ availability: "insufficient_stock", stockQuantity: 2 }),
    ).toBe("Só temos 2 unidades em estoque.");
  });
});
