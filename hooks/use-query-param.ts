"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { buildFilterHref } from "@/lib/utils/filter";

/**
 * Read and write query parameters as component state, **debounced**, and
 * written together in **one** navigation.
 *
 * This is the hook for a text input, and deliberately not the general
 * mechanism for URL state. Everything below — the `useState` mirror of the
 * URL, and the `synced` block that re-adopts it on a back button or route
 * change — exists for one reason: a debounced input holds keystrokes the URL
 * does not have yet, so the two can legitimately disagree and something has to
 * reconcile them.
 *
 * It takes several keys because a price range is two boxes holding
 * uncommitted keystrokes for exactly the search box's reason (ADR-0044): one
 * debounce over both, so settling either writes the pair, and a range is never
 * half-applied in history. `useQueryParam` below is the one-key case.
 *
 * A discrete filter has no uncommitted state. One click, one navigation, and
 * nothing to debounce. Use `useOptimistic(current)` plus a `router.replace` in
 * a transition instead: React reverts the optimistic value when the new server
 * prop arrives, which is the same reconciliation this hook hand-rolls. See
 * "Filter controls" in `docs/READ-PATH.md`.
 *
 * The parameter names are the caller's: ADR-0005 gives public routes
 * Portuguese parameters (`busca`, `preco_min`, `pagina`) and admin routes
 * English ones, so this hook stays ignorant of which vocabulary it is serving.
 * Its callers are the controls in `components/filter-bar.tsx`, which pass the
 * surface's own parameter names and the page key every filter change drops —
 * ADR-0016 put that rule there, so no module wraps this hook and no list has a
 * filter hook of its own.
 *
 * Any component calling this needs a `<Suspense>` boundary above it on a
 * prerendered route, or the production build fails — `useSearchParams` opts the
 * tree below it out of prerendering.
 */
export function useQueryParams<TKey extends string>(
  keys: readonly TKey[],
  {
    debounceMs = 0,
    resetKeys = [],
  }: {
    /** Wait this long after the last change before touching the URL. */
    debounceMs?: number;
    /** Parameters to drop whenever these change — typically the page. */
    resetKeys?: readonly string[];
  } = {},
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Every comparison below is between serialised tokens rather than arrays: a
  // string compares by value and is a stable effect dependency, where the
  // fresh array each render builds would be neither.
  const paramValues = keys.map((key) => searchParams.get(key) ?? "");
  const paramToken = JSON.stringify(paramValues);

  const [values, setValues] = useState(paramValues);
  const valuesToken = JSON.stringify(values);

  const debouncedToken = useDebounce(valuesToken, debounceMs);
  // A zero debounce should be synchronous, not a zero-length timeout.
  const committedToken = debounceMs > 0 ? debouncedToken : valuesToken;

  // Adopt the URL when it changes underneath us: a route change, the back
  // button, or a <Link> elsewhere on the page. Parameters that already match
  // `committed` are this hook's own write landing, so a fast typist is never
  // interrupted by their own navigation.
  //
  // Adjusting state during render is React's documented alternative to the
  // set-state-in-effect this otherwise needs.
  const [synced, setSynced] = useState({ pathname, param: paramToken });
  if (synced.pathname !== pathname || synced.param !== paramToken) {
    setSynced({ pathname, param: paramToken });

    const routeChanged = synced.pathname !== pathname;
    if (routeChanged || paramToken !== committedToken) {
      setValues(paramValues);
    }
  }

  const keysToken = JSON.stringify(keys);
  const resetKeysToken = JSON.stringify(resetKeys);

  useEffect(() => {
    // State already agrees with the URL, so there is nothing to push. This
    // guard is what stops a stale debounce from undoing the back button: the
    // render above adopts the new parameters into `values` immediately, but
    // `committed` still holds the pre-navigation strings until the timer
    // settles, and writing those would navigate the shopper back forwards.
    if (valuesToken === paramToken) return;

    if (committedToken === paramToken) return;

    const committed: string[] = JSON.parse(committedToken);
    const names: string[] = JSON.parse(keysToken);

    const href = buildFilterHref({
      pathname,
      searchParams,
      values: Object.fromEntries(
        names.map((name, index) => [name, committed[index] ?? ""]),
      ),
      resetKeys: JSON.parse(resetKeysToken),
    });

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }, [
    valuesToken,
    committedToken,
    paramToken,
    keysToken,
    resetKeysToken,
    pathname,
    router,
    searchParams,
  ]);

  return {
    values: Object.fromEntries(
      keys.map((key, index) => [key, values[index] ?? ""]),
    ) as Record<TKey, string>,
    setValue: (key: TKey, value: string) =>
      setValues((current) =>
        current.map((existing, index) => (keys[index] === key ? value : existing)),
      ),
    isPending,
  };
}

/** `useQueryParams` for the one parameter a search box owns. */
export function useQueryParam(
  key: string,
  options?: Parameters<typeof useQueryParams>[1],
) {
  const { values, setValue, isPending } = useQueryParams([key], options);

  return {
    value: values[key] ?? "",
    setValue: (value: string) => setValue(key, value),
    isPending,
  };
}
