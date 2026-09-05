import { z } from "zod";
import { SORT_ORDERS } from "@/lib/utils/sort";
import {
  CATEGORY_SORT_DEFAULTS,
  CATEGORY_SORT_FIELDS,
} from "@/modules/categories/constants";

/**
 * One lenient schema parses the URL *and* validates the procedure's input
 * (ADR-0014). It lives in the audience folder because sorting a table that
 * carries both counts is a sentence only the admin can say.
 *
 * **Two fields, and nothing else.** No `page`, because the list is one
 * unpaginated fetch; no `search` and no filter, because a control that narrows
 * a list already visible in full is decoration (#56). A sorted list is still a
 * URL, so the sort survives.
 *
 * `.catch()` is per field, never on the object: an object-level catch would
 * discard the sort field because the direction beside it was malformed. The
 * consequence is that `parse` cannot throw, which is what lets the page call it
 * on a URL an Admin can hand-edit — and unknown keys are stripped, so `?foo=bar`
 * cannot perturb the query key.
 *
 * The schema's keys are the parameter names. ADR-0005 gives admin routes
 * English parameters, so there is no mapping table to keep in step.
 */
export const categoryListParamsSchema = z
  .object({
    sortBy: z.enum(CATEGORY_SORT_FIELDS).catch("name"),
    sortOrder: z.enum(SORT_ORDERS).optional().catch(undefined),
  })
  // Resolving the direction here rather than at each call site is what makes
  // the per-field default a property of the parsed object, and it keeps the
  // schema idempotent: a resolved direction parses back to itself.
  .transform(({ sortOrder, ...params }) => ({
    ...params,
    sortOrder: sortOrder ?? CATEGORY_SORT_DEFAULTS[params.sortBy],
  }));

export type CategoryListInput = z.infer<typeof categoryListParamsSchema>;

/**
 * The page's one normalisation. It owns the conversion, fills every default,
 * and its output is the procedure's input — so the client cannot build a
 * divergent query key, because it never computes one (ADR-0011).
 */
export function parseCategoryListParams(
  searchParams: Record<string, string | string[] | undefined>,
): CategoryListInput {
  return categoryListParamsSchema.parse(searchParams);
}
