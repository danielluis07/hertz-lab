"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

/**
 * The write behind `/admin/categories/[id]`. Like `useCreateCategory` beside
 * it, it owns exactly invalidation and the success toast — facts about the
 * *write* — and nothing about the surface that fired it
 * (`docs/DATA-FLOW.md`).
 *
 * **Navigation is at the call site**, and here it is not navigation at all:
 * the edit form stays on the page and adds `router.refresh()`, because the
 * heading above it was rendered on the server from the same query this
 * invalidation cannot reach.
 *
 * **No `onError`.** The `MutationCache` handler toasts a pt-BR sentence for
 * every failed mutation, and stands down when the error names a field so the
 * form renders it inline (ADR-0013) — which is how the tree's refusals land
 * under the parent Select that caused them.
 *
 * `pathFilter()` on the **module** rather than the audience: a Category an
 * Admin renames is a browse node a shopper walks through, so the write reaches
 * further than the admin list it was fired from.
 */
export const useUpdateCategory = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.categories.admin.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.categories.pathFilter());
        toast.success("Categoria atualizada.");
      },
    }),
  );
};
