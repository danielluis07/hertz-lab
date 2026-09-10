import type { FilterSpec } from "@/components/filter-bar";
import type {
  CatalogInput,
  CatalogSort,
} from "@/modules/products/shop/schemas";
import type { RouterOutput } from "@/trpc/routers/_app";

/** Each `?ordenar=` value as a shopper reads it, in the order it is offered. */
const SORT_LABELS = {
  relevancia: "Relevância",
  recentes: "Mais recentes",
  "menor-preco": "Menor preço",
  "maior-preco": "Maior preço",
  avaliados: "Melhor avaliados",
  "maior-desconto": "Maior desconto",
  "mais-vendidos": "Mais vendidos",
} as const satisfies Record<CatalogSort, string>;

/**
 * The catalogue's filter spec: what a shopper can narrow and order the grid
 * by, and the pt-BR copy for each control. The controls are shared with the
 * admin (ADR-0044); the declaration is typed against the catalogue's input, so
 * a filter naming a key `catalogParamsSchema` does not declare fails to
 * compile.
 *
 * A **function** for admin's reason: the Marca options are rows, read per
 * request by `<Catalog>`. And for one of its own — _relevância_ is offered only
 * when there is a search to be relevant to, which is the same condition the
 * schema resolves the default sort on, so the control can never show a sort
 * the parsed input has already discarded.
 *
 * There is **no Categoria filter** (`docs/STOREFRONT.md`): on `/produtos` the
 * tree is the header's job, and on a Category page it would contradict the
 * path. There is no search box either — search is the header's, and the
 * catalogue is where its results land.
 */
export function catalogFilters({
  brands,
  search,
}: {
  brands: RouterOutput["brands"]["shop"]["options"];
  search: string | undefined;
}): readonly FilterSpec<CatalogInput>[] {
  const sorts = (Object.keys(SORT_LABELS) as CatalogSort[]).filter(
    (sort) => sort !== "relevancia" || search,
  );

  return [
    {
      kind: "select",
      key: "brandId",
      label: "Marca",
      allLabel: "Todas as marcas",
      options: brands.map((brand) => ({ value: brand.id, label: brand.name })),
    },
    {
      kind: "range",
      minKey: "priceMin",
      maxKey: "priceMax",
      label: "Preço",
      minLabel: "Mínimo",
      maxLabel: "Máximo",
      unit: "R$",
    },
    {
      kind: "select",
      key: "sort",
      label: "Ordenar",
      options: sorts.map((sort) => ({ value: sort, label: SORT_LABELS[sort] })),
    },
  ];
}

/**
 * How many of the `Filtrar` Sheet's controls are narrowing the grid — the
 * number its trigger carries, so a shopper who closed the Sheet can still see
 * that the grid is filtered. The range counts once, whichever bound is set.
 *
 * Search, sort and page are not counted: none of them is in the Sheet.
 */
export function activeFilterCount(input: CatalogInput): number {
  const brand = input.brandId !== undefined;
  const price = input.priceMin !== undefined || input.priceMax !== undefined;

  return Number(brand) + Number(price);
}

/**
 * Why a catalogue page came back empty, which decides what the empty state
 * says and offers. Checked in this order because each explains the ones below
 * it away: a page past the end is empty whatever the view, and a search that
 * found nothing is the thing to say even when a filter also stands.
 *
 * `filters` includes _promoção_, which has no control in the bar and still
 * narrows — `Limpar filtros` is the way out of it.
 */
export type CatalogEmptyReason = "page" | "search" | "filters" | "catalogue";

export function catalogEmptyReason(input: CatalogInput): CatalogEmptyReason {
  if (input.page > 1) return "page";
  if (input.search) return "search";
  if (activeFilterCount(input) > 0 || input.promotion) return "filters";
  return "catalogue";
}
