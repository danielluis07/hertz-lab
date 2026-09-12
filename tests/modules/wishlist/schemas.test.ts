import { describe, expect, test } from "bun:test";
import {
  parseWishlistListParams,
  wishlistListParamsSchema,
  type WishlistListInput,
} from "@/modules/wishlist/schemas";

type RawParams = Record<string, string | string[] | undefined>;

const defaults: WishlistListInput = { page: 1 };

describe("parseWishlistListParams", () => {
  test("fills the first page from an empty URL", () => {
    expect(parseWishlistListParams({})).toEqual(defaults);
  });

  test("reads the Portuguese public parameter into the English input", () => {
    expect(parseWishlistListParams({ pagina: "3" })).toEqual({ page: 3 });
  });

  test("does not accept the English input key as a public parameter", () => {
    expect(parseWishlistListParams({ page: "3" })).toEqual(defaults);
  });

  test("turns malformed pages into the first page without throwing", () => {
    const malformed: RawParams[] = [
      { pagina: "abc" },
      { pagina: "0" },
      { pagina: "-1" },
      { pagina: "2.5" },
      { pagina: ["2", "3"] },
    ];

    for (const params of malformed) {
      expect(() => parseWishlistListParams(params)).not.toThrow();
      expect(parseWishlistListParams(params)).toEqual(defaults);
    }
  });

  test("strips unrelated public parameters", () => {
    expect(parseWishlistListParams({ pagina: "2", perPage: "100" })).toEqual({
      page: 2,
    });
  });

  test("is idempotent for use by the page and procedure", () => {
    const once = parseWishlistListParams({ pagina: "4" });

    expect(wishlistListParamsSchema.parse(once)).toEqual(once);
  });
});
