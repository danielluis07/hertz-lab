import { z } from "zod";
import { isCategoryImageKey } from "@/modules/categories/images";

/**
 * The Category's own vocabulary, at the module root because a Category means
 * the same thing to both audiences (`docs/MODULES.md`, rule 1). One schema
 * serves the tRPC `.input()` **and** the React Hook Form resolver, so the
 * sentence an Admin reads under a field is the same sentence the procedure
 * would have refused with — there is no second list of messages to keep in
 * step.
 *
 * Messages are pt-BR, and they are here rather than in the form because a
 * schema that only described shapes would let the resolver fall back to Zod's
 * English. Only the clauses that are *rules* are tested (ADR-0017): the
 * description's empty-to-`null`, and the picture key's prefix.
 *
 * **The tree's three refusals are not here** (ADR-0022). "The parent must be a
 * root" and "a Category with children may not take a parent" each need a read,
 * so they live in `create` and `update` rather than in a clause this schema
 * could hold.
 */
export const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria."),
  // A slug is a public URL (ADR-0005). On create it prefills from the name
  // until the Admin types in it, which is form behaviour and not a rule.
  slug: z.string().trim().min(1, "Informe a URL da categoria."),
  /**
   * Optional prose for the browse page. **Empty normalises to `null`**, so
   * "no blurb" is one value in the database rather than two — a column that
   * holds both `''` and `null` for the same fact makes every reader of it
   * write `description ?? ''` or be wrong.
   *
   * It accepts `null` on the way in as well, because that is what the edit
   * form loads from a Category that never had one.
   */
  description: z
    .string()
    .trim()
    .nullable()
    .transform((value) => value || null),
  /**
   * The root above this Category, or `null` for a root itself. **Nullable
   * rather than optional**: "Nenhuma — categoria raiz" is a choice an Admin
   * picks from the Select, not a field they left blank, and the column it
   * writes is nullable and not absent.
   */
  parentId: z.string().nullable(),
  /**
   * The one picture a Category may carry — the key `createImageUpload` minted,
   * whose object is already in the bucket (ADR-0018). Null is a Category with
   * no picture.
   *
   * Refined by the module's own guard, so a `products/` key — well formed, and
   * another table's object — is refused here rather than persisted.
   *
   * **There is deliberately no `altText` beside it** (ADR-0021): the tile
   * renders `alt=""` because it is a link already labelled by the Category
   * name, and there is no column to write one to.
   */
  imageS3Key: z
    .string()
    .refine(isCategoryImageKey, "Imagem inválida.")
    .nullable(),
});

/**
 * No `types.ts`: the form's values, the procedure's input and the resolver all
 * infer from the one schema above.
 */
export type CategoryFormValues = z.infer<typeof categorySchema>;
