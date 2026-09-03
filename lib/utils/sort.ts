/**
 * Sorting is a navigation, not a state change — the same shape as
 * `lib/utils/pagination.ts`. A sorted list is a URL, so a sortable header is an
 * anchor, the header row stays HTML, and the whole sort surface is free and
 * middle-clickable.
 *
 * This knows a shape and never a rule (ADR-0007): the field, the current sort
 * and the per-field default directions all arrive as arguments, so the field
 * list never becomes global.
 */

/** Both directions, as a tuple, so a list's params schema can enumerate them. */
export const SORT_ORDERS = ["asc", "desc"] as const;

export type SortOrder = (typeof SORT_ORDERS)[number];

/**
 * The two parameter names are literals rather than arguments, unlike
 * `buildPageHref`'s `key`. ADR-0005 gives every admin list the same English
 * pair, and the shop's `?ordenar=` is one combined value rather than this
 * split — a different shape, which will want its own builder rather than two
 * more arguments here.
 */
const SORT_BY_KEY = "sortBy";
const SORT_ORDER_KEY = "sortOrder";

/**
 * The href a sortable column header points at, preserving every other query
 * parameter.
 *
 * Clicking the column already sorted on flips its direction; clicking any
 * other column starts at *that column's* default — names A-Z, ratings and
 * dates highest and newest first. One global `desc` would sort names Z-A on
 * the first click, which reads as a bug.
 *
 * `page` is preserved, deliberately, where a filter change drops it: a filter
 * shrinks the result set, so page 7 of it may not exist, while re-sorting
 * leaves the count untouched and page 7 is still a full page.
 */
export function buildSortHref<TField extends string>({
  pathname,
  searchParams,
  field,
  sortBy,
  sortOrder,
  defaults,
}: {
  pathname: string;
  searchParams: URLSearchParams;
  /** The column this header sorts by. */
  field: TField;
  /** The list's current sort, already parsed. */
  sortBy: TField;
  sortOrder: SortOrder;
  /** Each field's first-click direction. */
  defaults: Record<TField, SortOrder>;
}): string {
  const params = new URLSearchParams(searchParams.toString());

  const order: SortOrder =
    field === sortBy
      ? sortOrder === "asc"
        ? "desc"
        : "asc"
      : defaults[field];

  params.set(SORT_BY_KEY, field);
  params.set(SORT_ORDER_KEY, order);

  return `${pathname}?${params.toString()}`;
}
