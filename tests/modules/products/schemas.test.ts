import { describe, expect, test } from "bun:test";
import {
  productImageSchema,
  productSchema,
  type ProductFormValues,
  type VariantFormValues,
} from "@/modules/products/schemas";

/**
 * **Narrow on purpose.** A schema is tested where it holds a rule and not
 * where it only describes a shape (ADR-0017), and exactly two clauses in
 * `productSchema` are rules: every Product has at least one Variant
 * (`CONTEXT.md`), and every Image carries alt text (ADR-0018). The
 * `z.string().min(1)` beside them are shape — asserting on those would test
 * that Zod works.
 */

const variant: VariantFormValues = {
  name: "Preto",
  sku: "HL-FONE-001-PT",
  priceAmount: 49900,
  compareAtPriceAmount: null,
  stockQuantity: 10,
  weightGrams: 250,
  lengthMm: 200,
  widthMm: 180,
  heightMm: 90,
};

const product: ProductFormValues = {
  name: "Fone Bluetooth",
  slug: "fone-bluetooth",
  description: "Um fone sem fio.",
  brandId: "brand-id",
  categoryId: "category-id",
  variants: [variant],
  specifications: [],
  images: [],
};

describe("productSchema.variants", () => {
  test("refuses a Product with no Variant, in pt-BR, on the variants field", () => {
    const result = productSchema.safeParse({ ...product, variants: [] });

    expect(result.success).toBe(false);
    // The path is what puts the message under the array rather than under one
    // of its rows, which is where the form renders it.
    expect(result.error?.issues[0]?.path).toEqual(["variants"]);
    expect(result.error?.issues[0]?.message).toBe(
      "Um produto precisa de ao menos uma variação.",
    );
  });

  test("accepts a Product with one Variant", () => {
    expect(productSchema.safeParse(product).success).toBe(true);
  });
});

describe("productImageSchema.altText", () => {
  const image = { s3Key: "products/one.webp", altText: "Fone preto de lado", variantId: null };

  test("refuses an Image with no alt text", () => {
    expect(productImageSchema.safeParse({ ...image, altText: "" }).success).toBe(
      false,
    );
  });

  test("refuses alt text that is only whitespace", () => {
    // `.trim()` runs before the length check, so a spacebar does not satisfy
    // the column a screen reader reads.
    expect(
      productImageSchema.safeParse({ ...image, altText: "   " }).success,
    ).toBe(false);
  });

  test("accepts an Image described in pt-BR", () => {
    expect(productImageSchema.safeParse(image).success).toBe(true);
  });
});
