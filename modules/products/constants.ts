import type { SortOrder } from "@/lib/utils/sort";
import type {
  ProductFormValues,
  SpecificationFormValues,
  VariantFormValues,
} from "@/modules/products/schemas";

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

/**
 * The blank rows a Product form starts from, and the ones its "Adicionar"
 * buttons append. Module-owned values (`docs/MODULES.md`), rather than object
 * literals inside a `.tsx`, because the form body's field arrays and the
 * create wrapper's `defaultValues` would otherwise each keep their own copy of
 * the same shape.
 *
 * Numbers start at zero rather than blank: `productSchema` refuses a price, a
 * weight or a dimension of zero in pt-BR, so a row nobody filled in is stopped
 * at the field that was left behind.
 */
export const EMPTY_VARIANT: VariantFormValues = {
  name: "",
  sku: "",
  priceAmount: 0,
  /** Null, not zero: a Variant that is not on offer has no struck-through price. */
  compareAtPriceAmount: null,
  stockQuantity: 0,
  weightGrams: 0,
  lengthMm: 0,
  widthMm: 0,
  heightMm: 0,
};

export const EMPTY_SPECIFICATION: SpecificationFormValues = {
  label: "",
  value: "",
};

/**
 * What `/admin/products/new` opens with. One Variant row, because a Product
 * cannot be saved with none (`CONTEXT.md`) and an empty section would ask the
 * Admin to discover that; no Specifications, because a technical sheet is
 * optional; no `status`, because a new Product is a draft and the form does
 * not edit that (`docs/MODULES.md`, "Naming").
 */
export const NEW_PRODUCT: ProductFormValues = {
  name: "",
  slug: "",
  description: "",
  brandId: "",
  categoryId: "",
  variants: [EMPTY_VARIANT],
  specifications: [],
  images: [],
};
