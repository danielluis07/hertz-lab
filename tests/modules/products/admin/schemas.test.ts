import { describe, expect, test } from "bun:test";
import {
  parseProductListParams,
  productListParamsSchema,
  type ProductListInput,
} from "@/modules/products/admin/schemas";
import { PRODUCT_SORT_DEFAULTS } from "@/modules/products/constants";

/** The shape `searchParams` actually arrives in. */
type RawParams = Record<string, string | string[] | undefined>;

const defaults: ProductListInput = {
  page: 1,
  search: undefined,
  status: undefined,
  categoryId: undefined,
  brandId: undefined,
  sortBy: "createdAt",
  sortOrder: "desc",
};

describe("parseProductListParams", () => {
  test("fills every default from an empty URL", () => {
    expect(parseProductListParams({})).toEqual(defaults);
  });

  test("cannot throw, whatever the URL says", () => {
    const hostile: RawParams[] = [
      { page: "abc" },
      { page: "-1" },
      { page: "0" },
      { page: "2.5" },
      { page: ["1", "2"] },
      { status: "deleted" },
      { status: ["draft", "active"] },
      { sortBy: "price" },
      { sortOrder: "sideways" },
      { search: ["a", "b"] },
      { search: "   " },
      { categoryId: [""] },
      { page: "abc", status: "deleted", sortBy: "price", brandId: [] },
    ];

    for (const params of hostile) {
      expect(() => parseProductListParams(params)).not.toThrow();
    }
  });

  test("turns garbage into defaults field by field", () => {
    // One bad field costs only that field: `.catch()` is per field, never on
    // the object (ADR-0014).
    expect(
      parseProductListParams({ page: "abc", status: "active", search: "fone" }),
    ).toEqual({ ...defaults, page: 1, status: "active", search: "fone" });

    expect(parseProductListParams({ page: "0" }).page).toBe(1);
    expect(parseProductListParams({ page: "-3" }).page).toBe(1);
    expect(parseProductListParams({ page: "2.5" }).page).toBe(1);
    expect(parseProductListParams({ status: "deleted" }).status).toBeUndefined();
    expect(parseProductListParams({ sortBy: "price" }).sortBy).toBe("createdAt");
    expect(parseProductListParams({ sortOrder: "up" }).sortOrder).toBe("desc");
  });

  test("coerces the values a URL actually carries", () => {
    expect(parseProductListParams({ page: "3" }).page).toBe(3);
    expect(parseProductListParams({ search: "  fone  " }).search).toBe("fone");
    // Empty means absent, so an untouched search box is the same key as no
    // search box at all.
    expect(parseProductListParams({ search: "" }).search).toBeUndefined();
    expect(parseProductListParams({ search: "   " }).search).toBeUndefined();
  });

  test("strips unknown keys", () => {
    const parsed = parseProductListParams({
      foo: "bar",
      perPage: "100000",
      page: "2",
    });

    expect(parsed).toEqual({ ...defaults, page: 2 });
    expect(parsed).not.toHaveProperty("foo");
    expect(parsed).not.toHaveProperty("perPage");
  });

  test("lets an array value fall to its default", () => {
    // `?status=draft&status=active` arrives as an array, fails the enum, and
    // lands on the catch — no preprocess needed.
    expect(parseProductListParams({ status: ["draft", "active"] })).toEqual(
      defaults,
    );
    expect(parseProductListParams({ page: ["2", "3"] }).page).toBe(1);
    expect(parseProductListParams({ search: ["fone", "cabo"] }).search)
      .toBeUndefined();
    expect(parseProductListParams({ sortBy: ["name", "createdAt"] }).sortBy)
      .toBe("createdAt");
  });

  test("gives each sortBy its own default direction", () => {
    expect(parseProductListParams({ sortBy: "name" }).sortOrder).toBe("asc");
    expect(parseProductListParams({ sortBy: "ratingAverage" }).sortOrder).toBe(
      "desc",
    );
    expect(parseProductListParams({ sortBy: "createdAt" }).sortOrder).toBe(
      "desc",
    );

    for (const [field, order] of Object.entries(PRODUCT_SORT_DEFAULTS)) {
      expect(parseProductListParams({ sortBy: field }).sortOrder).toBe(order);
    }
  });

  test("keeps an explicit direction over the field's default", () => {
    expect(
      parseProductListParams({ sortBy: "name", sortOrder: "desc" }).sortOrder,
    ).toBe("desc");
    expect(
      parseProductListParams({ sortBy: "createdAt", sortOrder: "asc" })
        .sortOrder,
    ).toBe("asc");
  });

  test("is idempotent, so one schema can parse the URL and validate the input", () => {
    const cases: RawParams[] = [
      {},
      { page: "2", search: "fone", status: "draft", sortBy: "name" },
      { page: "abc", status: "deleted", sortBy: "price" },
      { categoryId: "cat_1", brandId: "brand_1", sortOrder: "asc" },
    ];

    for (const params of cases) {
      const once = parseProductListParams(params);
      expect(productListParamsSchema.parse(once)).toEqual(once);
    }
  });
});
