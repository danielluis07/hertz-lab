import { z } from "zod";
import { SORT_ORDERS } from "@/lib/utils/sort";
import {
  PRODUCT_SORT_DEFAULTS,
  PRODUCT_SORT_FIELDS,
  PRODUCT_STATUSES,
} from "@/modules/products/constants";

/**
 * One lenient schema parses the URL *and* validates the procedure's input
 * (ADR-0014). It lives in the audience folder because "paginated, and includes
 * draft and archived" is a sentence only the admin can say.
 *
 * `.catch()` is per field, never on the object: an object-level catch would
 * discard every filter because one of them was malformed. The consequence is
 * that `parse` cannot throw, which is what lets the page call it on a URL an
 * Admin can hand-edit — and unknown keys are stripped, so `?foo=bar` cannot
 * perturb the query key.
 *
 * The schema's keys are the parameter names. ADR-0005 gives admin routes
 * English parameters, so there is no mapping table to keep in step.
 */
export const productListParamsSchema = z
  .object({
    page: z.coerce.number().int().positive().catch(1),
    // Empty means absent: an untouched search box hashes to the same query key
    // as no search box at all.
    search: z.string().trim().min(1).optional().catch(undefined),
    status: z.enum(PRODUCT_STATUSES).optional().catch(undefined),
    categoryId: z.string().trim().min(1).optional().catch(undefined),
    brandId: z.string().trim().min(1).optional().catch(undefined),
    sortBy: z.enum(PRODUCT_SORT_FIELDS).catch("createdAt"),
    sortOrder: z.enum(SORT_ORDERS).optional().catch(undefined),
  })
  // Resolving the direction here rather than at each call site is what makes
  // the per-field default a property of the parsed object, and it keeps the
  // schema idempotent: a resolved direction parses back to itself.
  .transform(({ sortOrder, ...params }) => ({
    ...params,
    sortOrder: sortOrder ?? PRODUCT_SORT_DEFAULTS[params.sortBy],
  }));

export type ProductListInput = z.infer<typeof productListParamsSchema>;

/**
 * The page's one normalisation. It owns the conversion, fills every default,
 * and its output is the procedure's input — so the client cannot build a
 * divergent query key, because it never computes one (ADR-0011).
 */
export function parseProductListParams(
  searchParams: Record<string, string | string[] | undefined>,
): ProductListInput {
  return productListParamsSchema.parse(searchParams);
}
