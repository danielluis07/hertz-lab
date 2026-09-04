"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { buildFilterHref } from "@/lib/utils/filter";

/**
 * Read and write one query parameter as component state, **debounced**.
 *
 * This is the hook for a search box, and deliberately not the general
 * mechanism for URL state. Everything below — the `useState` mirror of the
 * URL, and the `synced` block that re-adopts it on a back button or route
 * change — exists for one reason: a debounced input holds keystrokes the URL
 * does not have yet, so the two can legitimately disagree and something has to
 * reconcile them.
 *
 * A discrete filter has no uncommitted state. One click, one navigation, and
 * nothing to debounce. Use `useOptimistic(current)` plus a `router.replace` in
 * a transition instead: React reverts the optimistic value when the new server
 * prop arrives, which is the same reconciliation this hook hand-rolls. See
 * "Filter controls" in `docs/DATA-FLOW.md`.
 *
 * The parameter name is the caller's: ADR-0005 gives public routes Portuguese
 * parameters (`busca`, `pagina`, `marca`) and admin routes English ones, so
 * this hook stays ignorant of which vocabulary it is serving. Its one caller is
 * `components/filter-bar.tsx`, which passes the surface's own parameter name
 * and the page key every filter change drops — ADR-0016 put that rule there,
 * so no module wraps this hook and no list has a filter hook of its own.
 *
 * Any component calling this needs a `<Suspense>` boundary above it on a
 * prerendered route, or the production build fails — `useSearchParams` opts the
 * tree below it out of prerendering.
 */
export function useQueryParam(
  key: string,
  {
    debounceMs = 0,
    resetKeys = [],
  }: {
    /** Wait this long after the last change before touching the URL. */
    debounceMs?: number;
    /** Parameters to drop whenever this one changes — typically the page. */
    resetKeys?: string[];
  } = {},
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const paramValue = searchParams.get(key) ?? "";

  const [value, setValue] = useState(paramValue);

  const debouncedValue = useDebounce(value, debounceMs);
  // A zero debounce should be synchronous, not a zero-length timeout.
  const committed = debounceMs > 0 ? debouncedValue : value;

  // Adopt the URL when it changes underneath us: a route change, the back
  // button, or a <Link> elsewhere on the page. A parameter that already matches
  // `committed` is this hook's own write landing, so a fast typist is never
  // interrupted by their own navigation.
  //
  // Adjusting state during render is React's documented alternative to the
  // set-state-in-effect this otherwise needs.
  const [synced, setSynced] = useState({ pathname, param: paramValue });
  if (synced.pathname !== pathname || synced.param !== paramValue) {
    setSynced({ pathname, param: paramValue });

    const routeChanged = synced.pathname !== pathname;
    if (routeChanged || paramValue !== committed) {
      setValue(paramValue);
    }
  }

  // `resetKeys` is a fresh array on every render; the joined string is stable.
  const resetKeysToken = resetKeys.join(",");

  useEffect(() => {
    // State already agrees with the URL, so there is nothing to push. This
    // guard is what stops a stale debounce from undoing the back button: the
    // render above adopts the new `paramValue` into `value` immediately, but
    // `committed` still holds the pre-navigation string until the timer
    // settles, and writing that would navigate the shopper back forwards.
    if (value === paramValue) return;

    if (committed === paramValue) return;

    const href = buildFilterHref({
      pathname,
      searchParams,
      key,
      value: committed,
      resetKeys: resetKeysToken ? resetKeysToken.split(",") : [],
    });

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }, [
    value,
    committed,
    paramValue,
    key,
    resetKeysToken,
    pathname,
    router,
    searchParams,
  ]);

  return { value, setValue, isPending };
}
