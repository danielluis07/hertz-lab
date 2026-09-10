import { describe, expect, test } from "bun:test";
import {
  activeFilterCount,
  catalogEmptyReason,
  catalogFilters,
} from "@/modules/products/shop/filters";
import {
  parseCatalogParams,
  type CatalogInput,
} from "@/modules/products/shop/schemas";

const defaults: CatalogInput = parseCatalogParams({});

const brands = [
  { id: "brand_a", name: "Áudio Técnica" },
  { id: "brand_b", name: "Sony" },
];

/** The spec entry for one input key. */
const specFor = (search: string | undefined, key: string) =>
  catalogFilters({ brands, search }).find(
    (filter) =>
      (filter.kind === "range" ? filter.minKey : filter.key) === key,
  );

const sortValues = (search: string | undefined) => {
  const sort = specFor(search, "sort");
  if (sort?.kind !== "select") throw new Error("no sort select");
  return sort.options.map((option) => option.value);
};

describe("catalogFilters", () => {
  test("offers every Brand it is given, in the order it is given", () => {
    const brand = specFor(undefined, "brandId");

    expect(brand?.kind).toBe("select");
    if (brand?.kind !== "select") return;
    expect(brand.options).toEqual([
      { value: "brand_a", label: "Áudio Técnica" },
      { value: "brand_b", label: "Sony" },
    ]);
    // A Brand filter can be cleared.
    expect(brand.allLabel).toBeDefined();
  });

  test("declares the price range as one control over both bounds", () => {
    const price = specFor(undefined, "priceMin");

    expect(price?.kind).toBe("range");
    if (price?.kind !== "range") return;
    expect(price.maxKey).toBe("priceMax");
  });

  test("offers relevância only when there is a search", () => {
    expect(sortValues(undefined)).not.toContain("relevancia");
    expect(sortValues("fone")).toContain("relevancia");
  });

  test("offers every other sort with or without a search", () => {
    const rest = [
      "recentes",
      "menor-preco",
      "maior-preco",
      "avaliados",
      "maior-desconto",
      "mais-vendidos",
    ];

    expect(sortValues(undefined)).toEqual(rest);
    expect(sortValues("fone")).toEqual(["relevancia", ...rest]);
  });

  test("gives the sort no 'all' option, because every sort is an order", () => {
    const sort = specFor(undefined, "sort");

    expect(sort?.kind === "select" && sort.allLabel).toBeFalsy();
  });

  test("offers no Categoria filter", () => {
    expect(specFor(undefined, "categoryIds")).toBeUndefined();
  });
});

describe("activeFilterCount", () => {
  test("is zero for the unfiltered catalogue", () => {
    expect(activeFilterCount(defaults)).toBe(0);
  });

  test("counts only what the Filtrar Sheet holds", () => {
    // Search is the header's, sort sits outside the Sheet, and the page is a
    // position rather than a narrowing.
    expect(
      activeFilterCount({
        ...defaults,
        search: "fone",
        sort: "menor-preco",
        page: 4,
      }),
    ).toBe(0);
  });

  test("counts the Brand", () => {
    expect(activeFilterCount({ ...defaults, brandId: "brand_a" })).toBe(1);
  });

  test("counts the price range once, whichever bounds are set", () => {
    expect(activeFilterCount({ ...defaults, priceMin: 100 })).toBe(1);
    expect(activeFilterCount({ ...defaults, priceMax: 100 })).toBe(1);
    expect(activeFilterCount({ ...defaults, priceMin: 0, priceMax: 100 })).toBe(
      1,
    );
  });

  test("adds the Brand and the range together", () => {
    expect(
      activeFilterCount({ ...defaults, brandId: "brand_a", priceMax: 100 }),
    ).toBe(2);
  });
});

describe("catalogEmptyReason", () => {
  test("is the page when a page past the first came back empty", () => {
    // Page 1 of the same view may well have results, so neither the search
    // nor the filters are to blame (ADR-0041).
    expect(catalogEmptyReason({ ...defaults, page: 999 })).toBe("page");
    expect(
      catalogEmptyReason({
        ...defaults,
        page: 2,
        search: "fone",
        brandId: "brand_a",
      }),
    ).toBe("page");
  });

  test("is the search when there is one", () => {
    expect(catalogEmptyReason({ ...defaults, search: "fone" })).toBe("search");
    expect(
      catalogEmptyReason({ ...defaults, search: "fone", priceMin: 100 }),
    ).toBe("search");
  });

  test("is the filters when anything narrows the view", () => {
    expect(catalogEmptyReason({ ...defaults, brandId: "brand_a" })).toBe(
      "filters",
    );
    expect(catalogEmptyReason({ ...defaults, priceMax: 0 })).toBe("filters");
    // Promoção has no control, and still narrows: clearing it is the way out.
    expect(catalogEmptyReason({ ...defaults, promotion: true })).toBe(
      "filters",
    );
  });

  test("is the catalogue itself when nothing narrows it", () => {
    expect(catalogEmptyReason(defaults)).toBe("catalogue");
    // A sort orders the catalogue; it cannot empty it.
    expect(catalogEmptyReason({ ...defaults, sort: "menor-preco" })).toBe(
      "catalogue",
    );
  });
});
