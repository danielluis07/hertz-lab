import { z } from "zod";

/**
 * The Brand's own vocabulary, at the module root because a Brand means the
 * same thing to both audiences (`docs/MODULES.md`, rule 1). One schema serves
 * the tRPC `.input()` **and** the React Hook Form resolver, so the sentence an
 * Admin reads under the field is the same sentence the procedure would have
 * refused with — there is no second list of messages to keep in step.
 *
 * Messages are pt-BR, and they are here rather than in the form because a
 * schema that only described shapes would let the resolver fall back to Zod's
 * English.
 *
 * **One field is the whole entity.** A Brand is filterable and never
 * addressable (`CONTEXT.md`), so there is no slug, no description and no logo
 * key for this schema to describe.
 *
 * **Uniqueness is not here, and cannot be.** "Two Brands cannot share one name
 * whatever the casing" needs a read, so it lives in the `create` and `update`
 * procedures and in the index that backs them, rather than in a clause this
 * schema could hold.
 */
export const brandSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da marca."),
});

/**
 * No `types.ts`: the form's values, the procedure's input and the resolver all
 * infer from the one schema above.
 */
export type BrandFormValues = z.infer<typeof brandSchema>;
