"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

/**
 * The write behind `/admin/products/[id]`. Like every hook beside it, it owns
 * exactly invalidation and the success toast — facts about the *write* — and
 * nothing about the surface that fired it (`docs/DATA-FLOW.md`).
 *
 * **Navigation is at the call site**, and here it is not navigation at all:
 * the edit form stays where it is and adds `router.refresh()`, because the
 * heading above it was rendered on the server from the same query this
 * invalidation cannot reach.
 *
 * **No `onError`.** The `MutationCache` handler toasts a pt-BR sentence for
 * every failed mutation, and stands down when the error names a field so the
 * form renders it inline (ADR-0013) — which is how a Variant an Order
 * references refuses to be deleted.
 *
 * `pathFilter()` on the **module** rather than the audience: an edit changes
 * what a shopper sees too, and the filter reads blunt while behaving narrow —
 * every products query is marked stale, only the mounted ones refetch.
 */
export const useUpdateProduct = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.products.admin.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.products.pathFilter());
        toast.success("Produto atualizado.");
      },
    }),
  );
};
