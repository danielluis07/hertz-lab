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
import { useQueryParam, useQueryParams } from "@/hooks/use-query-param";
import { cn } from "@/lib/utils";
import { buildFilterHref } from "@/lib/utils/filter";

/**
 * The filter controls of every URL-driven list, and admin's arrangement of
 * them (ADR-0016, split by ADR-0044). Filters arrive as a **spec** — strings
 * and option arrays, which is why they can be shared at all: data crosses the
 * RSC boundary as an ordinary prop, so the list beside the controls stays
 * server markup while a column spec, needing a `cell` function, could not.
 *
 * **The controls are shared; the bar that arranges them is not.**
 * `FilterSearch`, `FilterSelect` and `FilterRange` own, once, what would
 * otherwise be repeated on every surface: the debounced text input, each
 * discrete filter's optimistic value, `replace` rather than `push`, the
 * `data-pending` attribute the list dims against, and the rule that every
 * filter change drops the page. Those are rules about *URL-driven lists* and
 * not about any entity, which is the deliberate exception ADR-0016 argues for.
 * A control that knew what a Product's statuses are would belong to
 * `products`; one that receives them as options does not.
 *
 * Each audience owns the thin component that lays them out: `FilterBar` below
 * is admin's flat row, and the shop's catalogue composes the same controls
 * into its Sheet (`modules/products/shop/components/catalog-filters.tsx`).
 * Every control takes its parameter names and the page parameter as props,
 * because those are the surface's vocabulary (ADR-0005) and never the
 * control's.
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
  /**
   * What "no filter" reads as, in pt-BR: "Todas as marcas". Omitted when the
   * parameter always holds one of its options — a sort orders the list, and
   * there is no unsorted view to return to.
   */
  allLabel?: string;
  options: readonly FilterOption[];
};

type RangeFilter<TKey extends string = string> = {
  kind: "range";
  minKey: TKey;
  maxKey: TKey;
  /** The pair's accessible name — "Preço". */
  label: string;
  /** Each bound's accessible name and placeholder — "Mínimo", "Máximo". */
  minLabel: string;
  maxLabel: string;
  /** Printed inside each box — "R$". */
  unit?: string;
};

/**
 * `key` is a key of the list's parsed input, so a filter naming a parameter
 * the ADR-0014 schema does not declare fails to compile.
 */
export type FilterSpec<TInput> =
  | SearchFilter<Extract<keyof TInput, string>>
  | SelectFilter<Extract<keyof TInput, string>>
  | RangeFilter<Extract<keyof TInput, string>>;

/** Long enough that a five-word query is one navigation, not five. */
const SEARCH_DEBOUNCE_MS = 400;

/**
 * Admin's page parameter, dropped by every filter change. Filter to a smaller
 * result set while `?page=7` is still in the URL and the Admin gets an empty
 * table with no explanation. A literal here for `buildSortHref`'s reason:
 * ADR-0005 gives every admin list the same English parameter.
 */
const ADMIN_PAGE_PARAM = "page";

/**
 * Admin's arrangement: every control in one wrapping row. An admin URL speaks
 * the input's own English (ADR-0005), so each filter's key is its parameter.
 */
export function FilterBar<TInput extends object>({
  filters,
  input,
}: {
  filters: readonly FilterSpec<TInput>[];
  /**
   * The list's parsed input — the same object the page prefetched with, and
   * where every **discrete** filter reads its current value rather than
   * re-deriving one.
   *
   * The text inputs are the exception, and have to be: `useQueryParams`
   * mirrors the raw parameters because it holds keystrokes the parsed input
   * has not seen yet, and the schema has already trimmed and dropped what it
   * did see. The two agree on everything the schema does not rewrite;
   * `?search=%20%20` is the visible disagreement, and it costs two spaces in a
   * box beside an unfiltered list. Nothing about ADR-0011 turns on it — the
   * query key is still the page's one parsed object, and no control computes
   * one.
   */
  input: TInput;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => {
        switch (filter.kind) {
          case "search":
            return (
              <FilterSearch
                key={filter.key}
                filter={filter}
                param={filter.key}
                pageParam={ADMIN_PAGE_PARAM}
                className="w-full sm:w-72"
              />
            );

          case "range":
            return (
              <FilterRange
                key={filter.minKey}
                filter={filter}
                minParam={filter.minKey}
                maxParam={filter.maxKey}
                pageParam={ADMIN_PAGE_PARAM}
                className="w-full sm:w-64"
              />
            );

          case "select": {
            const current = input[filter.key];

            return (
              <FilterSelect
                key={filter.key}
                filter={filter}
                param={filter.key}
                pageParam={ADMIN_PAGE_PARAM}
                value={typeof current === "string" ? current : null}
                className="w-full sm:w-48"
              />
            );
          }
        }
      })}
    </div>
  );
}

/**
 * A control with uncommitted state: it holds keystrokes the URL does not have
 * yet, which is the whole reason `useQueryParam` exists.
 */
export function FilterSearch({
  filter,
  param,
  pageParam,
  className,
}: {
  filter: SearchFilter;
  /** The parameter this box writes, in the surface's vocabulary. */
  param: string;
  /** The page parameter every change drops. */
  pageParam: string;
  className?: string;
}) {
  const { value, setValue, isPending } = useQueryParam(param, {
    debounceMs: SEARCH_DEBOUNCE_MS,
    resetKeys: [pageParam],
  });

  return (
    <div
      className={cn("relative", className)}
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
export function FilterSelect({
  filter,
  param,
  pageParam,
  value,
  className,
}: {
  filter: SelectFilter;
  /** The parameter this select writes, in the surface's vocabulary. */
  param: string;
  /** The page parameter every change drops. */
  pageParam: string;
  /** The current value, read from the parsed input. */
  value: string | null;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [optimisticValue, setOptimisticValue] = useOptimistic(value);

  return (
    <div className={className} data-pending={isPending ? "" : undefined}>
      <Select
        value={optimisticValue}
        onValueChange={(next: string | null) => {
          // The navigation is a transition, which is what keeps the list from
          // re-suspending: the page renders the old URL until the new server
          // render lands, and dims in the meantime.
          startTransition(() => {
            setOptimisticValue(next);
            router.replace(
              buildFilterHref({
                pathname,
                searchParams,
                values: { [param]: next },
                resetKeys: [pageParam],
              }),
              { scroll: false },
            );
          });
        }}>
        <SelectTrigger aria-label={filter.label} className="w-full">
          <SelectValue>
            {(selected: string | null) =>
              selected === null
                ? (filter.allLabel ?? "—")
                : // A bookmark naming a Category that has since been deleted
                  // still loads: the list returns nothing and the trigger says
                  // so, rather than printing a bare id.
                  (filter.options.find((option) => option.value === selected)
                    ?.label ?? "—")
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {filter.allLabel !== undefined && (
            <SelectItem value={null}>{filter.allLabel}</SelectItem>
          )}
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

/**
 * Two bounds and one navigation (ADR-0044). Debounced on the search box's
 * timing, because a range holds uncommitted keystrokes for the same reason; the
 * boxes hold what was typed, and the list's schema decides what it means —
 * a bound that is not a number is dropped there, not refused here.
 */
export function FilterRange({
  filter,
  minParam,
  maxParam,
  pageParam,
  className,
}: {
  filter: RangeFilter;
  /** The parameters the two bounds write, in the surface's vocabulary. */
  minParam: string;
  maxParam: string;
  /** The page parameter every change drops. */
  pageParam: string;
  className?: string;
}) {
  const { values, setValue, isPending } = useQueryParams(
    [minParam, maxParam],
    { debounceMs: SEARCH_DEBOUNCE_MS, resetKeys: [pageParam] },
  );

  return (
    <div
      role="group"
      aria-label={filter.label}
      className={cn("flex items-center gap-2", className)}
      data-pending={isPending ? "" : undefined}>
      <RangeBound
        label={filter.minLabel}
        unit={filter.unit}
        value={values[minParam]}
        onChange={(value) => setValue(minParam, value)}
      />
      <span aria-hidden className="text-muted-foreground">
        –
      </span>
      <RangeBound
        label={filter.maxLabel}
        unit={filter.unit}
        value={values[maxParam]}
        onChange={(value) => setValue(maxParam, value)}
      />
    </div>
  );
}

function RangeBound({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string | undefined;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      {unit && (
        <span
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
          {unit}
        </span>
      )}
      <Input
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        aria-label={label}
        className={cn("tabular-nums", unit && "pl-8")}
      />
    </div>
  );
}
