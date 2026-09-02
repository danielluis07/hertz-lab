/**
 * Pagination is a navigation, not a state change: shadcn's `PaginationLink`
 * renders an anchor, so what a page needs is an href and a range — both pure,
 * both callable from a server component. There is deliberately no hook.
 */

export type PageRangeItem = number | "ellipsis";

const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

/**
 * The page numbers to render, with `"ellipsis"` where a gap is elided.
 * The first and last page are always present.
 *
 * `{ page: 5, totalPages: 20 }` -> `[1, "ellipsis", 4, 5, 6, "ellipsis", 20]`
 * `{ page: 2, totalPages: 5 }`  -> `[1, 2, 3, 4, 5]`
 */
export function buildPageRange({
  page,
  totalPages,
  siblings = 1,
}: {
  page: number;
  totalPages: number;
  siblings?: number;
}): PageRangeItem[] {
  if (totalPages <= 0) return [];

  const current = Math.min(Math.max(page, 1), totalPages);

  // first + last + current + siblings on both sides + both ellipses
  const maxSlots = siblings * 2 + 5;
  if (totalPages <= maxSlots) return range(1, totalPages);

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, totalPages);

  // An ellipsis is only worth it when it hides at least two pages: standing in
  // for a single page costs more width than the page number it replaces.
  // Left ellipsis covers 2..left-1, right ellipsis covers right+1..last-1.
  const hasLeftGap = left - 2 >= 2;
  const hasRightGap = totalPages - 1 - right >= 2;

  const edgeRunLength = siblings * 2 + 3;

  if (!hasLeftGap && !hasRightGap) return range(1, totalPages);

  if (!hasLeftGap && hasRightGap) {
    return [...range(1, edgeRunLength), "ellipsis", totalPages];
  }

  if (hasLeftGap && !hasRightGap) {
    return [1, "ellipsis", ...range(totalPages - edgeRunLength + 1, totalPages)];
  }

  return [1, "ellipsis", ...range(left, right), "ellipsis", totalPages];
}

/**
 * The href for a given page, preserving every other query parameter.
 *
 * `key` is the caller's: public routes pass the Portuguese parameter name
 * ADR-0005 requires, admin routes pass the English one. Page 1 drops the
 * parameter entirely so the first page has one canonical URL.
 */
export function buildPageHref({
  pathname,
  searchParams,
  key,
  page,
}: {
  pathname: string;
  searchParams: URLSearchParams;
  key: string;
  page: number;
}): string {
  const params = new URLSearchParams(searchParams.toString());

  if (page <= 1) {
    params.delete(key);
  } else {
    params.set(key, String(page));
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
