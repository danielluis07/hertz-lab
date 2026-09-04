import { describe, expect, test } from "bun:test";
import {
  checkImageUpload,
  imageUploadSchema,
  isProductImageKey,
  PRODUCT_IMAGE_CONTENT_TYPES,
  PRODUCT_IMAGE_EXTENSIONS,
  PRODUCT_IMAGE_MAX_BYTES,
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

  /**
   * `product_variant.sku` is unique across the catalog, so two rows of one
   * form sharing one would reach Postgres as a 500 rather than as something an
   * Admin can fix. The claim is where the refusal lands: on the *second* row's
   * own input.
   */
  test("refuses two Variants that share a SKU, on the second row", () => {
    const result = productSchema.safeParse({
      ...product,
      variants: [variant, { ...variant, name: "Branco" }],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["variants", 1, "sku"]);
    expect(result.error?.issues[0]?.message).toBe(
      "Este SKU já foi usado em outra variação.",
    );
  });

  test("accepts Variants whose SKUs differ", () => {
    const result = productSchema.safeParse({
      ...product,
      variants: [variant, { ...variant, name: "Branco", sku: `${variant.sku}-BR` }],
    });

    expect(result.success).toBe(true);
  });
});

describe("productSchema.specifications", () => {
  const specification = { label: "Impedância", value: "32 Ω" };

  /**
   * The `(product_id, label)` unique index, refused where the Admin can see it
   * — the same claim as the SKU above, and the reason `create` inserts the
   * array without a second check of its own.
   */
  test("refuses two Specifications that share a label, on the second row", () => {
    const result = productSchema.safeParse({
      ...product,
      specifications: [specification, { ...specification, value: "16 Ω" }],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([
      "specifications",
      1,
      "label",
    ]);
    expect(result.error?.issues[0]?.message).toBe(
      "Já existe uma especificação com este nome.",
    );
  });

  /**
   * The index is exact, so these are two rows the database accepts. Refusing
   * them here would enforce a stricter rule than the one being protected.
   */
  test("accepts labels that differ only in case", () => {
    const result = productSchema.safeParse({
      ...product,
      specifications: [specification, { label: "impedância", value: "16 Ω" }],
    });

    expect(result.success).toBe(true);
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

/**
 * The upload's own two rules (ADR-0018). The client checks them for feedback
 * and the write `stat`s the object as the real guard, but both sides read
 * *these* constants — so the sentence an Admin sees when a file is refused is
 * the sentence `createImageUpload` would have refused it with.
 */
describe("imageUploadSchema", () => {
  const upload = { contentType: "image/webp", size: 1024 };

  test("accepts an image the bucket is meant to hold", () => {
    expect(imageUploadSchema.safeParse(upload).success).toBe(true);
  });

  test("refuses a file that is not one of the accepted image types, in pt-BR", () => {
    const result = imageUploadSchema.safeParse({
      ...upload,
      contentType: "application/pdf",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Envie uma imagem JPEG, PNG, WebP ou AVIF.",
    );
  });

  test("refuses a file over the size ceiling, naming the ceiling", () => {
    const result = imageUploadSchema.safeParse({
      ...upload,
      size: PRODUCT_IMAGE_MAX_BYTES + 1,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "A imagem deve ter no máximo 5 MB.",
    );
  });

  test("accepts a file exactly at the ceiling", () => {
    const result = imageUploadSchema.safeParse({
      ...upload,
      size: PRODUCT_IMAGE_MAX_BYTES,
    });

    expect(result.success).toBe(true);
  });

  test("refuses an empty file", () => {
    expect(imageUploadSchema.safeParse({ ...upload, size: 0 }).success).toBe(
      false,
    );
  });

  /**
   * The key `createImageUpload` mints ends in an extension, so a type the
   * schema accepts and the map does not would mint `products/<uuid>.undefined`.
   */
  test("every accepted content type can be minted into a key", () => {
    for (const contentType of PRODUCT_IMAGE_CONTENT_TYPES) {
      expect(PRODUCT_IMAGE_EXTENSIONS[contentType]).toMatch(/^[a-z0-9]+$/);
    }
  });
});

/**
 * What `checkImageUpload` adds over the schema is the *audience*: a tile needs
 * either a payload to send or one sentence to render, never an issue tree.
 */
describe("checkImageUpload", () => {
  test("accepts a file, and answers with what the procedure takes", () => {
    const checked = checkImageUpload({ type: "image/jpeg", size: 2048 });

    expect(checked).toEqual({
      accepted: true,
      upload: { contentType: "image/jpeg", size: 2048 },
    });
  });

  test("refuses a file with the schema's own sentence", () => {
    const checked = checkImageUpload({ type: "image/gif", size: 2048 });

    expect(checked).toEqual({
      accepted: false,
      message: "Envie uma imagem JPEG, PNG, WebP ou AVIF.",
    });
  });
});

/**
 * The prefix guard. `createImageUpload` mints every key itself so no client
 * can escape `products/` (ADR-0018) — and `discardImageUpload`, which takes a
 * key *back* from a client, is where that promise is kept.
 */
describe("isProductImageKey", () => {
  const key = `products/${"0199f0a1-2b3c-7d4e-8f90-1a2b3c4d5e6f"}.webp`;

  test("recognises a key this app minted", () => {
    expect(isProductImageKey(key)).toBe(true);
  });

  test("refuses a key outside the products prefix", () => {
    expect(isProductImageKey("brands/logo.webp")).toBe(false);
  });

  test("refuses a traversal out of the prefix", () => {
    expect(isProductImageKey("products/../secrets.env")).toBe(false);
  });

  test("refuses a name that is not a minted uuid", () => {
    expect(isProductImageKey("products/gato.webp")).toBe(false);
  });

  /**
   * The generator the procedure actually calls, so the pattern cannot drift
   * away from the keys this app mints.
   */
  test("recognises a key minted the way createImageUpload mints one", () => {
    expect(isProductImageKey(`products/${Bun.randomUUIDv7()}.webp`)).toBe(true);
  });

  /**
   * A v4 uuid is well formed and is not something this uploader produced. The
   * pattern says "a v7 uuid" because that is what it means — a key is not
   * merely thirty-two hex digits in the right places.
   */
  test("refuses a uuid of another version", () => {
    expect(
      isProductImageKey("products/0199f0a1-2b3c-4d4e-8f90-1a2b3c4d5e6f.webp"),
    ).toBe(false);
  });

  test("refuses an extension the uploader never mints", () => {
    expect(
      isProductImageKey("products/0199f0a1-2b3c-7d4e-8f90-1a2b3c4d5e6f.svg"),
    ).toBe(false);
  });
});
