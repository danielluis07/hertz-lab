"use client";

/**
 * PROTOTYPE — shape (b), the hard surface's filter island.
 *
 * The module's one hook. Every filter write on the products list goes through
 * `setFilter`, which is where the rule lives: **a filter change drops `page`**.
 *
 * Optimistic state is **per field**, which is what a hand-written hook can do
 * and the engine cannot — the engine's filter list is data, so it must hold one
 * optimistic value for the whole input.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { useQueryParam } from "@/hooks/use-query-param";
import { BRAND_OPTIONS, CATEGORY_OPTIONS } from "../fixtures";
import { PRODUCT_STATUS_OPTIONS, type ProductListInput } from "../params";
import { SearchFilter, SelectFilter } from "./filter-controls";

/** Only the discrete filters — `search` has its own hook. */
type DiscreteKey = "status" | "categoryId" | "brandId";

function useProductListFilters(input: ProductListInput) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startTransition] = useTransition();

  const [status, setOptimisticStatus] = useOptimistic(input.status);
  const [categoryId, setOptimisticCategory] = useOptimistic(input.categoryId);
  const [brandId, setOptimisticBrand] = useOptimistic(input.brandId);

  const search = useQueryParam("search", {
    debounceMs: 300,
    resetKeys: ["page"],
  });

  const setFilter = (key: DiscreteKey, value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");

    startTransition(() => {
      if (key === "status") {
        setOptimisticStatus(value as ProductListInput["status"]);
      } else if (key === "categoryId") {
        setOptimisticCategory(value);
      } else {
        setOptimisticBrand(value);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return {
    search,
    status,
    categoryId,
    brandId,
    setFilter,
    isPending: isNavigating || search.isPending,
  };
}

export function ProductListFilters({ input }: { input: ProductListInput }) {
  const filters = useProductListFilters(input);

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-pending={filters.isPending || undefined}>
      <SearchFilter
        value={filters.search.value}
        onChange={filters.search.setValue}
        placeholder="Buscar produtos..."
      />
      <SelectFilter
        label="Status"
        value={filters.status}
        options={PRODUCT_STATUS_OPTIONS}
        onChange={(value) => filters.setFilter("status", value)}
      />
      <SelectFilter
        label="Categoria"
        value={filters.categoryId}
        options={CATEGORY_OPTIONS}
        onChange={(value) => filters.setFilter("categoryId", value)}
      />
      <SelectFilter
        label="Marca"
        value={filters.brandId}
        options={BRAND_OPTIONS}
        onChange={(value) => filters.setFilter("brandId", value)}
      />
    </div>
  );
}
