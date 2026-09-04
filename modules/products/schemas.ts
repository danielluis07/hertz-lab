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
    .min(1, "Um produto precisa de ao menos uma variação."),
  specifications: z.array(specificationSchema),
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
