import type { SortOrder } from "@/lib/utils/sort";
import type { CategoryFormValues } from "@/modules/categories/schemas";

// There is deliberately no `CATEGORIES_PER_PAGE`. The list is one unpaginated
// fetch: the set is tens of rows and an Admin sees it whole, so there is no
// `PaginationNav` and therefore no page size to declare (#56).

/**
 * The columns an Admin can sort the browse tree by. `parentName` and
 * `productCount` are derived by the query rather than columns of `category` —
 * a flat table with a "Categoria pai" column sorts by the name it renders, not
 * by the id behind it.
 *
 * `position` is not among them, and no longer exists: a Category has "no
 * inherent order" (`CONTEXT.md`), so ordering belongs to the surface that
 * renders the list (#54).
 */
export const CATEGORY_SORT_FIELDS = [
  "name",
  "parentName",
  "productCount",
] as const;

export type CategorySortField = (typeof CATEGORY_SORT_FIELDS)[number];

/**
 * The direction each column starts in on its first click. Per field, because
 * one global `desc` would sort names Z-A the first time an Admin clicks
 * "Nome"; the counts start at the largest, because the question they answer is
 * which sections are overloaded.
 */
export const CATEGORY_SORT_DEFAULTS: Record<CategorySortField, SortOrder> = {
  name: "asc",
  parentName: "asc",
  productCount: "desc",
};

/**
 * What `/admin/categories/new` opens with. Module-owned values
 * (`docs/MODULES.md`) rather than an object literal inside a `.tsx`, so the
 * create wrapper's `defaultValues` and the form body do not each keep their
 * own copy of the same shape.
 *
 * `parentId` and `imageS3Key` start as `null` rather than `""`: null is the
 * value "no parent" and "no picture", and the Select offers "Nenhuma —
 * categoria raiz" as a choice rather than as a blank. `description` starts as
 * `""` because a textarea binds a string; the schema turns it into `null` on
 * the way out.
 */
export const NEW_CATEGORY: CategoryFormValues = {
  name: "",
  slug: "",
  description: "",
  parentId: null,
  imageS3Key: null,
};
