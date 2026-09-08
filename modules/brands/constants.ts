import type { SortOrder } from "@/lib/utils/sort";
import type { BrandFormValues } from "@/modules/brands/schemas";

// There is deliberately no `BRANDS_PER_PAGE`. A bounded list declines
// pagination (ADR-0025): the set is tens of rows and an Admin sees it whole,
// so there is no `PaginationNav` and therefore no page size to declare.

/**
 * The columns an Admin can sort the list by. A Brand is a name (`CONTEXT.md`),
 * so `name` is the only column of `brand` here; `productCount` is derived by
 * the query rather than stored, and it is the column that answers which
 * manufacturers the store actually stocks.
 */
export const BRAND_SORT_FIELDS = ["name", "productCount"] as const;

export type BrandSortField = (typeof BRAND_SORT_FIELDS)[number];

/**
 * The direction each column starts in on its first click. Per field, because
 * one global `desc` would sort names Z-A the first time an Admin clicks
 * "Nome"; the count starts at the largest, because the question it answers is
 * which manufacturers carry the catalogue.
 */
export const BRAND_SORT_DEFAULTS: Record<BrandSortField, SortOrder> = {
  name: "asc",
  productCount: "desc",
};

/**
 * What the create dialog opens with. Module-owned values (`docs/MODULES.md`)
 * rather than an object literal inside a `.tsx`, so the create wrapper's
 * `defaultValues` and the form body do not each keep their own copy of the
 * same shape.
 *
 * One field, because that is the whole entity.
 */
export const NEW_BRAND: BrandFormValues = {
  name: "",
};
