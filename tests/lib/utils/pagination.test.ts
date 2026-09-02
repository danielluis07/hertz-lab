import { describe, expect, test } from "bun:test";
import { buildPageHref, buildPageRange } from "@/lib/utils/pagination";

describe("buildPageRange", () => {
  test("lists every page when they all fit", () => {
    expect(buildPageRange({ page: 2, totalPages: 5 })).toEqual([1, 2, 3, 4, 5]);
    expect(buildPageRange({ page: 1, totalPages: 7 })).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  test("elides only on the right near the start", () => {
    expect(buildPageRange({ page: 2, totalPages: 20 })).toEqual([
      1, 2, 3, 4, 5, "ellipsis", 20,
    ]);
  });

  test("elides only on the left near the end", () => {
    expect(buildPageRange({ page: 19, totalPages: 20 })).toEqual([
      1, "ellipsis", 16, 17, 18, 19, 20,
    ]);
  });

  test("elides both sides in the middle", () => {
    expect(buildPageRange({ page: 10, totalPages: 20 })).toEqual([
      1, "ellipsis", 9, 10, 11, "ellipsis", 20,
    ]);
  });

  test("never elides a single page", () => {
    // Page 4 of 20: the gap left of 3 would be page 2 alone, so show it.
    expect(buildPageRange({ page: 4, totalPages: 20 })).toEqual([
      1, 2, 3, 4, 5, "ellipsis", 20,
    ]);
    expect(buildPageRange({ page: 17, totalPages: 20 })).toEqual([
      1, "ellipsis", 16, 17, 18, 19, 20,
    ]);
  });

  test("honours a wider sibling count", () => {
    expect(buildPageRange({ page: 10, totalPages: 20, siblings: 2 })).toEqual([
      1, "ellipsis", 8, 9, 10, 11, 12, "ellipsis", 20,
    ]);
  });

  test("clamps an out-of-range page", () => {
    expect(buildPageRange({ page: 0, totalPages: 5 })).toEqual([1, 2, 3, 4, 5]);
    expect(buildPageRange({ page: 99, totalPages: 20 })).toEqual([
      1, "ellipsis", 16, 17, 18, 19, 20,
    ]);
  });

  test("returns nothing when there are no pages", () => {
    expect(buildPageRange({ page: 1, totalPages: 0 })).toEqual([]);
  });

  test("always keeps the first page, the last page and the current one", () => {
    for (let page = 1; page <= 30; page++) {
      const items = buildPageRange({ page, totalPages: 30 });
      expect(items[0]).toBe(1);
      expect(items[items.length - 1]).toBe(30);
      expect(items).toContain(page);
    }
  });
});

describe("buildPageHref", () => {
  const searchParams = new URLSearchParams("busca=fone&marca=sony");

  test("sets the page parameter, preserving the others", () => {
    expect(
      buildPageHref({
        pathname: "/produtos",
        searchParams,
        key: "pagina",
        page: 3,
      }),
    ).toBe("/produtos?busca=fone&marca=sony&pagina=3");
  });

  test("drops the parameter on page 1 so it has one canonical URL", () => {
    expect(
      buildPageHref({
        pathname: "/produtos",
        searchParams: new URLSearchParams("pagina=4"),
        key: "pagina",
        page: 1,
      }),
    ).toBe("/produtos");
  });

  test("replaces an existing page rather than appending", () => {
    expect(
      buildPageHref({
        pathname: "/admin/products",
        searchParams: new URLSearchParams("page=2"),
        key: "page",
        page: 5,
      }),
    ).toBe("/admin/products?page=5");
  });

  test("does not mutate the params it was given", () => {
    const params = new URLSearchParams("pagina=2");
    buildPageHref({
      pathname: "/produtos",
      searchParams: params,
      key: "pagina",
      page: 9,
    });
    expect(params.get("pagina")).toBe("2");
  });
});

describe("buildPageRange normalisation", () => {
  const isWholePage = (item: number | "ellipsis") =>
    item === "ellipsis" || Number.isInteger(item);

  test("truncates a fractional sibling count", () => {
    expect(buildPageRange({ page: 10, totalPages: 20, siblings: 0.5 })).toEqual(
      buildPageRange({ page: 10, totalPages: 20, siblings: 0 }),
    );
    expect(
      buildPageRange({ page: 10, totalPages: 20, siblings: 1.9 }).every(
        isWholePage,
      ),
    ).toBe(true);
  });

  test("treats a negative sibling count as zero", () => {
    expect(buildPageRange({ page: 10, totalPages: 20, siblings: -3 })).toEqual(
      buildPageRange({ page: 10, totalPages: 20, siblings: 0 }),
    );
  });

  test("truncates a fractional page", () => {
    expect(buildPageRange({ page: 9.5, totalPages: 20 })).toEqual(
      buildPageRange({ page: 9, totalPages: 20 }),
    );
  });

  test("never emits a fractional page number", () => {
    for (const page of [1.5, 9.5, 19.999, -2.5]) {
      expect(
        buildPageRange({ page, totalPages: 20, siblings: 1.5 }).every(
          isWholePage,
        ),
      ).toBe(true);
    }
  });
});
