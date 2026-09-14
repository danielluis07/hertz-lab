import { describe, expect, test } from "bun:test";
import { categoryPath } from "@/modules/categories/paths";

describe("categoryPath", () => {
  test("a root is one segment", () => {
    expect(categoryPath({ slug: "audio", parentSlug: null })).toBe(
      "/produtos/audio",
    );
  });

  test("a child is its parent's slug, then its own", () => {
    expect(categoryPath({ slug: "fones", parentSlug: "audio" })).toBe(
      "/produtos/audio/fones",
    );
  });
});
