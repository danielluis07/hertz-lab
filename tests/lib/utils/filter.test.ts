import { describe, expect, test } from "bun:test";
import { buildFilterHref } from "@/lib/utils/filter";

/**
 * The util knows no module and no parameter vocabulary, so the test spells out
 * both — the same way a filter bar passes them in.
 */
const href = ({
  key,
  value,
  search = "",
  resetKeys = ["page"],
  pathname = "/admin/products",
}: {
  key: string;
  value: string | null | undefined;
  search?: string;
  resetKeys?: readonly string[];
  pathname?: string;
}) =>
  buildFilterHref({
    pathname,
    searchParams: new URLSearchParams(search),
    key,
    value,
    resetKeys,
  });

describe("buildFilterHref", () => {
  test("sets the filter, preserving every unrelated parameter", () => {
    expect(
      href({
        key: "status",
        value: "active",
        search: "search=fone&sortBy=name&sortOrder=asc",
      }),
    ).toBe("/admin/products?search=fone&sortBy=name&sortOrder=asc&status=active");
  });

  test("replaces the value already in the URL rather than appending to it", () => {
    expect(href({ key: "status", value: "draft", search: "status=active" })).toBe(
      "/admin/products?status=draft",
    );
  });

  test("removes the parameter when the filter is cleared", () => {
    for (const value of ["", null, undefined]) {
      expect(href({ key: "status", value, search: "status=active" })).toBe(
        "/admin/products",
      );
    }
  });

  test("drops every reset key, so a filter change cannot land on page 7", () => {
    expect(
      href({ key: "brandId", value: "sony", search: "page=7&status=active" }),
    ).toBe("/admin/products?status=active&brandId=sony");
  });

  test("drops the reset keys even when the filter is cleared", () => {
    expect(href({ key: "search", value: "", search: "search=fone&page=3" })).toBe(
      "/admin/products",
    );
  });

  test("never resets the parameter it is setting", () => {
    // A caller passing its own key in `resetKeys` would otherwise write the
    // filter and immediately delete it.
    expect(
      href({ key: "page", value: "3", resetKeys: ["page"], search: "" }),
    ).toBe("/admin/products?page=3");
  });

  test("returns a bare pathname when nothing is left in the query", () => {
    expect(href({ key: "search", value: null, search: "search=fone" })).toBe(
      "/admin/products",
    );
  });

  test("does not mutate the params it was given", () => {
    const searchParams = new URLSearchParams("status=active&page=2");

    buildFilterHref({
      pathname: "/admin/products",
      searchParams,
      key: "status",
      value: "draft",
      resetKeys: ["page"],
    });

    expect(searchParams.toString()).toBe("status=active&page=2");
  });

  test("keeps the caller's pathname", () => {
    expect(
      href({ key: "status", value: "active", pathname: "/admin/coupons" }),
    ).toBe("/admin/coupons?status=active");
  });
});
