import { describe, expect, test } from "bun:test";
import { buildFilterHref } from "@/lib/utils/filter";

/**
 * The util knows no module and no parameter vocabulary, so the test spells out
 * both — the same way a filter control passes them in.
 */
const href = ({
  values,
  search = "",
  resetKeys = ["page"],
  pathname = "/admin/products",
}: {
  values: Record<string, string | null>;
  search?: string;
  resetKeys?: readonly string[];
  pathname?: string;
}) =>
  buildFilterHref({
    pathname,
    searchParams: new URLSearchParams(search),
    values,
    resetKeys,
  });

describe("buildFilterHref", () => {
  test("sets the filter, preserving every unrelated parameter", () => {
    expect(
      href({
        values: { status: "active" },
        search: "search=fone&sortBy=name&sortOrder=asc",
      }),
    ).toBe("/admin/products?search=fone&sortBy=name&sortOrder=asc&status=active");
  });

  test("replaces the value already in the URL rather than appending to it", () => {
    expect(href({ values: { status: "draft" }, search: "status=active" })).toBe(
      "/admin/products?status=draft",
    );
  });

  test("removes the parameter when the filter is cleared", () => {
    for (const value of ["", null]) {
      expect(href({ values: { status: value }, search: "status=active" })).toBe(
        "/admin/products",
      );
    }
  });

  test("writes several parameters in one navigation", () => {
    // A price range is two parameters, and writing them one at a time would
    // leave a half-applied range in history (ADR-0044).
    expect(
      href({
        values: { preco_min: "100", preco_max: "500" },
        search: "busca=fone",
        pathname: "/produtos",
        resetKeys: ["pagina"],
      }),
    ).toBe("/produtos?busca=fone&preco_min=100&preco_max=500");
  });

  test("sets one parameter and clears another in the same navigation", () => {
    expect(
      href({
        values: { preco_min: "100", preco_max: null },
        search: "preco_min=50&preco_max=500",
        pathname: "/produtos",
        resetKeys: ["pagina"],
      }),
    ).toBe("/produtos?preco_min=100");
  });

  test("drops every reset key, so a filter change cannot land on page 7", () => {
    expect(
      href({ values: { brandId: "sony" }, search: "page=7&status=active" }),
    ).toBe("/admin/products?status=active&brandId=sony");
  });

  test("drops the reset keys even when the filter is cleared", () => {
    expect(
      href({ values: { search: "" }, search: "search=fone&page=3" }),
    ).toBe("/admin/products");
  });

  test("never resets a parameter it is setting", () => {
    // A caller passing its own key in `resetKeys` would otherwise write the
    // filter and immediately delete it.
    expect(
      href({ values: { page: "3" }, resetKeys: ["page"], search: "" }),
    ).toBe("/admin/products?page=3");

    expect(
      href({
        values: { a: "1", b: "2" },
        resetKeys: ["b", "c"],
        search: "c=9",
      }),
    ).toBe("/admin/products?a=1&b=2");
  });

  test("returns a bare pathname when nothing is left in the query", () => {
    expect(href({ values: { search: null }, search: "search=fone" })).toBe(
      "/admin/products",
    );
  });

  test("does not mutate the params it was given", () => {
    const searchParams = new URLSearchParams("status=active&page=2");

    buildFilterHref({
      pathname: "/admin/products",
      searchParams,
      values: { status: "draft" },
      resetKeys: ["page"],
    });

    expect(searchParams.toString()).toBe("status=active&page=2");
  });

  test("keeps the caller's pathname", () => {
    expect(
      href({ values: { status: "active" }, pathname: "/admin/coupons" }),
    ).toBe("/admin/coupons?status=active");
  });
});
