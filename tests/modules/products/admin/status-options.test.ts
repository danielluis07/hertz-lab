import { describe, expect, test } from "bun:test";
import { productStatusOptions } from "@/modules/products/admin/status-options";

describe("productStatusOptions", () => {
  test("a draft keeps its current value and offers publishing and archiving", () => {
    expect(productStatusOptions("draft").map(({ value }) => value)).toEqual([
      "draft", "active", "archived",
    ]);
  });

  test("an active Product can be archived but cannot return to draft", () => {
    expect(productStatusOptions("active").map(({ value }) => value)).toEqual([
      "active", "archived",
    ]);
  });

  test("an archived Product can be published but cannot return to draft", () => {
    expect(productStatusOptions("archived").map(({ value }) => value)).toEqual([
      "active", "archived",
    ]);
  });
});
