import { describe, expect, test } from "bun:test";
import { buildSortHref, type SortOrder } from "@/lib/utils/sort";

/**
 * The util knows no module, so the test declares its own field list — the same
 * shape a list surface passes in.
 */
const defaults: Record<"name" | "rating" | "createdAt", SortOrder> = {
  name: "asc",
  rating: "desc",
  createdAt: "desc",
};

const href = ({
  field,
  sortBy,
  sortOrder,
  search = "",
  pathname = "/admin/products",
}: {
  field: keyof typeof defaults;
  sortBy: keyof typeof defaults;
  sortOrder: SortOrder;
  search?: string;
  pathname?: string;
}) =>
  buildSortHref({
    pathname,
    searchParams: new URLSearchParams(search),
    field,
    sortBy,
    sortOrder,
    defaults,
  });

describe("buildSortHref", () => {
  test("starts a field at its own default direction", () => {
    expect(href({ field: "name", sortBy: "createdAt", sortOrder: "desc" })).toBe(
      "/admin/products?sortBy=name&sortOrder=asc",
    );
    expect(href({ field: "rating", sortBy: "name", sortOrder: "asc" })).toBe(
      "/admin/products?sortBy=rating&sortOrder=desc",
    );
  });

  test("toggles the direction of the field already sorted on", () => {
    expect(href({ field: "name", sortBy: "name", sortOrder: "asc" })).toBe(
      "/admin/products?sortBy=name&sortOrder=desc",
    );
    expect(href({ field: "name", sortBy: "name", sortOrder: "desc" })).toBe(
      "/admin/products?sortBy=name&sortOrder=asc",
    );
  });

  test("switching fields ignores the direction the previous field was in", () => {
    // `rating` defaults to desc, and arriving from an ascending `name` must not
    // inherit that asc — best-rated first is what the column means.
    expect(href({ field: "rating", sortBy: "name", sortOrder: "asc" })).toBe(
      "/admin/products?sortBy=rating&sortOrder=desc",
    );
    // And back again: `name` starts A-Z however `rating` was pointing.
    expect(href({ field: "name", sortBy: "rating", sortOrder: "asc" })).toBe(
      "/admin/products?sortBy=name&sortOrder=asc",
    );
  });

  test("preserves every unrelated parameter", () => {
    expect(
      href({
        field: "name",
        sortBy: "createdAt",
        sortOrder: "desc",
        search: "search=fone&status=active&page=3",
      }),
    ).toBe(
      "/admin/products?search=fone&status=active&page=3&sortBy=name&sortOrder=asc",
    );
  });

  test("replaces the sort already in the URL rather than appending to it", () => {
    expect(
      href({
        field: "name",
        sortBy: "name",
        sortOrder: "asc",
        search: "sortBy=name&sortOrder=asc",
      }),
    ).toBe("/admin/products?sortBy=name&sortOrder=desc");
  });

  test("does not mutate the params it was given", () => {
    const searchParams = new URLSearchParams("status=active");

    buildSortHref({
      pathname: "/admin/products",
      searchParams,
      field: "name",
      sortBy: "createdAt",
      sortOrder: "desc",
      defaults,
    });

    expect(searchParams.toString()).toBe("status=active");
  });

  test("keeps the caller's pathname", () => {
    expect(
      href({
        field: "name",
        sortBy: "name",
        sortOrder: "asc",
        pathname: "/admin/brands",
      }),
    ).toBe("/admin/brands?sortBy=name&sortOrder=desc");
  });
});
