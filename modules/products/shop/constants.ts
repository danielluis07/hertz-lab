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
