import { describe, expect, test } from "bun:test";
import {
  toProductFormValues,
  variantIndexAfterRemoval,
  type ProductDetail,
} from "@/modules/products/admin/form-values";
import { productSchema } from "@/modules/products/schemas";

/**
 * The claim under test is ADR-0019's, and it is the one thing in this file
 * that is a rule rather than a copy: **an Image names its Variant by the
 * index of that Variant in the form's array, never by a database id.** The
 * field-by-field copying around it is shape, and asserting on it would test
 * that `=` works.
 *
 * The second claim is the round trip: what the read hands the form is what the
 * write takes back, ids included, so the reconcile updates rows instead of
 * re-inserting them.
 */

const timestamps = {
  createdAt: new Date("2026-09-01T12:00:00Z"),
  updatedAt: new Date("2026-09-01T12:00:00Z"),
};

const variant = {
  productId: "product-id",
  sku: "HL-FONE-001-PT",
  priceAmount: 49900,
  compareAtPriceAmount: null,
  stockQuantity: 10,
  weightGrams: 250,
  lengthMm: 200,
  widthMm: 180,
  heightMm: 90,
  ...timestamps,
};

const detail: ProductDetail = {
  id: "product-id",
  name: "Fone Bluetooth",
  slug: "fone-bluetooth",
  description: "Um fone sem fio.",
  brandId: "brand-id",
  categoryId: "category-id",
  status: "active",
  ratingAverage: 450,
  ratingCount: 12,
  ...timestamps,
  variants: [
    { ...variant, id: "variant-preto", name: "Preto", position: 0 },
    {
      ...variant,
      id: "variant-branco",
      name: "Branco",
      sku: "HL-FONE-001-BR",
      position: 1,
    },
  ],
  images: [
    {
      id: "image-capa",
      productId: "product-id",
      variantId: null,
      s3Key: "products/capa.webp",
      altText: "Fone visto de frente",
      position: 0,
      ...timestamps,
    },
    {
      id: "image-branco",
      productId: "product-id",
      variantId: "variant-branco",
      s3Key: "products/branco.webp",
      altText: "Fone branco de lado",
      position: 1,
      ...timestamps,
    },
  ],
  specifications: [
    {
      id: "specification-impedancia",
      productId: "product-id",
      label: "Impedância",
      value: "32 Ω",
      position: 0,
      ...timestamps,
    },
  ],
};

describe("toProductFormValues", () => {
  test("names an Image's Variant by its index in the array", () => {
    const values = toProductFormValues(detail);

    // "variant-branco" is the second Variant, so the tile holds 1 — the
    // number the write resolves back to an id (ADR-0019).
    expect(values.images[1].variantId).toBe(1);
  });

  test("leaves a shot of the Product as a whole at null", () => {
    const values = toProductFormValues(detail);

    expect(values.images[0].variantId).toBeNull();
  });

  /**
   * The form values are the mutation's payload minus its `id`, so the object
   * the read produces has to satisfy the schema the write validates against.
   * A field this mapping forgot fails here rather than at submit.
   */
  test("produces values the write's own schema accepts", () => {
    expect(productSchema.safeParse(toProductFormValues(detail)).success).toBe(
      true,
    );
  });

  /**
   * Without the ids the write has nothing to reconcile against: every child
   * would look new, and inserting them would mean deleting the rows Orders and
   * Carts point at (ADR-0019).
   */
  test("carries every child's id back to the form", () => {
    const values = toProductFormValues(detail);

    expect(values.variants.map((row) => row.id)).toEqual([
      "variant-preto",
      "variant-branco",
    ]);
    expect(values.specifications.map((row) => row.id)).toEqual([
      "specification-impedancia",
    ]);
    expect(values.images.map((row) => row.id)).toEqual([
      "image-capa",
      "image-branco",
    ]);
  });
});

/**
 * The other side of the same rule, and the reason it needs one. An Image names
 * its Variant **positionally**, so removing a Variant row silently re-points
 * every photograph after it: drop "Preto" and the shot of Preto becomes the
 * shot of "Branco". ADR-0019 accepted that indices are load-bearing; it did
 * not accept that.
 */
describe("variantIndexAfterRemoval", () => {
  test("leaves a shot of the Product as a whole alone", () => {
    expect(variantIndexAfterRemoval(null, 0)).toBeNull();
  });

  test("returns a shot of the removed Variant to the Product", () => {
    expect(variantIndexAfterRemoval(1, 1)).toBeNull();
  });

  test("shifts a Variant that moved down the array", () => {
    expect(variantIndexAfterRemoval(2, 0)).toBe(1);
  });

  test("leaves a Variant before the removed one where it is", () => {
    expect(variantIndexAfterRemoval(0, 1)).toBe(0);
  });
});
