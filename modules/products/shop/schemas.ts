import { z } from "zod";
import type { SortOrder } from "@/lib/utils/sort";
import {
  CATALOG_PARAMS,
  HOME_PRODUCT_LIMIT,
} from "@/modules/products/shop/constants";

/**
 * The catalogue's `?ordenar=` values, each mapped to the English order the
 * procedure applies. One parameter rather than admin's `sortBy` / `sortOrder`
 * pair, because these are a closed set a shopper picks from a control and not a
 * field × direction matrix: _relevância_ has no direction, and _menor_ / _maior
 * preço_ are one field twice (`docs/READ-PATH.md`).
 *
 * The tie-breaks each order needs to be total are the query's, not this map's.
 */
export const CATALOG_SORTS = {
  relevancia: { sortBy: "relevance", sortOrder: "desc" },
  recentes: { sortBy: "createdAt", sortOrder: "desc" },
  "menor-preco": { sortBy: "price", sortOrder: "asc" },
  "maior-preco": { sortBy: "price", sortOrder: "desc" },
  avaliados: { sortBy: "ratingAverage", sortOrder: "desc" },
  "maior-desconto": { sortBy: "discount", sortOrder: "desc" },
  "mais-vendidos": { sortBy: "unitsSold", sortOrder: "desc" },
} as const satisfies Record<string, { sortBy: string; sortOrder: SortOrder }>;

export type CatalogSort = keyof typeof CATALOG_SORTS;

export type CatalogSortBy = (typeof CATALOG_SORTS)[CatalogSort]["sortBy"];

const CATALOG_SORT_VALUES = Object.keys(CATALOG_SORTS) as [
  CatalogSort,
  ...CatalogSort[],
];

/**
 * The fields a catalogue URL can set, with the lenient per-field `.catch()`
 * ADR-0014 requires: `parse` cannot throw, garbage costs only its own field,
 * and unknown keys are stripped so they cannot perturb the input.
 *
 * English keys. ADR-0005 makes the URL Portuguese and `AGENTS.md` makes every
 * identifier English, so `CATALOG_PARAMS` below is the explicit map between
 * the two, and `parseCatalogParams` renames through it before this sees a key.
 */
const catalogParamsShape = {
  page: z.coerce.number().int().positive().catch(1),
  // Empty means absent: an untouched search box is the same input as none.
  search: z.string().trim().min(1).optional().catch(undefined),
  brandId: z.string().trim().min(1).optional().catch(undefined),
  // Cents, because `Money` is cents (`CONTEXT.md`). The URL's reais are
  // converted by `parseCatalogParams` at the rename seam, not here: this schema
  // also re-validates the parsed object as the procedure's input, and a ×100
  // inside it would compound on every parse.
  priceMin: z.coerce.number().int().nonnegative().optional().catch(undefined),
  priceMax: z.coerce.number().int().nonnegative().optional().catch(undefined),
  // Only the literal public value `1` enables it; `true` is that value parsed,
  // so the schema reads its own output back unchanged.
  promotion: z
    .union([z.literal("1"), z.literal(true)])
    .transform(() => true as const)
    .optional()
    .catch(undefined),
  sort: z.enum(CATALOG_SORT_VALUES).optional().catch(undefined),
};

/**
 * The default sort is a function of the search: _relevância_ when there is one,
 * _recentes_ otherwise.
 */
function defaultSort(search: string | undefined): CatalogSort {
  return search ? "relevancia" : "recentes";
}

/**
 * Fills the default sort in — and a _relevância_ left standing after the search
 * was cleared falls back the same way. Resolving it here makes it a property of
 * the parsed object, so no caller computes a divergent one (ADR-0011).
 *
 * Idempotent: a resolved sort parses back to itself.
 */
function resolveSort<TParams extends { search?: string; sort?: CatalogSort }>({
  sort,
  ...params
}: TParams): Omit<TParams, "sort"> & { sort: CatalogSort } {
  const fallback = defaultSort(params.search);

  return {
    ...params,
    sort:
      sort === undefined || (sort === "relevancia" && !params.search)
        ? fallback
        : sort,
  };
}

/**
 * The catalogue's list input: one lenient schema that parses the URL and
 * validates the procedure's input (ADR-0014). A second schema rather than a
 * reuse of `productListParamsSchema` — "paginated, and includes `draft` and
 * `archived`" is a sentence only the admin can say, and the shop's price range
 * has no admin counterpart.
 *
 * `preco_min > preco_max` gets no cross-field refinement: a range selecting
 * nothing is a view selecting nothing, and empty-states (ADR-0041).
 */
export const catalogParamsSchema = z
  .object(catalogParamsShape)
  .transform(resolveSort);

export type CatalogInput = z.infer<typeof catalogParamsSchema>;

/**
 * `products.shop.list`'s input: the URL's fields, plus the Category subtree a
 * Category page narrows to (ADR-0043). Omitted on `/produtos`.
 *
 * `categoryIds` is not a URL parameter — the path yields it — so it has no
 * `CATALOG_PARAMS` entry and, alone here, no `.catch()`: falling back to
 * "absent" would widen a Category page to the whole catalogue, which is a
 * wrong answer rather than a lenient one. It is **sorted**, so two orderings
 * of one subtree are one input; a copy is sorted, never the caller's array.
 */
export const catalogListInputSchema = z
  .object({
    ...catalogParamsShape,
    categoryIds: z
      .array(z.string().min(1))
      .transform((ids) => [...ids].sort())
      .optional(),
  })
  .transform(resolveSort);

export type CatalogListInput = z.infer<typeof catalogListInputSchema>;

/**
 * A later home preview may exclude at most the four Product ids contributed
 * by every section before it. Empty arrays are deliberately valid.
 */
function previewExclusionInput(sectionsBefore: number) {
  return z.object({
    excludeProductIds: z
      .array(z.string().min(1))
      .max(HOME_PRODUCT_LIMIT * sectionsBefore),
  });
}

export const bestSellersInputSchema = previewExclusionInput(1);
export const newestInputSchema = previewExclusionInput(2);
export const topRatedInputSchema = previewExclusionInput(3);

/**
 * Whole reais with up to two centavo digits after either separator — what a
 * shopper types into a price box. Three digits after a separator is refused
 * rather than read: `1.000` is a thousand reais to a Brazilian and one real to
 * a parser, and guessing wrong filters by a factor of a thousand.
 */
const REAIS = /^(\d+)(?:[.,](\d{1,2}))?$/;

/**
 * A price bound as the URL spells it, in cents — or `undefined` when it is not
 * an amount of reais at all. Integer arithmetic, so `0,29` is 29 cents and not
 * whatever `0.29 * 100` rounds to.
 */
function reaisToCents(value: string | string[] | undefined): number | undefined {
  const match = typeof value === "string" ? REAIS.exec(value) : null;
  if (!match) return undefined;

  const [, reais, centavos = ""] = match;
  return Number(reais) * 100 + Number(centavos.padEnd(2, "0"));
}

/**
 * The page's one normalisation (ADR-0011), and the seam between the URL's
 * vocabulary and the input's: it renames the Portuguese parameters to the
 * schema's English keys and turns the price range's reais into cents, then
 * parses. Only mapped names are read, so an English `?page=` on the shop is an
 * unknown parameter and not a second spelling of `?pagina=`.
 */
export function parseCatalogParams(
  searchParams: Record<string, string | string[] | undefined>,
): CatalogInput {
  const renamed: Record<string, unknown> = Object.fromEntries(
    Object.entries(CATALOG_PARAMS).map(([key, param]) => [
      key,
      searchParams[param],
    ]),
  );

  return catalogParamsSchema.parse({
    ...renamed,
    priceMin: reaisToCents(searchParams[CATALOG_PARAMS.priceMin]),
    priceMax: reaisToCents(searchParams[CATALOG_PARAMS.priceMax]),
  });
}

/**
 * Cents as the price box spells them: whole reais bare, centavos after a comma.
 * No thousands separator, which `REAIS` would refuse.
 */
function centsToReais(cents: number): string {
  const reais = Math.trunc(cents / 100);
  const centavos = cents % 100;

  return centavos === 0
    ? String(reais)
    : `${reais},${String(centavos).padStart(2, "0")}`;
}

/**
 * `parseCatalogParams` run backwards: the query string a parsed input spells.
 * What the catalogue's server-rendered links are built on — `PaginationNav`
 * and the way back to the first page — since a server component has the parsed
 * input and not the browser's `URLSearchParams`.
 *
 * Canonical rather than faithful: a default is omitted, so the unfiltered
 * catalogue is a bare path and a paged link to a view shares the view's URL,
 * and whatever the schema dropped from the URL stays dropped.
 */
export function toCatalogSearchParams(input: CatalogInput): URLSearchParams {
  const params = new URLSearchParams();

  if (input.search) params.set(CATALOG_PARAMS.search, input.search);
  if (input.brandId) params.set(CATALOG_PARAMS.brandId, input.brandId);
  if (input.priceMin !== undefined) {
    params.set(CATALOG_PARAMS.priceMin, centsToReais(input.priceMin));
  }
  if (input.priceMax !== undefined) {
    params.set(CATALOG_PARAMS.priceMax, centsToReais(input.priceMax));
  }
  if (input.promotion) params.set(CATALOG_PARAMS.promotion, "1");
  if (input.sort !== defaultSort(input.search)) {
    params.set(CATALOG_PARAMS.sort, input.sort);
  }
  if (input.page > 1) params.set(CATALOG_PARAMS.page, String(input.page));

  return params;
}
