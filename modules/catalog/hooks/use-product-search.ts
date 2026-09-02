"use client";

import { useQueryParam } from "@/hooks/use-query-param";
import { SHOP_PARAMS } from "@/modules/catalog/constants";

/**
 * The storefront's product search box, bound to `?busca=`.
 *
 * Changing the search resets `?pagina=`: page 4 of the old results is not page
 * 4 of the new ones.
 */
export function useProductSearch() {
  return useQueryParam(SHOP_PARAMS.search, {
    debounceMs: 500,
    resetKeys: [SHOP_PARAMS.page],
  });
}
