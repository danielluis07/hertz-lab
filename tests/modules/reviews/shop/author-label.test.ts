import { describe, expect, test } from "bun:test";
import { reviewAuthorLabel } from "@/modules/reviews/shop/author-label";

describe("reviewAuthorLabel", () => {
  test("keeps a one-word name without inventing an initial", () => {
    expect(reviewAuthorLabel("Fernanda")).toBe("Fernanda");
  });

  test("uses the first name and the last name's initial", () => {
    expect(reviewAuthorLabel("Daniel Luis Silva")).toBe("Daniel S.");
  });

  test("normalizes whitespace before deriving the label", () => {
    expect(reviewAuthorLabel("  Ana   Maria   Souza  ")).toBe("Ana S.");
  });
});
