/**
 * PROTOTYPE — throwaway.
 *
 * The list-input schemas, exactly as ADR-0014 specifies them: one lenient Zod
 * schema per list, `.catch()` per field and never on the object, the schema's
 * keys are the parameter names, and the module exports a named parse function
 * beside it.
 *
 * These are **shared by both shapes on purpose**. The schema is settled; it is
 * not the thing under test. Isolating the variable means both the kit and the
 * primitives receive an identical, already-parsed `input` object.
 */

import { z } from "zod";

export const PRODUCTS_PER_PAGE = 12;
export const BRANDS_PER_PAGE = 12;

/**
 * Per-field default direction. `createdAt` newest first, `name` A-Z — a global
 * `desc` would sort names Z-A on first click, which reads as a bug.
 *
 * It resolves in a `.transform()` on the object, *after* every field has had
 * its own `.catch()`. ADR-0014 forbids a `.catch()` on the object, not a
 * transform: a garbage `sortOrder` still costs only the direction.
 */
const PRODUCT_SORT_DEFAULTS = {
  name: "asc",
  ratingAverage: "desc",
  createdAt: "desc",
} as const satisfies Record<string, "asc" | "desc">;

const BRAND_SORT_DEFAULTS = {
  name: "asc",
  productCount: "desc",
  createdAt: "desc",
} as const satisfies Record<string, "asc" | "desc">;

export const productListParamsSchema = z
  .object({
    search: z.string().trim().min(1).optional().catch(undefined),
    status: z.enum(["draft", "active", "archived"]).optional().catch(undefined),
    categoryId: z.string().min(1).optional().catch(undefined),
    brandId: z.string().min(1).optional().catch(undefined),
    sortBy: z.enum(["name", "ratingAverage", "createdAt"]).catch("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().catch(undefined),
    page: z.coerce.number().int().min(1).catch(1),
  })
  .transform((p) => ({
    ...p,
    sortOrder: p.sortOrder ?? PRODUCT_SORT_DEFAULTS[p.sortBy],
  }));

export const brandListParamsSchema = z
  .object({
    search: z.string().trim().min(1).optional().catch(undefined),
    sortBy: z.enum(["name", "productCount", "createdAt"]).catch("name"),
    sortOrder: z.enum(["asc", "desc"]).optional().catch(undefined),
    page: z.coerce.number().int().min(1).catch(1),
  })
  .transform((p) => ({
    ...p,
    sortOrder: p.sortOrder ?? BRAND_SORT_DEFAULTS[p.sortBy],
  }));

export type ProductListInput = z.infer<typeof productListParamsSchema>;
export type BrandListInput = z.infer<typeof brandListParamsSchema>;

export type SearchParams = Record<string, string | string[] | undefined>;

/** The named function the page calls. Owns the parse; keeps Zod out of `page.tsx`. */
export const parseProductListParams = (sp: SearchParams): ProductListInput =>
  productListParamsSchema.parse(sp);

export const parseBrandListParams = (sp: SearchParams): BrandListInput =>
  brandListParamsSchema.parse(sp);

/** Sort defaults, exported for the toggle rule (clicking a new column). */
export const SORT_DEFAULTS = {
  products: PRODUCT_SORT_DEFAULTS,
  brands: BRAND_SORT_DEFAULTS,
} as const;

export const PRODUCT_STATUS_OPTIONS = [
  { value: "draft", label: "Rascunho" },
  { value: "active", label: "Ativo" },
  { value: "archived", label: "Arquivado" },
] as const;
