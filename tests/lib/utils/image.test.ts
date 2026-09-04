import { describe, expect, test } from "bun:test";
import {
  checkImageDimensions,
  checkImageUpload,
  imageKeyMatcher,
  imageUploadSchema,
  IMAGE_CONTENT_TYPES,
  IMAGE_EXTENSIONS,
  IMAGE_MAX_BYTES,
} from "@/lib/utils/image";

/**
 * The two rules every image in this app obeys, whichever uploader sent it
 * (ADR-0018, ADR-0021). The client checks them for feedback and — for type and
 * size — the write `stat`s the object as the real guard, but both sides read
 * *these* constants, so the sentence an Admin sees when a file is refused is
 * the sentence the procedure would have refused it with.
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
      size: IMAGE_MAX_BYTES + 1,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "A imagem deve ter no máximo 5 MB.",
    );
  });

  test("accepts a file exactly at the ceiling", () => {
    const result = imageUploadSchema.safeParse({
      ...upload,
      size: IMAGE_MAX_BYTES,
    });

    expect(result.success).toBe(true);
  });

  test("refuses an empty file", () => {
    expect(imageUploadSchema.safeParse({ ...upload, size: 0 }).success).toBe(
      false,
    );
  });

  /**
   * The key a mint ends with is an extension, so a type the schema accepts and
   * the map does not would mint `products/<uuid>.undefined`.
   */
  test("every accepted content type can be minted into a key", () => {
    for (const contentType of IMAGE_CONTENT_TYPES) {
      expect(IMAGE_EXTENSIONS[contentType]).toMatch(/^[a-z0-9]+$/);
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
 * The geometry rule (ADR-0021), written out at its boundaries rather than
 * derived from the constants it is testing: a test that read
 * `IMAGE_MIN_DIMENSION` back would agree with any floor at all, including a
 * typo (ADR-0017). The numbers below are the decision — square, 1200 to 4000.
 */
describe("checkImageDimensions", () => {
  test("accepts a square photograph inside the bounds", () => {
    expect(checkImageDimensions({ width: 1600, height: 1600 })).toEqual({
      accepted: true,
    });
  });

  test("accepts a square photograph exactly at the floor", () => {
    expect(checkImageDimensions({ width: 1200, height: 1200 })).toEqual({
      accepted: true,
    });
  });

  test("accepts a square photograph exactly at the ceiling", () => {
    expect(checkImageDimensions({ width: 4000, height: 4000 })).toEqual({
      accepted: true,
    });
  });

  test("refuses a square photograph one pixel under the floor, naming what it got", () => {
    expect(checkImageDimensions({ width: 1199, height: 1199 })).toEqual({
      accepted: false,
      message:
        "A imagem deve ter no mínimo 1200×1200 px. Esta tem 1199×1199 px.",
    });
  });

  test("refuses a square photograph one pixel over the ceiling, naming what it got", () => {
    expect(checkImageDimensions({ width: 4001, height: 4001 })).toEqual({
      accepted: false,
      message:
        "A imagem deve ter no máximo 4000×4000 px. Esta tem 4001×4001 px.",
    });
  });

  test("refuses a photograph that is not square, naming what it got", () => {
    expect(checkImageDimensions({ width: 1600, height: 1200 })).toEqual({
      accepted: false,
      message: "A imagem deve ser quadrada (1:1). Esta tem 1600×1200 px.",
    });
  });

  test("refuses a portrait photograph the same way", () => {
    expect(checkImageDimensions({ width: 1200, height: 1600 })).toEqual({
      accepted: false,
      message: "A imagem deve ser quadrada (1:1). Esta tem 1200×1600 px.",
    });
  });

  /**
   * Both wrong at once. The refusal is the one that tells the Admin what to
   * do: a 400 × 300 lifestyle shot is not a crop away from being usable, and
   * saying "too small" of it would send them looking for a bigger version of
   * the wrong shape.
   */
  test("refuses a file that is both non-square and too small as non-square", () => {
    expect(checkImageDimensions({ width: 400, height: 300 })).toEqual({
      accepted: false,
      message: "A imagem deve ser quadrada (1:1). Esta tem 400×300 px.",
    });
  });

  test("refuses a file that is both non-square and too large as non-square", () => {
    expect(checkImageDimensions({ width: 5000, height: 4000 })).toEqual({
      accepted: false,
      message: "A imagem deve ser quadrada (1:1). Esta tem 5000×4000 px.",
    });
  });

  /** The three refusals are three sentences, which is what the ADR asked for. */
  test("names three distinct reasons", () => {
    const messages = [
      checkImageDimensions({ width: 1600, height: 1200 }),
      checkImageDimensions({ width: 800, height: 800 }),
      checkImageDimensions({ width: 5000, height: 5000 }),
    ].map((check) => (check.accepted ? "" : check.message));

    expect(new Set(messages).size).toBe(3);
  });
});

/**
 * The prefix guard. Every key is minted server-side so no client can escape
 * its prefix (ADR-0018) — and the procedures that take a key *back* from a
 * client are where that promise is kept. There are two uploaders now
 * (ADR-0021), so the prefix is bound per module and neither accepts the
 * other's keys.
 */
describe("imageKeyMatcher", () => {
  const isProductKey = imageKeyMatcher("products");
  const isCategoryKey = imageKeyMatcher("categories");
  const uuid = "0199f0a1-2b3c-7d4e-8f90-1a2b3c4d5e6f";

  test("recognises a key minted under its own prefix", () => {
    expect(isProductKey(`products/${uuid}.webp`)).toBe(true);
    expect(isCategoryKey(`categories/${uuid}.webp`)).toBe(true);
  });

  test("refuses a well-formed key minted under another prefix", () => {
    expect(isProductKey(`categories/${uuid}.webp`)).toBe(false);
    expect(isCategoryKey(`products/${uuid}.webp`)).toBe(false);
  });

  test("refuses a traversal out of the prefix", () => {
    expect(isProductKey("products/../secrets.env")).toBe(false);
  });

  test("refuses a name that is not a minted uuid", () => {
    expect(isProductKey("products/gato.webp")).toBe(false);
  });

  /**
   * The generator the procedures actually call, so the pattern cannot drift
   * away from the keys this app mints.
   */
  test("recognises a key minted the way createImageUpload mints one", () => {
    expect(isProductKey(`products/${Bun.randomUUIDv7()}.webp`)).toBe(true);
  });

  /**
   * A v4 uuid is well formed and is not something this uploader produced. The
   * pattern says "a v7 uuid" because that is what it means — a key is not
   * merely thirty-two hex digits in the right places.
   */
  test("refuses a uuid of another version", () => {
    expect(
      isProductKey("products/0199f0a1-2b3c-4d4e-8f90-1a2b3c4d5e6f.webp"),
    ).toBe(false);
  });

  test("refuses an extension no uploader mints", () => {
    expect(isProductKey(`products/${uuid}.svg`)).toBe(false);
  });
});
