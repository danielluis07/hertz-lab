import Link from "next/link";
import { PaginationNav } from "@/components/pagination-nav";
import { Button } from "@/components/ui/button";
import { buildPageHref } from "@/lib/utils/pagination";
import { CatalogFilters } from "@/modules/products/shop/components/catalog-filters";
import { ProductCard } from "@/modules/products/shop/components/product-card";
import {
  CATALOG_PARAMS,
  CATALOG_PER_PAGE,
} from "@/modules/products/shop/constants";
import {
  catalogEmptyReason,
  catalogFilters,
} from "@/modules/products/shop/filters";
import {
  toCatalogSearchParams,
  type CatalogInput,
} from "@/modules/products/shop/schemas";
import { caller } from "@/trpc/server";

/**
 * The catalogue both routes share — `/produtos` and `/produtos/[...categoria]`
 * are one surface (`docs/STOREFRONT.md`): the filter bar, the grid, the
 * pagination and the empty state. It issues its own two reads in one
 * `Promise.all`, both through `caller`: nothing a shopper does invalidates the
 * catalogue, so there is nothing to prefetch and nothing to hydrate
 * (ADR-0032).
 *
 * Only the filter bar is a client component. The grid is server markup, and
 * pagination is hrefs built from the parsed input — a server component has no
 * `useSearchParams`, and `toCatalogSearchParams` gives every link the canonical
 * spelling of the view it is on.
 *
 * The one element that knows about `data-pending` is the wrapper around the
 * grid: whichever control is navigating sets the attribute, and the page's
 * `group` carries it here, so a filter in flight dims the grid rather than
 * replacing it.
 */
export async function Catalog({
  input,
  pathname,
  categoryIds,
}: {
  input: CatalogInput;
  /**
   * The route's path, with no query: where `Limpar filtros` goes, and what
   * every pagination link is built on. The Category route passes its
   * canonical path (ADR-0043).
   */
  pathname: string;
  /** A Category page's subtree (ADR-0043); omitted on `/produtos`. */
  categoryIds?: string[];
}) {
  const [{ items, total }, brands] = await Promise.all([
    caller.products.shop.list({ ...input, categoryIds }),
    caller.brands.shop.options(),
  ]);

  const searchParams = toCatalogSearchParams(input);

  return (
    <div className="flex flex-col gap-8">
      <CatalogFilters
        filters={catalogFilters({ brands, search: input.search })}
        input={input}
        total={total}
      />

      <div className="transition-opacity duration-150 ease-out group-has-data-pending:opacity-50 motion-reduce:transition-none">
        {items.length === 0 ? (
          <CatalogEmpty
            input={input}
            pathname={pathname}
            searchParams={searchParams}
          />
        ) : (
          <div className="flex flex-col gap-16">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {items.map((product, index) => (
                <li key={product.slug}>
                  <ProductCard
                    product={product}
                    // 2 / 3 / 4 columns inside `max-w-7xl`, where 4 columns
                    // settle near 290px (DESIGN.md).
                    sizes="(min-width: 1280px) 290px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                    // The first row on a phone is two cards, and on a desktop
                    // four; either way these are the LCP candidates.
                    priority={index < 4}
                  />
                </li>
              ))}
            </ul>

            <PaginationNav
              pathname={pathname}
              searchParams={searchParams}
              paramKey={CATALOG_PARAMS.page}
              page={input.page}
              totalPages={Math.ceil(total / CATALOG_PER_PAGE)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * One line and at most one action (`docs/STOREFRONT.md`). Every exit but the
 * page's is `<Link href={pathname}>` — the whole query string is the view
 * (ADR-0041), so clearing it needs no logic and no JavaScript, and drops
 * `ordenar` with the rest: a stranded shopper is not protecting their sort.
 *
 * A page past the end gets no `PaginationNav` — it would clamp to the last page
 * and mark a page active that is not this one — so the way back is here.
 */
function CatalogEmpty({
  input,
  pathname,
  searchParams,
}: {
  input: CatalogInput;
  pathname: string;
  searchParams: URLSearchParams;
}) {
  const reason = catalogEmptyReason(input);

  return (
    <div className="flex flex-col items-start gap-6 py-16 md:py-24">
      <p className="text-xl font-medium tracking-tight break-words md:text-2xl">
        {reason === "page" && "Esta página não tem produtos."}
        {reason === "search" && `Nenhum resultado para “${input.search}”.`}
        {reason === "filters" && "Nenhum produto corresponde a estes filtros."}
        {reason === "catalogue" && "Ainda não há produtos por aqui."}
      </p>

      {reason === "page" && (
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link
              href={buildPageHref({
                pathname,
                searchParams,
                key: CATALOG_PARAMS.page,
                page: 1,
              })}
            />
          }>
          Voltar para a primeira página
        </Button>
      )}

      {(reason === "search" || reason === "filters") && (
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={pathname} />}>
          {reason === "search" ? "Ver todos os produtos" : "Limpar filtros"}
        </Button>
      )}
    </div>
  );
}
