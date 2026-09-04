"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryParam } from "@/hooks/use-query-param";
import { buildFilterHref } from "@/lib/utils/filter";

/**
 * The one filter bar of every admin list (ADR-0016). It takes its filters as a
 * **spec** — strings and option arrays, which is why it can be shared at all:
 * data crosses the RSC boundary as an ordinary prop, so the table beside it
 * stays server markup while a column spec, needing a `cell` function, could
 * not.
 *
 * It owns, once, what would otherwise be repeated on eight surfaces: the
 * debounced search, each discrete filter's optimistic value, `replace` rather
 * than `push`, the `data-pending` attribute the table dims against, and the
 * rule that every filter change drops the page. Those are rules about
 * *URL-driven lists* and not about any entity, which is the deliberate
 * exception ADR-0016 argues for. A bar that knew what a Product's statuses are
 * would belong to `products`; one that receives them as options does not.
 */

/** One choice in a discrete filter. Already in the surface's own language. */
export type FilterOption = { value: string; label: string };

type SearchFilter<TKey extends string = string> = {
  kind: "search";
  key: TKey;
  placeholder: string;
};

type SelectFilter<TKey extends string = string> = {
  kind: "select";
  key: TKey;
  /** The control's accessible name — "Status", "Marca". */
  label: string;
  /** What "no filter" reads as, in pt-BR: "Todas as marcas". */
  allLabel: string;
  options: readonly FilterOption[];
};

/**
 * `key` is a key of the list's parsed input, so a filter naming a parameter
 * the ADR-0014 schema does not declare fails to compile.
 */
export type FilterSpec<TInput> =
  | SearchFilter<Extract<keyof TInput, string>>
  | SelectFilter<Extract<keyof TInput, string>>;

/**
 * Dropped by every filter change. Filter to a smaller result set while
 * `?page=7` is still in the URL and the Admin gets an empty table with no
 * explanation. It is a literal here for `buildSortHref`'s reason: ADR-0005
 * gives every admin list the same English parameter.
 */
const PAGE_KEY = "page";

/** Long enough that a five-word query is one navigation, not five. */
const SEARCH_DEBOUNCE_MS = 400;

export function FilterBar<TInput extends object>({
  filters,
  input,
}: {
  filters: readonly FilterSpec<TInput>[];
  /**
   * The list's parsed input — the same object the page prefetched with. Every
   * control reads its current value from here rather than re-deriving one
   * (ADR-0011).
   */
  input: TInput;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => {
        if (filter.kind === "search") {
          return <FilterSearch key={filter.key} filter={filter} />;
        }

        const current = input[filter.key];

        return (
          <FilterSelect
            key={filter.key}
            filter={filter}
            value={typeof current === "string" ? current : null}
          />
        );
      })}
    </div>
  );
}

/**
 * The one control with uncommitted state: it holds keystrokes the URL does not
 * have yet, which is the whole reason `useQueryParam` exists and the reason
 * nothing else here uses it.
 */
function FilterSearch({ filter }: { filter: SearchFilter }) {
  const { value, setValue, isPending } = useQueryParam(filter.key, {
    debounceMs: SEARCH_DEBOUNCE_MS,
    resetKeys: [PAGE_KEY],
  });

  return (
    <div
      className="relative w-full sm:w-72"
      data-pending={isPending ? "" : undefined}>
      <SearchIcon
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={filter.placeholder}
        aria-label={filter.placeholder}
        className="pl-8"
      />
    </div>
  );
}

/**
 * A discrete filter has nothing uncommitted — one click, one navigation — so
 * it needs none of `useQueryParam`'s reconciliation. `useOptimistic` shows the
 * chosen option immediately and React reverts it when the new server prop
 * arrives, which is the same reconciliation by other means.
 */
function FilterSelect({
  filter,
  value,
}: {
  filter: SelectFilter;
  value: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [optimisticValue, setOptimisticValue] = useOptimistic(value);

  return (
    <div data-pending={isPending ? "" : undefined}>
      <Select
        value={optimisticValue}
        onValueChange={(next: string | null) => {
          // The navigation is a transition, which is what keeps the table from
          // re-suspending: the page renders the old URL until the new server
          // render lands, and dims in the meantime.
          startTransition(() => {
            setOptimisticValue(next);
            router.replace(
              buildFilterHref({
                pathname,
                searchParams,
                key: filter.key,
                value: next,
                resetKeys: [PAGE_KEY],
              }),
              { scroll: false },
            );
          });
        }}>
        <SelectTrigger aria-label={filter.label} className="w-full sm:w-48">
          <SelectValue>
            {(selected: string | null) =>
              selected === null
                ? filter.allLabel
                : // A bookmark naming a Category that has since been deleted
                  // still loads: the list returns nothing and the trigger says
                  // so, rather than printing a bare id.
                  (filter.options.find((option) => option.value === selected)
                    ?.label ?? "—")
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>{filter.allLabel}</SelectItem>
          {filter.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
