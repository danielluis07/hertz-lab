"use client";

/**
 * PROTOTYPE — shape (b), the settled shape: a **config-driven filter bar over
 * hand-written tables**.
 *
 * This is the kit's win taken where it is free. The reason it is free here and
 * not for the table is one line of the RSC contract:
 *
 *   a filter spec is **data** — strings and option arrays — so it crosses the
 *   server/client boundary as a prop.
 *   a column spec is **functions** — `cell`, `rowHref` — so it cannot, which
 *   is what forces a config-driven table into the browser entirely.
 *
 * So the filter row, the part that really is uniform across all eight surfaces,
 * is declared as data and rendered once. The table, the part that is not, stays
 * markup the surface owns — and stays on the server.
 *
 * Everything the module hook used to own lives here now, for all of them:
 * the debounced search, per-filter optimism, `replace` not `push`, and the rule
 * that **a filter change drops `page`**.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { useQueryParam } from "@/hooks/use-query-param";
import type { BaseListInput } from "../params";

type Option = { readonly value: string; readonly label: string };

/** The keys a select may bind to: the input, minus the plumbing. */
type DiscreteKey<TInput> = Exclude<
  keyof TInput & string,
  "search" | "sortBy" | "sortOrder" | "page"
>;

export type FilterSpec<TInput> =
  | { kind: "search"; placeholder: string }
  | {
      kind: "select";
      key: DiscreteKey<TInput>;
      label: string;
      options: readonly Option[];
    };

export function FilterBar<TInput extends BaseListInput>({
  filters,
  input,
}: {
  filters: readonly FilterSpec<TInput>[];
  input: TInput;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startTransition] = useTransition();
  const [optimisticInput, setOptimisticInput] = useOptimistic(input);

  // The one control with uncommitted state the URL has not seen yet.
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

  const isPending = isNavigating || search.isPending;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-pending={isPending || undefined}>
      {filters.map((filter) =>
        filter.kind === "search" ? (
          <Input
            key="search"
            className="w-64"
            placeholder={filter.placeholder}
            value={search.value}
            onChange={(event) => search.setValue(event.target.value)}
          />
        ) : (
          <select
            key={filter.key}
            // Native on purpose: the control's chrome is not what was under
            // test, and it would be identical either way.
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            value={(optimisticInput[filter.key] as string | undefined) ?? ""}
            onChange={(event) =>
              setFilter(filter.key, event.target.value || undefined)
            }>
            <option value="">{filter.label}: todos</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ),
      )}
    </div>
  );
}
