import { describe, expect, test } from "bun:test";
import {
  categoryPath,
  categorySlugFromPath,
  isCanonicalCategoryPath,
} from "@/modules/categories/paths";

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

describe("categorySlugFromPath", () => {
  test("reads the last segment of a one- or two-segment path", () => {
    expect(categorySlugFromPath(["audio"])).toBe("audio");
    expect(categorySlugFromPath(["audio", "fones"])).toBe("fones");
  });

  test("refuses a path deeper than the tree, so nothing is read", () => {
    // ADR-0022 bounds the tree at two levels.
    expect(categorySlugFromPath(["audio", "fones", "sem-fio"])).toBeNull();
  });

  test("refuses an empty path", () => {
    expect(categorySlugFromPath([])).toBeNull();
  });
});

describe("isCanonicalCategoryPath", () => {
  const root = { slug: "audio", parentSlug: null };
  const child = { slug: "fones", parentSlug: "audio" };

  test("a root is addressed by its own slug alone", () => {
    expect(isCanonicalCategoryPath(["audio"], root)).toBe(true);
  });

  test("a root under any parent segment is not its URL", () => {
    expect(isCanonicalCategoryPath(["video", "audio"], root)).toBe(false);
  });

  test("a child is addressed through its real parent", () => {
    expect(isCanonicalCategoryPath(["audio", "fones"], child)).toBe(true);
  });

  test("a child without its parent is not its URL", () => {
    // `category.slug` is globally unique, so the last segment alone would
    // resolve — which is exactly what ADR-0043 refuses.
    expect(isCanonicalCategoryPath(["fones"], child)).toBe(false);
  });

  test("a child under a fabricated parent is not its URL", () => {
    expect(isCanonicalCategoryPath(["qualquer-coisa", "fones"], child)).toBe(
      false,
    );
  });

  test("a path that does not end at the Category is not its URL", () => {
    expect(isCanonicalCategoryPath(["audio", "caixas"], child)).toBe(false);
  });
});
