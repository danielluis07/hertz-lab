import { describe, expect, test } from "bun:test";
import {
  categorySchema,
  type CategoryFormValues,
} from "@/modules/categories/schemas";

/**
 * **Narrow on purpose.** A schema is tested where it holds a rule and not
 * where it only describes a shape (ADR-0017). Exactly two clauses in
 * `categorySchema` are rules: a description normalises to `null` so that "no
 * blurb" is one value in the database rather than two, and an `imageS3Key`
 * must be a key *this module* minted (`isCategoryImageKey`). The
 * `z.string().min(1)` beside them are shape — asserting on those would test
 * that Zod works.
 *
 * There is deliberately nothing here about `altText`: the column does not
 * exist, and ADR-0021 says why.
 */

const category: CategoryFormValues = {
  name: "Fones de ouvido",
  slug: "fones-de-ouvido",
  description: "Fones para todos os ouvidos.",
  parentId: null,
  imageS3Key: null,
};

describe("categorySchema.description", () => {
  test("normalises an empty description to null", () => {
    const result = categorySchema.safeParse({ ...category, description: "" });

    expect(result.success).toBe(true);
    expect(result.data?.description).toBeNull();
  });

  test("normalises a whitespace-only description to null", () => {
    // The trim runs first, so a description of spaces is the same "no blurb"
    // as an untouched textarea rather than a second empty value.
    expect(
      categorySchema.safeParse({ ...category, description: "   " }).data
        ?.description,
    ).toBeNull();
  });

  test("keeps a null description null", () => {
    // What the edit form loads from a Category that never had one, so parsing
    // it back is a no-op rather than a refusal.
    expect(
      categorySchema.safeParse({ ...category, description: null }).data
        ?.description,
    ).toBeNull();
  });

  test("keeps a written description, trimmed", () => {
    expect(
      categorySchema.safeParse({ ...category, description: "  Um blurb.  " })
        .data?.description,
    ).toBe("Um blurb.");
  });

  test("is idempotent, so one schema serves the form and the procedure", () => {
    const once = categorySchema.parse({ ...category, description: "" });

    expect(categorySchema.parse(once)).toEqual(once);
  });
});

describe("categorySchema.imageS3Key", () => {
  test("accepts a key this module minted", () => {
    expect(
      categorySchema.safeParse({
        ...category,
        imageS3Key: "categories/0199c0f1-0000-7000-8000-000000000000.webp",
      }).success,
    ).toBe(true);
  });

  test("refuses another module's key, in pt-BR", () => {
    // A `products/` key is a well-formed image key and is not one of these —
    // the whole reason the prefix is bound per module (ADR-0009).
    const result = categorySchema.safeParse({
      ...category,
      imageS3Key: "products/0199c0f1-0000-7000-8000-000000000000.webp",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["imageS3Key"]);
    expect(result.error?.issues[0]?.message).toBe("Imagem inválida.");
  });

  test("accepts no picture at all", () => {
    // Null is a value: a Category without a picture is not a Category missing
    // a field.
    expect(
      categorySchema.safeParse({ ...category, imageS3Key: null }).success,
    ).toBe(true);
  });
});
