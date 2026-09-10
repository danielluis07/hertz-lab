/**
 * Writing a filter to the URL is a navigation, the same shape as
 * `lib/utils/pagination.ts` and `lib/utils/sort.ts` — so the URL itself is
 * built by a pure function, and only the `router.replace` around it needs a
 * client.
 *
 * This knows a shape and never a rule (ADR-0007): the parameter names and the
 * parameters a change invalidates both arrive as arguments, so neither a
 * vocabulary (ADR-0005) nor "a filter change drops the page" is stored here.
 * That rule belongs to the controls in `components/filter-bar.tsx`, its one
 * caller with an opinion.
 */

/**
 * The URL a filter change navigates to, preserving every other parameter.
 *
 * `values` is a record rather than one key/value pair so that a control owning
 * two parameters — a price range — writes both in **one** navigation
 * (ADR-0044). Writing them one at a time would fire two renders and leave a
 * half-applied range in history.
 *
 * An empty or `null` value removes the parameter rather than writing
 * `?status=`: an untouched filter and a cleared one are the same view, and they
 * must produce the same URL for the query key to match.
 */
export function buildFilterHref({
  pathname,
  searchParams,
  values,
  resetKeys = [],
}: {
  pathname: string;
  searchParams: URLSearchParams;
  /** Parameter name to new value — the caller's vocabulary, never this file's. */
  values: Record<string, string | null>;
  /** Parameters this change invalidates. Callers pass the page parameter. */
  resetKeys?: readonly string[];
}): string {
  const params = new URLSearchParams(searchParams.toString());

  for (const [key, value] of Object.entries(values)) {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  }

  for (const resetKey of resetKeys) {
    // A caller listing its own key would otherwise write the filter and delete
    // it in the same breath.
    if (!Object.hasOwn(values, resetKey)) params.delete(resetKey);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
