import type { CatalogInput } from "@/modules/products/shop/schemas";
import { caller } from "@/trpc/server";

/**
 * The catalogue both routes share — `/produtos` and `/produtos/[...categoria]`
 * are one surface (`docs/STOREFRONT.md`). It issues its own two reads in one
 * `Promise.all`, both through `caller`: nothing a shopper does invalidates the
 * catalogue, so there is nothing to prefetch and nothing to hydrate
 * (ADR-0032).
 *
 * **The UI is pending (#109).** Everything the surface renders comes from the
 * three values below, and nothing else needs fetching:
 *
 * - `items` — `ProductCardRow[]`, one `ProductCard` each, 24 per page
 * - `total` — with `CATALOG_PER_PAGE` and `CATALOG_PARAMS.page`, the
 *   `PaginationNav`; `items` empty is the empty state, never a 404
 * - `brands` — the Marca filter's options, already sorted pt-BR
 *
 * The placeholder below dumps them so the data can be read at `/produtos`
 * until the bar, grid, pagination and empty state land. Replace the `return`,
 * not the reads.
 */
export async function Catalog({
  input,
  categoryIds,
}: {
  input: CatalogInput;
  /** A Category page's subtree (ADR-0043); omitted on `/produtos`. */
  categoryIds?: string[];
}) {
  const [{ items, total }, brands] = await Promise.all([
    caller.products.shop.list({ ...input, categoryIds }),
    caller.brands.shop.options(),
  ]);

  return <pre>{JSON.stringify({ total, items, brands }, null, 2)}</pre>;
}
