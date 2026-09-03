import type { SortOrder } from "@/lib/utils/sort";

/**
 * Rows per page in the admin list. A page size is a layout decision — the
 * table is built for a row count — so it is a constant and never a URL
 * parameter (ADR-0014); `list` takes it from here rather than from its input.
 */
export const PRODUCTS_PER_PAGE = 20;

/** The columns an Admin can sort the catalog by. Price is not one: it lives on the Variant (ADR-0001). */
export const PRODUCT_SORT_FIELDS = ["name", "ratingAverage", "createdAt"] as const;

export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

/**
 * The direction each column starts in on its first click. Per field, because
 * one global `desc` would sort products Z-A the first time an Admin clicks the
 * name column.
 */
export const PRODUCT_SORT_DEFAULTS: Record<ProductSortField, SortOrder> = {
  name: "asc",
  ratingAverage: "desc",
  createdAt: "desc",
};

/** The three statuses of `product_status`, in the order a Product moves through them. */
export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  archived: "Arquivado",
};

/** The filter's options, and the single source of the labels beside them. */
export const PRODUCT_STATUS_OPTIONS = PRODUCT_STATUSES.map((value) => ({
  value,
  label: PRODUCT_STATUS_LABELS[value],
}));
