"use client";

import { useOptimistic, useTransition } from "react";
import { useArchiveProduct } from "@/modules/products/admin/hooks/use-archive-product";
import { usePublishProduct } from "@/modules/products/admin/hooks/use-publish-product";
import { productStatusOptions } from "@/modules/products/admin/status-options";
import type { ProductStatus } from "@/modules/products/constants";

/** Optimism belongs to this cell, never to a snapshot of the paginated list. */
export function useProductStatus(id: string, status: ProductStatus) {
  const publish = usePublishProduct();
  const archive = useArchiveProduct();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [isPending, startTransition] = useTransition();
  const options = productStatusOptions(status);

  const changeStatus = (next: ProductStatus | null) => {
    if (isPending || next === null || next === status) return;
    if (!options.some(({ value }) => value === next)) return;

    startTransition(async () => {
      setOptimisticStatus(next);
      try {
        // Mutation hooks await reconciliation before this optimistic layer ends.
        if (next === "active") await publish.mutateAsync({ id });
        else if (next === "archived") await archive.mutateAsync({ id });
      } catch {
        // The global MutationCache reports the error. Ending the action rolls
        // back only this cell; another Product's success is never overwritten.
      }
    });
  };

  return { status: optimisticStatus, isPending, options, changeStatus };
}
