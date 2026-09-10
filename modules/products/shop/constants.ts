import type { CatalogInput } from "@/modules/products/shop/schemas";

/**
 * Products per catalogue page. 24 divides by 2, 3 and 4, so the grid has no
 * ragged final row at any of its widths (`docs/STOREFRONT.md`).
 *
 * Not `PRODUCTS_PER_PAGE`, which is 20 because that is what the admin table is
 * built for: a page size is a **layout** decision, and these are two layouts.
 * Sharing one constant would let a change to the table silently reflow the
 * storefront. A constant and never a parameter, for admin's reason (ADR-0014).
 */
export const CATALOG_PER_PAGE = 24;

/**
 * Each input key's public parameter name (ADR-0005). What `PaginationNav`'s
 * `paramKey` and every catalogue filter control read, so no surface spells a
 * Portuguese parameter by hand.
 *
 * Here rather than beside `parseCatalogParams`, which renames through it,
 * because the catalogue's filter bar is a client component that needs it too:
 * importing it from `schemas.ts` would ship zod to the shopper's browser for
 * the sake of seven strings.
 */
export const CATALOG_PARAMS = {
  search: "busca",
  brandId: "marca",
  priceMin: "preco_min",
  priceMax: "preco_max",
  promotion: "promocao",
  sort: "ordenar",
  page: "pagina",
} as const satisfies Record<keyof CatalogInput, string>;
