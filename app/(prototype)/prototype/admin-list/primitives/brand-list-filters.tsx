"use client";

/**
 * PROTOTYPE — shape (b), the easy surface's filter island.
 *
 * The only client component on the brands list. Everything else — header row,
 * cells, pagination — stays on the server.
 */

import { useQueryParam } from "@/hooks/use-query-param";
import { SearchFilter } from "./filter-controls";

export function BrandListFilters() {
  const search = useQueryParam("search", {
    debounceMs: 300,
    resetKeys: ["page"],
  });

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-pending={search.isPending || undefined}>
      <SearchFilter
        value={search.value}
        onChange={search.setValue}
        placeholder="Buscar marcas..."
      />
    </div>
  );
}
