"use client";

/**
 * PROTOTYPE — shape (a). The engine's URL writes.
 *
 * One hook for every filter on every resource. The rule that would otherwise
 * be repeated per control — **a filter change drops `page`** — lives here once,
 * for all thirteen modules rather than for one.
 *
 * Note what the engine cannot do: call `useOptimistic` once per filter, since
 * the filter list is data and hooks may not run in a loop. So it holds
 * optimistic state over the **whole input object** instead of per field. That
 * works, and it is the shape the config forces.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { useQueryParam } from "@/hooks/use-query-param";
import type { BaseListInput } from "./resource";

export function useResourceFilters<TInput extends BaseListInput>(
  input: TInput,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startTransition] = useTransition();
  const [optimisticInput, setOptimisticInput] = useOptimistic(input);

  // The debounced text box is the one control with uncommitted state.
  const search = useQueryParam("search", {
    debounceMs: 300,
    resetKeys: ["page"],
  });

  const setFilter = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Filter to a smaller set while ?page=7 is still set and the Admin gets an
    // empty table with no explanation.
    params.delete("page");

    startTransition(() => {
      setOptimisticInput({ ...optimisticInput, [key]: value });
      // A filter refines the current view; it is not a destination.
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return {
    optimisticInput,
    setFilter,
    search,
    isPending: isNavigating || search.isPending,
  };
}
