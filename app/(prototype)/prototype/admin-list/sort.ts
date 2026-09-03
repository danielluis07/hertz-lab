/**
 * PROTOTYPE — throwaway.
 *
 * A sorted list is a URL, so a sortable header is an anchor and this is pure.
 * The toggle rule: clicking the active column flips its direction, clicking a
 * new column starts at *that column's* own default.
 *
 * Shared by both shapes. `docs/DATA-FLOW.md` has this hand-written in the
 * module on promote-on-the-second-caller grounds — the prototype has two lists,
 * so it is already at the second caller. Worth noting: this piece is
 * global-eligible whichever shape wins, so it is not part of what a kit buys.
 */

export type SortDirection = "asc" | "desc";

export function buildSortHref({
  pathname,
  searchParams,
  field,
  currentField,
  currentOrder,
  defaultDirection,
}: {
  pathname: string;
  searchParams: URLSearchParams;
  field: string;
  currentField: string;
  currentOrder: SortDirection;
  defaultDirection: SortDirection;
}): string {
  const params = new URLSearchParams(searchParams.toString());

  const isActive = field === currentField;
  const nextOrder: SortDirection = isActive
    ? currentOrder === "asc"
      ? "desc"
      : "asc"
    : defaultDirection;

  params.set("sortBy", field);
  params.set("sortOrder", nextOrder);
  // A re-sort restarts the list; page 7 of the old order means nothing.
  params.delete("page");

  return `${pathname}?${params.toString()}`;
}

export const sortIndicator = (
  isActive: boolean,
  order: SortDirection,
): string => (!isActive ? "" : order === "asc" ? " ↑" : " ↓");
