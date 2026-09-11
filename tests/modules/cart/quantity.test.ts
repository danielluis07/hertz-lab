import { describe, expect, test } from "bun:test";
import type { CartLineAvailability } from "@/modules/cart/availability";
import { quantitySteps } from "@/modules/cart/quantity";

const line = (
  availability: CartLineAvailability,
  quantity: number,
  stockQuantity: number,
) => ({ availability, quantity, stockQuantity });

describe("quantitySteps", () => {
  test("an available line steps one unit either way inside its stock", () => {
    expect(quantitySteps(line("available", 2, 5))).toEqual({
      decrease: 1,
      increase: 3,
      correction: null,
    });
  });

  test("never decreases below one: zero is a removal, not a quantity", () => {
    expect(quantitySteps(line("available", 1, 5)).decrease).toBeNull();
  });

  test("never increases past the stock the server would refuse", () => {
    expect(quantitySteps(line("available", 5, 5)).increase).toBeNull();
  });

  test("an under-stocked line decreases straight to its stock, and offers it as the correction", () => {
    expect(quantitySteps(line("insufficient_stock", 5, 2))).toEqual({
      decrease: 2,
      increase: null,
      correction: 2,
    });
  });

  test("an under-stocked line one unit over decreases by one", () => {
    expect(quantitySteps(line("insufficient_stock", 3, 2)).decrease).toBe(2);
  });

  test("an out-of-stock line can only be removed", () => {
    expect(quantitySteps(line("out_of_stock", 2, 0))).toEqual({
      decrease: null,
      increase: null,
      correction: null,
    });
  });

  test("a line whose Product left sale can only be removed, whatever its stock", () => {
    expect(quantitySteps(line("product_unavailable", 2, 10))).toEqual({
      decrease: null,
      increase: null,
      correction: null,
    });
  });
});
