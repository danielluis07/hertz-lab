import { z } from "zod";

/**
 * The Product's own vocabulary, at the module root because a Product means the
 * same thing to both audiences (`docs/MODULES.md`, rule 1). One schema serves
 * the tRPC `.input()` **and** the React Hook Form resolver, so the sentence an
 * Admin reads under a field is the same sentence the procedure would have
 * refused with — there is no second list of messages to keep in step.
 *
 * Messages are pt-BR, and they are here rather than in the form because a
 * schema that only described shapes would let the resolver fall back to Zod's
 * English. Only the clauses that are *rules* are tested (ADR-0017): a Product
 * has at least one Variant, and an Image has alt text.
 *
 * **Money is integer cents** (`CONTEXT.md`), on the wire and in form state
 * alike; the money inputs parse what an Admin typed and store the cents.
 */

/**
 * Every child of the aggregate carries an optional id, for the reconcile
 * ADR-0019 specifies: absent means insert, present means update that row, and
 * an id that did not come back is deleted. `create` receives the same schema
 * and ignores any id it is sent — which is what keeps one schema, one form
 * body and two thin owners.
 */
const childId = z.string().optional();

export const variantSchema = z.object({
  id: childId,
  /** What distinguishes this one from its siblings: "Preto", "2 m". */
  name: z.string().trim().min(1, "Informe o nome da variação."),
  sku: z.string().trim().min(1, "Informe o SKU."),
  // `product_variant_price_positive` says the same thing in the database; a
  // Variant nobody can pay for is not a price of zero.
  priceAmount: z
    .int({ error: "Informe o preço." })
    .positive("O preço deve ser maior que zero."),
  /** The struck-through "de R$ X" price. Null means the Variant is not on offer. */
  compareAtPriceAmount: z
    .int({ error: "Informe um preço comparativo válido." })
    .positive("O preço comparativo deve ser maior que zero.")
    .nullable(),
  stockQuantity: z
    .int({ error: "Informe o estoque." })
    .min(0, "O estoque não pode ser negativo."),
  // Freight is quoted on weight and dimensions, so none of the four is
  // optional and none of them can be zero.
  weightGrams: z
    .int({ error: "Informe o peso." })
    .positive("O peso deve ser maior que zero."),
  lengthMm: z
    .int({ error: "Informe o comprimento." })
    .positive("O comprimento deve ser maior que zero."),
  widthMm: z
    .int({ error: "Informe a largura." })
    .positive("A largura deve ser maior que zero."),
  heightMm: z
    .int({ error: "Informe a altura." })
    .positive("A altura deve ser maior que zero."),
});

export const specificationSchema = z.object({
  id: childId,
  /** pt-BR: "Impedância". */
  label: z.string().trim().min(1, "Informe o nome da especificação."),
  /** pt-BR: "32 Ω". */
  value: z.string().trim().min(1, "Informe o valor da especificação."),
});

export const productImageSchema = z.object({
  id: childId,
  /** The key `createImageUpload` minted; the file is already in the bucket (ADR-0018). */
  s3Key: z.string().min(1),
  // `product_image.alt_text` is notNull and exists for screen readers, so an
  // empty one is refused rather than defaulted from the Product's name.
  altText: z.string().trim().min(1, "Descreva a imagem para quem não pode vê-la."),
  /**
   * **An index into the form's `variants` array, never a database id** — on
   * create and update alike (ADR-0019). On create the Variants have no ids
   * yet, so the write resolves the index against the ids its own inserts
   * produced; keeping update on indices too is what stops the create and edit
   * payloads being two shapes. Null means the shot belongs to the Product as a
   * whole, which is what the nullable column already means.
   */
  variantId: z.int().min(0).nullable(),
});

/**
 * **What may be uploaded, and how big.** ADR-0018 splits the validation: the
 * browser checks these before asking for a URL, so a refusal is immediate and
 * costs no round trip, and the write `stat`s the object as the real guard —
 * `presign` signs one method and cannot cap a size, so a limit the client is
 * told about is a limit only the client obeys.
 *
 * They live here rather than in `constants.ts` because they are the schema
 * below, which is the tRPC `.input()` of `createImageUpload` and the tile's
 * own check at once: one list of accepted types, one ceiling, one sentence.
 */
export const PRODUCT_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type ProductImageContentType = (typeof PRODUCT_IMAGE_CONTENT_TYPES)[number];

/** 5 MB. A product photograph, not a print master. */
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * The extension `createImageUpload` ends a minted key with. A map rather than
 * a split of the MIME type: `image/jpeg` is `.jpg`, and `image/svg+xml` would
 * be `.svg+xml`. Every accepted type has one, which is a claim the tests make.
 */
export const PRODUCT_IMAGE_EXTENSIONS: Record<ProductImageContentType, string> =
  {
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
  contentType: z.enum(PRODUCT_IMAGE_CONTENT_TYPES, {
    error: "Envie uma imagem JPEG, PNG, WebP ou AVIF.",
  }),
  size: z
    .int({ error: "Não foi possível ler este arquivo." })
    .positive("Este arquivo está vazio.")
    .max(
      PRODUCT_IMAGE_MAX_BYTES,
      `A imagem deve ter no máximo ${PRODUCT_IMAGE_MAX_BYTES / 1024 / 1024} MB.`,
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
 * The shape of a key this app minted: `products/<uuidv7>.<ext>` (ADR-0018).
 *
 * `createImageUpload` mints every key server-side, so no client can name one —
 * and this is what keeps that promise where a key travels the other way, in
 * `discardImageUpload`'s input. A path that escapes the prefix, or an
 * extension the uploader never writes, is not something this app put there.
 */
const PRODUCT_IMAGE_KEY_PATTERN = new RegExp(
  `^products/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](?:${Object.values(
    PRODUCT_IMAGE_EXTENSIONS,
  ).join("|")})$`,
);

export function isProductImageKey(key: string): boolean {
  return PRODUCT_IMAGE_KEY_PATTERN.test(key);
}

/**
 * The check both child arrays share: no two rows may repeat one field's value.
 * The refusal lands on the **second** row's own input rather than on the array
 * above it, so the Admin fixes the duplicate and not the original.
 *
 * Blank values are skipped — the field's own `min(1)` already refuses them,
 * and two empty boxes are one mistake, not two.
 */
function duplicateRows<TField extends string>(
  field: TField,
  message: string,
): z.core.CheckFn<Record<TField, string>[]> {
  return ({ value, issues }) => {
    const seen = new Set<string>();

    value.forEach((row, index) => {
      if (!row[field]) return;

      if (seen.has(row[field])) {
        issues.push({
          code: "custom",
          input: row[field],
          path: [index, field],
          message,
        });
        return;
      }

      seen.add(row[field]);
    });
  };
}

export const productSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do produto."),
  // A slug is a public URL (ADR-0005). On create it prefills from the name
  // until the Admin types in it, which is form behaviour and not a rule.
  slug: z.string().trim().min(1, "Informe a URL do produto."),
  description: z.string().trim().min(1, "Escreva a descrição do produto."),
  brandId: z.string().min(1, "Selecione a marca."),
  categoryId: z.string().min(1, "Selecione a categoria."),
  // `CONTEXT.md`: every Product has at least one Variant, even when there is
  // only one thing to buy — nobody could buy a Product with none.
  variants: z
    .array(variantSchema)
    .min(1, "Um produto precisa de ao menos uma variação.")
    // `product_variant.sku` is unique across the whole catalog, so two rows of
    // one form sharing one is refused here rather than by Postgres: a
    // constraint violation is a 500 and a generic toast, and this is a typo
    // the Admin can see. Uniqueness *against other Products* still needs a
    // query, and `create` runs it.
    .check(duplicateRows("sku", "Este SKU já foi usado em outra variação.")),
  // The `(product_id, label)` unique index, checked the same way and for the
  // same reason — two rows both labelled "Impedância" are a mistake, not a
  // 500. Exact comparison, because that index is exact too: "Peso" and "peso"
  // are two rows the database accepts, and refusing them here would be a
  // stricter rule than the one being enforced.
  specifications: z
    .array(specificationSchema)
    .check(
      duplicateRows("label", "Já existe uma especificação com este nome."),
    ),
  images: z.array(productImageSchema),
});

/**
 * `status` is deliberately absent. A Product's status moves through
 * `publish` and `archive` — the form edits what a Product *is*, a transition
 * is what it *does* (`docs/MODULES.md`) — and `create` writes `draft`
 * unconditionally, so a new listing cannot reach the shop by accident.
 */
export type ProductFormValues = z.infer<typeof productSchema>;
export type VariantFormValues = z.infer<typeof variantSchema>;
export type SpecificationFormValues = z.infer<typeof specificationSchema>;
export type ProductImageFormValues = z.infer<typeof productImageSchema>;
