import { describe, expect, test } from "bun:test";
import { categorySubtreeIds } from "@/modules/categories/shop/subtree";

describe("categorySubtreeIds", () => {
  test("a root narrows to itself and every child", () => {
    expect(
      categorySubtreeIds({
        id: "b-audio",
        children: [{ id: "c-fones" }, { id: "a-caixas" }],
      }),
    ).toEqual(["a-caixas", "b-audio", "c-fones"]);
  });

  test("a child has no children, so it narrows to itself", () => {
    expect(categorySubtreeIds({ id: "c-fones", children: [] })).toEqual([
      "c-fones",
    ]);
  });

  test("two orderings of one subtree are one list", () => {
    // The array varies the query key (ADR-0043).
    expect(
      categorySubtreeIds({ id: "r", children: [{ id: "x" }, { id: "y" }] }),
    ).toEqual(
      categorySubtreeIds({ id: "r", children: [{ id: "y" }, { id: "x" }] }),
    );
  });
});
