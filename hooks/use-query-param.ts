"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useDebounce } from "@/hooks/use-debounce";

type UseQueryParamOptions = {
  /** Wait this long after the last change before touching the URL. */
  debounceMs?: number;
  /** Parameters to drop whenever this one changes — typically the page. */
  resetKeys?: string[];
};

/**
 * Read and write one query parameter as component state.
 *
 * The parameter name is the caller's: ADR-0005 gives public routes Portuguese
 * parameters (`busca`, `pagina`, `marca`) and admin routes English ones, so
 * this hook stays ignorant of which vocabulary it is serving. Modules wrap it
 * and own their own names.
 *
 * Any component calling this needs a `<Suspense>` boundary above it on a
 * prerendered route, or the production build fails — `useSearchParams` opts the
 * tree below it out of prerendering.
 */
export function useQueryParam(
  key: string,
  { debounceMs = 0, resetKeys = [] }: UseQueryParamOptions = {},
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

    const params = new URLSearchParams(searchParams.toString());

    if (committed) {
      params.set(key, committed);
    } else {
      params.delete(key);
    }

    for (const resetKey of resetKeysToken ? resetKeysToken.split(",") : []) {
      params.delete(resetKey);
    }

    startTransition(() => {
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
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
