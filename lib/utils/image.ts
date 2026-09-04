import { z } from "zod";

/**
 * Everything true of **any** image this app accepts: what it may be, how big
 * it may be, what shape it must be, and what a key naming one looks like.
 * Isomorphic and pure — the browser checks a file with it before asking for a
 * URL, and a procedure validates its input with it (ADR-0018, ADR-0021).
 *
 * It knows shapes and never a rule about a Product (ADR-0007): alt text, the
 * Variant index and the "Capa" badge stay in `modules/products/`. One value's
 * vocabulary, validation and formatting in one file is what
 * `lib/utils/document.ts` already is (`docs/CONVENTIONS.md`).
 */

/**
 * **What may be uploaded, and how big.** ADR-0018 splits the validation: the
 * browser checks these before asking for a URL, so a refusal is immediate and
 * costs no round trip, and the write `stat`s the object as the real guard —
 * `presign` signs one method and cannot cap a size, so a limit the client is
 * told about is a limit only the client obeys.
 */
export const IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

/** 5 MB. A product photograph, not a print master. */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * The extension a minted key ends with. A map rather than a split of the MIME
 * type: `image/jpeg` is `.jpg`, and `image/svg+xml` would be `.svg+xml`. Every
 * accepted type has one, which is a claim the tests make.
 */
export const IMAGE_EXTENSIONS: Record<ImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/**
 * What `createImageUpload` takes. The `size` binds nothing into the signature
 * — S3 caps a length only through a POST policy, which Bun's client does not
 * write — so it is checked here for the Admin's sake and again by the `stat`
 * the write runs.
 */
export const imageUploadSchema = z.object({
  contentType: z.enum(IMAGE_CONTENT_TYPES, {
    error: "Envie uma imagem JPEG, PNG, WebP ou AVIF.",
  }),
  size: z
    .int({ error: "Não foi possível ler este arquivo." })
    .positive("Este arquivo está vazio.")
    .max(
      IMAGE_MAX_BYTES,
      `A imagem deve ter no máximo ${IMAGE_MAX_BYTES / 1024 / 1024} MB.`,
    ),
});

export type ImageUploadInput = z.infer<typeof imageUploadSchema>;

/**
 * The same rule, in the shape a tile can use: either the payload
 * `createImageUpload` takes, or the one pt-BR sentence to render on the file
 * that was refused.
 *
 * A `File` is a `{ type, size }` to this function and nothing more, which is
 * what keeps the browser's vocabulary out of it and `bun test` inside.
 */
export type ImageUploadCheck =
  | { accepted: true; upload: ImageUploadInput }
  | { accepted: false; message: string };

export function checkImageUpload(file: {
  type: string;
  size: number;
}): ImageUploadCheck {
  const result = imageUploadSchema.safeParse({
    contentType: file.type,
    size: file.size,
  });

  if (result.success) return { accepted: true, upload: result.data };

  return {
    accepted: false,
    // The first issue, because a file is refused for one reason at a time and
    // a tile has room for one sentence.
    message: result.error.issues[0].message,
  };
}

/**
 * **Every picture in this app is square** (ADR-0021), and these are its bounds.
 * The floor is the product page — a gallery at 2× DPR in a half-width desktop
 * column wants about 1200 — and the ceiling buys a bounded decode in the
 * optimizer. The Category tile takes the same numbers rather than a second
 * floor an Admin would have to remember which surface they were on.
 */
export const IMAGE_MIN_DIMENSION = 1200;
export const IMAGE_MAX_DIMENSION = 4000;

/**
 * What the panel above the picker asks for, and the one number here that is
 * not enforced: a photograph at exactly the floor is accepted.
 */
export const IMAGE_IDEAL_DIMENSION = 1600;

/**
 * **The spec, said before the mistake rather than only after it** (ADR-0021):
 * one line, in the panel above every picker, naming the ratio, the floor, the
 * ideal, the ceiling, the byte cap and the formats.
 *
 * It is here, beside the numbers it quotes, so that changing a bound rewrites
 * the sentence that promises it. The format names are the only literals — a
 * person writes "WebP" and "JPG", not `image/webp` and `image/jpeg`, and there
 * are four of them, in the same file as the `IMAGE_CONTENT_TYPES` they name.
 */
export const IMAGE_SPEC_SUMMARY = `Quadrada (1:1) · mínimo ${IMAGE_MIN_DIMENSION}×${IMAGE_MIN_DIMENSION} · ideal ${IMAGE_IDEAL_DIMENSION}×${IMAGE_IDEAL_DIMENSION} · máximo ${IMAGE_MAX_DIMENSION}×${IMAGE_MAX_DIMENSION} · até ${IMAGE_MAX_BYTES / 1024 / 1024} MB · JPG, PNG, WebP ou AVIF`;

export type ImageDimensionsCheck =
  | { accepted: true }
  | { accepted: false; message: string };

/**
 * The geometry rule, in the same discriminated shape as `checkImageUpload`
 * because it lands on the same tile and has room for the same one sentence.
 *
 * **It takes a `{ width, height }` and not a `File`, deliberately.** Only the
 * browser can read those numbers out of a file, and ADR-0017 tests rules and
 * not reads — so the read stays outside and the judgement stays in `bun test`.
 *
 * Squareness is answered first, so a file that is both non-square and too
 * small is refused *as* non-square: that is the reason that tells the Admin
 * what to do, and cropping it also fixes nothing about a 400 × 300 shot.
 *
 * Each refusal names the dimensions it actually received. `Envie uma imagem
 * válida` is the failure mode this exists to avoid.
 */
export function checkImageDimensions({
  width,
  height,
}: {
  width: number;
  height: number;
}): ImageDimensionsCheck {
  const received = `Esta tem ${width}×${height} px.`;

  if (width !== height) {
    return {
      accepted: false,
      message: `A imagem deve ser quadrada (1:1). ${received}`,
    };
  }

  if (width < IMAGE_MIN_DIMENSION) {
    return {
      accepted: false,
      message: `A imagem deve ter no mínimo ${IMAGE_MIN_DIMENSION}×${IMAGE_MIN_DIMENSION} px. ${received}`,
    };
  }

  if (width > IMAGE_MAX_DIMENSION) {
    return {
      accepted: false,
      message: `A imagem deve ter no máximo ${IMAGE_MAX_DIMENSION}×${IMAGE_MAX_DIMENSION} px. ${received}`,
    };
  }

  return { accepted: true };
}

/**
 * The shape of a key this app minted: `<prefix>/<uuidv7>.<ext>` (ADR-0018).
 *
 * Every key is minted server-side, so no client can name one — and this is
 * what keeps that promise wherever a key travels the other way:
 * `discardImageUpload` takes one as input, and a write takes an array of them.
 * A path that escapes the prefix, or an extension no uploader writes, is not
 * something this app put there.
 *
 * The prefix is a parameter because there are two uploaders (ADR-0021) and
 * each guards its own: a `categories/` key is not a Product's image, and a
 * predicate that accepted both would let one module's payload name the
 * other's objects.
 *
 * The uuid is matched **as a v7 uuid** — version nibble `7`, RFC variant — and
 * not as thirty-two loose hex digits, so the pattern says what it means. It
 * still cannot prove that a well-formed key was ever *issued*: that is what
 * `stat` is for, and between them they leave nothing for a client to name.
 */
export function imageKeyMatcher(prefix: string): (key: string) => boolean {
  const pattern = new RegExp(
    `^${prefix}/[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](?:${Object.values(
      IMAGE_EXTENSIONS,
    ).join("|")})$`,
  );

  return (key) => pattern.test(key);
}
