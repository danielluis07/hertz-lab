"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a CSS media query currently matches.
 *
 * Built on `useSyncExternalStore` so the server snapshot is explicit rather
 * than an `undefined` that flickers on hydration: on the server this is always
 * `false`, and the real value arrives with the first client render.
 *
 * `hooks/use-mobile.ts` covers the same ground for the sidebar breakpoint, but
 * it is shadcn-generated and gets rewritten by `shadcn add`, so it is left
 * alone rather than refactored to delegate here.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onStoreChange);
      return () => list.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
