/**
 * PROTOTYPE — the stress sketch for issue #11.
 *
 * In real code this is `modules/products/schemas.ts` at the **module root**,
 * not in `admin/`: a Product is the entity's own vocabulary, and one schema
 * serves both the tRPC `.input()` and the React Hook Form resolver.
 *
 * The nesting is the point. This is the shape no `fields: FieldDef[]` array
 * describes, and it is why the list decision could not be taken on the list
 * alone.
 */

import { z } from "zod";

export const variantSchema = z.object({
  /** Distinguishes this Variant from its siblings: "Preto", "2 m". */
  name: z.string().min(1, "Informe o nome da variante"),
  sku: z.string().min(1, "Informe o SKU"),
  /** BRL cents. */
  priceAmount: z.number().int().positive("Informe um preço"),
  stockQuantity: z.number().int().min(0),
  weightGrams: z.number().int().positive("Informe o peso"),
  lengthMm: z.number().int().positive(),
  widthMm: z.number().int().positive(),
  heightMm: z.number().int().positive(),
});

export const specificationSchema = z.object({
  /** pt-BR: "Impedância". */
  label: z.string().min(1, "Informe o rótulo"),
  /** pt-BR: "32 Ω". */
  value: z.string().min(1, "Informe o valor"),
});

export const productImageSchema = z.object({
  /** An S3 object key, never a URL — the same rule the schema states. */
  s3Key: z.string().min(1),
  altText: z.string().min(1, "Descreva a imagem"),
});

export const productSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  slug: z.string().min(1, "Informe o slug"),
  description: z.string().min(1, "Informe a descrição"),
  brandId: z.string().min(1, "Escolha uma marca"),
  categoryId: z.string().min(1, "Escolha uma categoria"),
  status: z.enum(["draft", "active", "archived"]),
  images: z.array(productImageSchema),
  // `CONTEXT.md`: "Every Product has at least one Variant." Structural, not a
  // convention — which is also why create cannot be "save the Product, then
  // add Variants": the first step would write an invalid Product.
  variants: z.array(variantSchema).min(1, "Um produto precisa de ao menos uma variante"),
  specifications: z.array(specificationSchema),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export const EMPTY_VARIANT: ProductFormValues["variants"][number] = {
  name: "",
  sku: "",
  priceAmount: 0,
  stockQuantity: 0,
  weightGrams: 0,
  lengthMm: 0,
  widthMm: 0,
  heightMm: 0,
};
