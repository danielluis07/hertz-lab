import { z } from "zod";

/** The Review form and `reviews.shop.create` share this input contract. */
export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z
    .int({ error: "Escolha uma nota válida." })
    .min(1, "A nota deve ser de 1 a 5.")
    .max(5, "A nota deve ser de 1 a 5."),
  title: z
    .string()
    .trim()
    .max(120, "O título deve ter no máximo 120 caracteres.")
    .nullable()
    .optional()
    .transform((title) => (title ? title : null)),
  body: z
    .string()
    .trim()
    .min(20, "Escreva ao menos 20 caracteres.")
    .max(2_000, "A avaliação deve ter no máximo 2.000 caracteres."),
});

export type ReviewFormValues = z.infer<typeof reviewSchema>;
