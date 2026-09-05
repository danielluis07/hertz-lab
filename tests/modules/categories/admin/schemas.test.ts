import { describe, expect, test } from "bun:test";
import {
  categoryListParamsSchema,
  parseCategoryListParams,
  type CategoryListInput,
} from "@/modules/categories/admin/schemas";

/** The shape `searchParams` actually arrives in. */
type RawParams = Record<string, string | string[] | undefined>;

const defaults: CategoryListInput = {
  sortBy: "name",
  sortOrder: "asc",
};

describe("parseCategoryListParams", () => {
  test("fills every default from an empty URL", () => {
    expect(parseCategoryListParams({})).toEqual(defaults);
  });

  test("cannot throw, whatever the URL says", () => {
    const hostile: RawParams[] = [
      { sortBy: "position" },
      { sortBy: "" },
      { sortBy: ["name", "productCount"] },
      { sortOrder: "sideways" },
      { sortOrder: [] },
      { sortBy: "price", sortOrder: "up" },
      // The parameters this list deliberately does not have (#56): stripped,
      // not refused.
      { page: "2", search: "fone", parentId: "cat_1" },
    ];

    for (const params of hostile) {
      expect(() => parseCategoryListParams(params)).not.toThrow();
    }
  });

  test("turns garbage into defaults field by field", () => {
    // One bad field costs only that field: `.catch()` is per field, never on
    // the object (ADR-0014).
    expect(
      parseCategoryListParams({ sortBy: "position", sortOrder: "desc" }),
    ).toEqual({ sortBy: "name", sortOrder: "desc" });

    expect(parseCategoryListParams({ sortBy: "position" }).sortBy).toBe("name");
    expect(
      parseCategoryListParams({ sortBy: "productCount", sortOrder: "up" })
        .sortOrder,
    ).toBe("desc");
  });

  test("strips unknown keys", () => {
    // There is no pagination, no search and no filter on this list, so the
    // parameters that carry them cannot reach the input or the query key.
    const parsed = parseCategoryListParams({
      page: "2",
      search: "fone",
      perPage: "100000",
      foo: "bar",
      sortBy: "parentName",
    });

    expect(parsed).toEqual({ sortBy: "parentName", sortOrder: "asc" });
    expect(parsed).not.toHaveProperty("page");
    expect(parsed).not.toHaveProperty("search");
    expect(parsed).not.toHaveProperty("perPage");
    expect(parsed).not.toHaveProperty("foo");
  });

  test("lets an array value fall to its default", () => {
    // `?sortBy=name&sortBy=productCount` arrives as an array, fails the enum,
    // and lands on the catch — no preprocess needed.
    expect(
      parseCategoryListParams({ sortBy: ["name", "productCount"] }),
    ).toEqual(defaults);
    expect(
      parseCategoryListParams({
        sortBy: "productCount",
        sortOrder: ["asc", "desc"],
      }).sortOrder,
    ).toBe("desc");
  });

  /**
   * Written out longhand rather than looped over `CATEGORY_SORT_DEFAULTS`: a
   * loop over the table would pass whatever the table said, and the claim is
   * that clicking "Nome" gives A-Z while clicking "Produtos" gives the fullest
   * section first.
   */
  test("gives each sortBy its own default direction", () => {
    expect(parseCategoryListParams({ sortBy: "name" }).sortOrder).toBe("asc");
    expect(parseCategoryListParams({ sortBy: "parentName" }).sortOrder).toBe(
      "asc",
    );
    expect(parseCategoryListParams({ sortBy: "productCount" }).sortOrder).toBe(
      "desc",
    );
  });

  test("keeps an explicit direction over the field's default", () => {
    expect(
      parseCategoryListParams({ sortBy: "name", sortOrder: "desc" }).sortOrder,
    ).toBe("desc");
    expect(
      parseCategoryListParams({ sortBy: "productCount", sortOrder: "asc" })
        .sortOrder,
    ).toBe("asc");
  });

  test("is idempotent, so one schema can parse the URL and validate the input", () => {
    const cases: RawParams[] = [
      {},
      { sortBy: "name" },
      { sortBy: "parentName", sortOrder: "desc" },
      { sortBy: "productCount" },
      { sortBy: "position", sortOrder: "sideways" },
    ];

    for (const params of cases) {
      const once = parseCategoryListParams(params);
      expect(categoryListParamsSchema.parse(once)).toEqual(once);
    }
  });
});
