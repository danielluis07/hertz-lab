/**
 * Writing a filter to the URL is a navigation, the same shape as
 * `lib/utils/pagination.ts` and `lib/utils/sort.ts` — so the URL itself is
 * built by a pure function, and only the `router.replace` around it needs a
 * client.
 *
 * This knows a shape and never a rule (ADR-0007): the parameter name and the
 * parameters a change invalidates both arrive as arguments, so neither a
 * vocabulary (ADR-0005) nor "a filter change drops the page" is stored here.
 * That rule belongs to `components/filter-bar.tsx`, which is its one caller
 * with an opinion.
 */

/**
 * The URL a filter change navigates to, preserving every other parameter.
 *
 * An empty, `null` or `undefined` value removes the parameter rather than
 * writing `?status=`: an untouched filter and a cleared one are the same view,
 * and they must produce the same URL for the query key to match.
 */
export function buildFilterHref({
  pathname,
  searchParams,
  key,
  value,
  resetKeys = [],
}: {
  pathname: string;
  searchParams: URLSearchParams;
  /** The filter's parameter name — the caller's vocabulary, never this file's. */
  key: string;
  value: string | null | undefined;
  /** Parameters this change invalidates. Callers pass the page parameter. */
  resetKeys?: readonly string[];
}): string {
  const params = new URLSearchParams(searchParams.toString());

  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }

  for (const resetKey of resetKeys) {
    // A caller listing its own key would otherwise write the filter and delete
    // it in the same breath.
    if (resetKey !== key) params.delete(resetKey);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
