import { describe, expect, test } from "bun:test";
import {
  CATALOG_SORTS,
  bestSellersInputSchema,
  catalogListInputSchema,
  catalogParamsSchema,
  newestInputSchema,
  parseCatalogParams,
  topRatedInputSchema,
  toCatalogSearchParams,
  type CatalogInput,
} from "@/modules/products/shop/schemas";

/** The shape `searchParams` actually arrives in. */
type RawParams = Record<string, string | string[] | undefined>;

const defaults: CatalogInput = {
  page: 1,
  search: undefined,
  brandId: undefined,
  priceMin: undefined,
  priceMax: undefined,
  promotion: undefined,
  sort: "recentes",
};

describe("parseCatalogParams", () => {
  test("fills every default from an empty URL", () => {
    expect(parseCatalogParams({})).toEqual(defaults);
  });

  test("reads the Portuguese parameter names into English keys", () => {
    expect(
      parseCatalogParams({
        busca: "fone",
        marca: "brand_1",
        ordenar: "menor-preco",
        pagina: "2",
      }),
    ).toEqual({
      ...defaults,
      search: "fone",
      brandId: "brand_1",
      sort: "menor-preco",
      page: 2,
    });
  });

  test("ignores the English keys, which are not the URL's vocabulary", () => {
    // ADR-0005: a public URL is Portuguese. `?page=2` on the shop is an
    // unknown parameter, not a second spelling of `?pagina=2`.
    expect(
      parseCatalogParams({ search: "fone", page: "2", sort: "menor-preco" }),
    ).toEqual(defaults);
  });

  test("cannot throw, whatever the URL says", () => {
    const hostile: RawParams[] = [
      { pagina: "abc" },
      { pagina: "0" },
      { pagina: "-1" },
      { pagina: ["1", "2"] },
      { busca: ["a", "b"] },
      { busca: "   " },
      { marca: [""] },
      { ordenar: "preco" },
      { ordenar: ["recentes", "avaliados"] },
      { preco_min: "abc", preco_max: ["1", "2"] },
      { promocao: "sim" },
      { pagina: "abc", ordenar: "x", marca: [], preco_min: "-5" },
    ];

    for (const params of hostile) {
      expect(() => parseCatalogParams(params)).not.toThrow();
    }
  });

  test("turns garbage into defaults field by field", () => {
    expect(
      parseCatalogParams({ pagina: "abc", busca: "fone", marca: "brand_1" }),
    ).toEqual({
      ...defaults,
      search: "fone",
      brandId: "brand_1",
      sort: "relevancia",
    });

    expect(parseCatalogParams({ pagina: "0" }).page).toBe(1);
    expect(parseCatalogParams({ pagina: "2.5" }).page).toBe(1);
    expect(parseCatalogParams({ ordenar: "preco" }).sort).toBe("recentes");
    expect(parseCatalogParams({ pagina: ["2", "3"] }).page).toBe(1);
  });

  test("treats an empty or blank search as absent", () => {
    expect(parseCatalogParams({ busca: "  fone  " }).search).toBe("fone");
    expect(parseCatalogParams({ busca: "" })).toEqual(defaults);
    expect(parseCatalogParams({ busca: "   " })).toEqual(defaults);
  });

  test("strips unknown keys", () => {
    const parsed = parseCatalogParams({ foo: "bar", pagina: "2" });

    expect(parsed).toEqual({ ...defaults, page: 2 });
    expect(parsed).not.toHaveProperty("foo");
  });

  test("lets `?pagina=999` through, unclamped", () => {
    // A page past the end is a view selecting nothing (ADR-0041), and the
    // schema has no total to clamp against.
    expect(parseCatalogParams({ pagina: "999" }).page).toBe(999);
  });
});

describe("the default sort", () => {
  test("is relevância when there is a search", () => {
    expect(parseCatalogParams({ busca: "fone" }).sort).toBe("relevancia");
  });

  test("is recentes when there is none", () => {
    expect(parseCatalogParams({}).sort).toBe("recentes");
  });

  test("falls relevância back to recentes when there is nothing to be relevant to", () => {
    expect(parseCatalogParams({ ordenar: "relevancia" }).sort).toBe("recentes");
    expect(parseCatalogParams({ ordenar: "relevancia", busca: "  " }).sort).toBe(
      "recentes",
    );
  });

  test("keeps a chosen sort, with or without a search", () => {
    expect(parseCatalogParams({ ordenar: "maior-preco" }).sort).toBe(
      "maior-preco",
    );
    expect(
      parseCatalogParams({ ordenar: "avaliados", busca: "fone" }).sort,
    ).toBe("avaliados");
    expect(
      parseCatalogParams({ ordenar: "relevancia", busca: "fone" }).sort,
    ).toBe("relevancia");
  });

  test("falls a garbage sort back to the same default an absent one gets", () => {
    expect(parseCatalogParams({ ordenar: "x", busca: "fone" }).sort).toBe(
      "relevancia",
    );
    expect(parseCatalogParams({ ordenar: "x" }).sort).toBe("recentes");
  });
});

describe("CATALOG_SORTS", () => {
  test("offers exactly the seven public values", () => {
    expect(Object.keys(CATALOG_SORTS).sort()).toEqual([
      "avaliados",
      "maior-desconto",
      "maior-preco",
      "mais-vendidos",
      "menor-preco",
      "recentes",
      "relevancia",
    ]);
  });

  test("maps each public value to the order the catalogue promises", () => {
    expect(CATALOG_SORTS).toEqual({
      relevancia: { sortBy: "relevance", sortOrder: "desc" },
      recentes: { sortBy: "createdAt", sortOrder: "desc" },
      "menor-preco": { sortBy: "price", sortOrder: "asc" },
      "maior-preco": { sortBy: "price", sortOrder: "desc" },
      avaliados: { sortBy: "ratingAverage", sortOrder: "desc" },
      "maior-desconto": { sortBy: "discount", sortOrder: "desc" },
      "mais-vendidos": { sortBy: "unitsSold", sortOrder: "desc" },
    });
  });

  test("every value but relevância parses to itself without a search", () => {
    for (const sort of Object.keys(CATALOG_SORTS)) {
      if (sort === "relevancia") continue;
      expect(parseCatalogParams({ ordenar: sort }).sort).toBe(
        sort as CatalogInput["sort"],
      );
    }
  });
});

describe("the price range", () => {
  test("is reais in the URL and cents after the seam", () => {
    const parsed = parseCatalogParams({ preco_min: "100", preco_max: "500" });

    expect(parsed.priceMin).toBe(10_000);
    expect(parsed.priceMax).toBe(50_000);
  });

  test("reads centavos after either decimal separator", () => {
    expect(parseCatalogParams({ preco_min: "99,90" }).priceMin).toBe(9990);
    expect(parseCatalogParams({ preco_min: "99.9" }).priceMin).toBe(9990);
    expect(parseCatalogParams({ preco_min: "0,05" }).priceMin).toBe(5);
  });

  test("admits zero as a bound", () => {
    expect(parseCatalogParams({ preco_min: "0" }).priceMin).toBe(0);
  });

  test("drops a bound that is not an amount of reais", () => {
    for (const value of ["abc", "-5", "", " ", "1e3", "R$ 10", ["1", "2"]]) {
      expect(parseCatalogParams({ preco_min: value }).priceMin).toBeUndefined();
    }
  });

  test("drops a bound with three decimals rather than guess at a thousands separator", () => {
    // `1.000` is one thousand reais to a Brazilian and one real to a parser.
    expect(parseCatalogParams({ preco_min: "1.000" }).priceMin).toBeUndefined();
  });

  test("costs only the bound that was malformed", () => {
    expect(
      parseCatalogParams({ preco_min: "abc", preco_max: "200" }),
    ).toEqual({ ...defaults, priceMax: 20_000 });
  });

  test("keeps a contradictory range as it is, a view that selects nothing", () => {
    const parsed = parseCatalogParams({ preco_min: "500", preco_max: "100" });

    expect(parsed.priceMin).toBe(50_000);
    expect(parsed.priceMax).toBe(10_000);
  });
});

describe("the promotion filter", () => {
  test("is enabled by the literal 1", () => {
    expect(parseCatalogParams({ promocao: "1" }).promotion).toBe(true);
  });

  test("parses every other value as absent", () => {
    for (const value of ["0", "true", "sim", "", "01", ["1", "1"]]) {
      expect(parseCatalogParams({ promocao: value })).toEqual(defaults);
    }
  });

  test("combines with maior-desconto, the home section's full view", () => {
    expect(
      parseCatalogParams({ promocao: "1", ordenar: "maior-desconto" }),
    ).toEqual({ ...defaults, promotion: true, sort: "maior-desconto" });
  });
});

describe("catalogParamsSchema", () => {
  test("is idempotent, so one schema parses the URL and validates the input", () => {
    // The price range is the case that would break this: a reais-to-cents
    // conversion inside the schema would multiply by 100 on every parse.
    const cases: RawParams[] = [
      {},
      { busca: "fone", pagina: "2" },
      { ordenar: "relevancia" },
      { preco_min: "99,90", preco_max: "500", promocao: "1", ordenar: "maior-desconto" },
      { marca: "brand_1", ordenar: "mais-vendidos" },
      { pagina: "abc", preco_min: "abc", promocao: "sim", ordenar: "x" },
    ];

    for (const params of cases) {
      const once = parseCatalogParams(params);
      expect(catalogParamsSchema.parse(once)).toEqual(once);
    }
  });
});

describe("toCatalogSearchParams", () => {
  /** The URL a parsed input spells, read back the way the page reads it. */
  const reparse = (input: CatalogInput) =>
    parseCatalogParams(Object.fromEntries(toCatalogSearchParams(input)));

  test("spells the unfiltered catalogue as no query at all", () => {
    expect(toCatalogSearchParams(defaults).toString()).toBe("");
  });

  test("writes every field under its Portuguese parameter name", () => {
    const params = toCatalogSearchParams({
      ...defaults,
      search: "fone",
      brandId: "brand_1",
      promotion: true,
      sort: "menor-preco",
      page: 3,
    });

    expect(Object.fromEntries(params)).toEqual({
      busca: "fone",
      marca: "brand_1",
      promocao: "1",
      ordenar: "menor-preco",
      pagina: "3",
    });
  });

  test("writes the price range back in reais, as a shopper types them", () => {
    const params = (priceMin: number) =>
      toCatalogSearchParams({ ...defaults, priceMin }).get("preco_min");

    expect(params(10_000)).toBe("100");
    expect(params(9990)).toBe("99,90");
    expect(params(5)).toBe("0,05");
    expect(params(0)).toBe("0");
    expect(
      toCatalogSearchParams({ ...defaults, priceMax: 123_456 }).get("preco_max"),
    ).toBe("1234,56");
  });

  test("omits the sort when it is the default for the search", () => {
    // The first page and a paged link must share one URL per view.
    expect(toCatalogSearchParams(defaults).has("ordenar")).toBe(false);
    expect(
      toCatalogSearchParams({ ...defaults, search: "fone", sort: "relevancia" })
        .has("ordenar"),
    ).toBe(false);
  });

  test("keeps a sort that differs from the search's default", () => {
    expect(
      toCatalogSearchParams({ ...defaults, search: "fone", sort: "recentes" }).get(
        "ordenar",
      ),
    ).toBe("recentes");
  });

  test("omits the first page", () => {
    expect(toCatalogSearchParams({ ...defaults, page: 1 }).has("pagina")).toBe(
      false,
    );
  });

  test("round-trips through parseCatalogParams", () => {
    const cases: RawParams[] = [
      {},
      { busca: "fone de ouvido", pagina: "2" },
      { busca: "fone", ordenar: "recentes" },
      { preco_min: "99,9", preco_max: "0,05", promocao: "1" },
      { preco_min: "500", preco_max: "100" },
      { marca: "brand_1", ordenar: "mais-vendidos", pagina: "999" },
      { ordenar: "relevancia", pagina: "abc", preco_min: "1.000" },
    ];

    for (const raw of cases) {
      const input = parseCatalogParams(raw);
      expect(reparse(input)).toEqual(input);
    }
  });
});

describe("catalogListInputSchema", () => {
  test("passes the parsed catalogue input through when no Category narrows it", () => {
    const input = parseCatalogParams({ busca: "fone", preco_min: "100" });

    expect(catalogListInputSchema.parse(input)).toEqual(input);
  });

  test("sorts the Category ids, so one subtree is one input", () => {
    const input = parseCatalogParams({});

    const one = catalogListInputSchema.parse({
      ...input,
      categoryIds: ["cat_c", "cat_a", "cat_b"],
    });
    const other = catalogListInputSchema.parse({
      ...input,
      categoryIds: ["cat_b", "cat_c", "cat_a"],
    });

    expect(one.categoryIds).toEqual(["cat_a", "cat_b", "cat_c"]);
    expect(other).toEqual(one);
  });

  test("does not reorder the caller's array", () => {
    const categoryIds = ["cat_b", "cat_a"];

    catalogListInputSchema.parse({ ...parseCatalogParams({}), categoryIds });

    expect(categoryIds).toEqual(["cat_b", "cat_a"]);
  });

  test("resolves the sort the same way the URL schema does", () => {
    expect(
      catalogListInputSchema.parse({ sort: "relevancia", categoryIds: ["c"] })
        .sort,
    ).toBe("recentes");
  });

  test("is idempotent with Category ids", () => {
    const once = catalogListInputSchema.parse({
      ...parseCatalogParams({ busca: "fone", preco_max: "300" }),
      categoryIds: ["cat_b", "cat_a"],
    });

    expect(catalogListInputSchema.parse(once)).toEqual(once);
  });
});

describe("home Product preview exclusion inputs", () => {
  const productIds = Array.from({ length: 13 }, (_, index) => `product_${index}`);

  test.each([
    ["best sellers", bestSellersInputSchema, 4],
    ["newest", newestInputSchema, 8],
    ["top rated", topRatedInputSchema, 12],
  ])("bounds %s by the ids earlier previews can contribute", (_, schema, limit) => {
    expect(schema.safeParse({ excludeProductIds: [] }).success).toBe(true);
    expect(
      schema.safeParse({ excludeProductIds: productIds.slice(0, limit) }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ excludeProductIds: productIds.slice(0, limit + 1) })
        .success,
    ).toBe(false);
  });
});
