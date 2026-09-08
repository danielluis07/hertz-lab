import { describe, expect, test } from "bun:test";
import {
  brandListParamsSchema,
  parseBrandListParams,
  type BrandListInput,
} from "@/modules/brands/admin/schemas";

/** The shape `searchParams` actually arrives in. */
type RawParams = Record<string, string | string[] | undefined>;

const defaults: BrandListInput = {
  sortBy: "name",
  sortOrder: "asc",
};

describe("parseBrandListParams", () => {
  test("fills every default from an empty URL", () => {
    expect(parseBrandListParams({})).toEqual(defaults);
  });

  test("cannot throw, whatever the URL says", () => {
    const hostile: RawParams[] = [
      { sortBy: "colour" },
      { sortBy: "" },
      { sortBy: ["name", "productCount"] },
      { sortOrder: "sideways" },
      { sortOrder: [] },
      { sortBy: "slug", sortOrder: "up" },
      // The parameters this list deliberately does not have: stripped, not
      // refused.
      { page: "2", search: "sony", categoryId: "cat_1" },
    ];

    for (const params of hostile) {
      expect(() => parseBrandListParams(params)).not.toThrow();
    }
  });

  test("turns garbage into defaults field by field", () => {
    // One bad field costs only that field: `.catch()` is per field, never on
    // the object (ADR-0014).
    expect(
      parseBrandListParams({ sortBy: "colour", sortOrder: "desc" }),
    ).toEqual({ sortBy: "name", sortOrder: "desc" });

    expect(parseBrandListParams({ sortBy: "colour" }).sortBy).toBe("name");
    expect(
      parseBrandListParams({ sortBy: "productCount", sortOrder: "up" })
        .sortOrder,
    ).toBe("desc");
  });

  test("strips unknown keys", () => {
    // There is no pagination, no search and no filter on this list, so the
    // parameters that carry them cannot reach the input or the query key.
    const parsed = parseBrandListParams({
      page: "2",
      search: "sony",
      perPage: "100000",
      foo: "bar",
      sortBy: "productCount",
    });

    expect(parsed).toEqual({ sortBy: "productCount", sortOrder: "desc" });
    expect(parsed).not.toHaveProperty("page");
    expect(parsed).not.toHaveProperty("search");
    expect(parsed).not.toHaveProperty("perPage");
    expect(parsed).not.toHaveProperty("foo");
  });

  test("lets an array value fall to its default", () => {
    // `?sortBy=name&sortBy=productCount` arrives as an array, fails the enum,
    // and lands on the catch — no preprocess needed.
    expect(parseBrandListParams({ sortBy: ["name", "productCount"] })).toEqual(
      defaults,
    );
    expect(
      parseBrandListParams({
        sortBy: "productCount",
        sortOrder: ["asc", "desc"],
      }).sortOrder,
    ).toBe("desc");
  });

  /**
   * Written out longhand rather than looped over `BRAND_SORT_DEFAULTS`: a loop
   * over the table would pass whatever the table said, and the claim is that
   * clicking "Nome" gives A-Z while clicking "Produtos" gives the manufacturer
   * that carries the catalogue first.
   */
  test("gives each sortBy its own default direction", () => {
    expect(parseBrandListParams({ sortBy: "name" }).sortOrder).toBe("asc");
    expect(parseBrandListParams({ sortBy: "productCount" }).sortOrder).toBe(
      "desc",
    );
  });

  test("keeps an explicit direction over the field's default", () => {
    expect(
      parseBrandListParams({ sortBy: "name", sortOrder: "desc" }).sortOrder,
    ).toBe("desc");
    expect(
      parseBrandListParams({ sortBy: "productCount", sortOrder: "asc" })
        .sortOrder,
    ).toBe("asc");
  });

  test("is idempotent, so one schema can parse the URL and validate the input", () => {
    const cases: RawParams[] = [
      {},
      { sortBy: "name" },
      { sortBy: "name", sortOrder: "desc" },
      { sortBy: "productCount" },
      { sortBy: "colour", sortOrder: "sideways" },
    ];

    for (const params of cases) {
      const once = parseBrandListParams(params);
      expect(brandListParamsSchema.parse(once)).toEqual(once);
    }
  });
});
