"use client";

import { useState } from "react";
import { SlidersHorizontalIcon } from "lucide-react";
import {
  FilterRange,
  FilterSearch,
  FilterSelect,
  type FilterSpec,
} from "@/components/filter-bar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CATALOG_PARAMS } from "@/modules/products/shop/constants";
import { activeFilterCount } from "@/modules/products/shop/filters";
import { formatProductCount } from "@/modules/products/shop/format";
import type { CatalogInput } from "@/modules/products/shop/schemas";

/**
 * The shop's arrangement of the shared filter controls (ADR-0044). The
 * controls carry every rule; this carries only the layout, which is the
 * catalogue's own:
 *
 * - **A `Filtrar` Sheet holds the narrowing controls, at every width**, and
 *   **Ordenar stays outside it** — sorting is a different act from narrowing,
 *   and the one a shopper on a phone reaches for most. The same Sheet on
 *   desktop is what keeps this **one tree**: inline controls there and a Sheet
 *   on a phone would be two copies behind breakpoint classes, with two
 *   debounce timers on one parameter, or a media query that mounts one after
 *   hydration and shifts the bar on every desktop load.
 * - The trigger carries how many of its controls are set, so a closed Sheet
 *   still says the grid is filtered.
 *
 * The Sheet renders into an element of its own inside the page's `group`
 * rather than into `<body>`, and stays mounted while closed. Portalled to
 * `<body>`, a pending control in it would sit outside the `group` its
 * `data-pending` is read by, and the grid would not dim; unmounted on close, a
 * price box still inside its debounce would take the shopper's typing with it.
 */
export function CatalogFilters({
  filters,
  input,
  total,
}: {
  filters: readonly FilterSpec<CatalogInput>[];
  /** The parsed input, where each discrete control reads its current value. */
  input: CatalogInput;
  /** The matching Product count, for the bar and the Sheet's close button. */
  total: number;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const activeCount = activeFilterCount(input);
  const sort = filters.find(
    (filter) => filter.kind === "select" && filter.key === "sort",
  );
  const narrowing = filters.filter((filter) => filter !== sort);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 border-y py-3">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger render={<Button variant="outline" />}>
              <SlidersHorizontalIcon data-icon="inline-start" />
              Filtrar
              {activeCount > 0 && (
                <span className="text-muted-foreground border-l pl-1.5 tabular-nums">
                  <span className="sr-only">ativos: </span>
                  {activeCount}
                </span>
              )}
            </SheetTrigger>

            <SheetContent side="left" container={container} keepMounted>
              <SheetHeader className="border-b">
                <SheetTitle>Filtrar</SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-8 overflow-y-auto px-4 py-2">
                {narrowing.map((filter) => (
                  <SheetControl
                    key={filter.kind === "range" ? filter.minKey : filter.key}
                    filter={filter}
                    input={input}
                  />
                ))}
              </div>

              <SheetFooter className="border-t">
                <SheetClose render={<Button size="lg" className="w-full" />}>
                  Ver {formatProductCount(total)}
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <p className="text-muted-foreground hidden text-sm tabular-nums sm:block">
            {formatProductCount(total)}
          </p>
        </div>

        {sort?.kind === "select" && (
          <div className="flex items-center gap-3">
            {/* The trigger is named by `aria-label`; this is its visible twin. */}
            <span
              aria-hidden
              className="text-muted-foreground hidden text-xs tracking-wide uppercase sm:inline">
              {sort.label}
            </span>
            <FilterSelect
              filter={sort}
              param={CATALOG_PARAMS.sort}
              pageParam={CATALOG_PARAMS.page}
              value={input.sort}
              className="w-44"
            />
          </div>
        )}
      </div>

      <div ref={setContainer} />
    </div>
  );
}

/** One narrowing control in the Sheet, under its visible label. */
function SheetControl({
  filter,
  input,
}: {
  filter: FilterSpec<CatalogInput>;
  input: CatalogInput;
}) {
  switch (filter.kind) {
    case "search":
      return (
        <FilterSearch
          filter={filter}
          param={CATALOG_PARAMS[filter.key]}
          pageParam={CATALOG_PARAMS.page}
        />
      );

    case "range":
      return (
        <div className="flex flex-col gap-3">
          <SheetLabel>{filter.label}</SheetLabel>
          <FilterRange
            filter={filter}
            minParam={CATALOG_PARAMS[filter.minKey]}
            maxParam={CATALOG_PARAMS[filter.maxKey]}
            pageParam={CATALOG_PARAMS.page}
          />
        </div>
      );

    case "select": {
      const current = input[filter.key];

      return (
        <div className="flex flex-col gap-3">
          <SheetLabel>{filter.label}</SheetLabel>
          <FilterSelect
            filter={filter}
            param={CATALOG_PARAMS[filter.key]}
            pageParam={CATALOG_PARAMS.page}
            value={typeof current === "string" ? current : null}
          />
        </div>
      );
    }
  }
}

/**
 * A control's visible name. Hidden from assistive technology because each
 * control already carries the same words as its accessible name.
 */
function SheetLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      aria-hidden
      className="text-muted-foreground text-xs tracking-wide uppercase">
      {children}
    </p>
  );
}
