"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

/**
 * The write behind the "Editar" dialog in a row. Like `useCreateBrand` beside
 * it, it owns exactly invalidation and the success toast — facts about the
 * *write* — and nothing about the surface that fired it
 * (`docs/DATA-FLOW.md`).
 *
 * **No `router.refresh()` anywhere in this module.** The list page renders a
 * heading and nothing from a server *read* — it only `prefetch`es — so the
 * invalidation below reaches every copy of the row there is
 * (`docs/DATA-FLOW.md`, "After the write"). The renamed Brand is in the table
 * without a reload.
 *
 * That invalidation is also what makes the dialog's remount correct: the next
 * time this row's form opens, its `defaultValues` are read off a row that has
 * already been refetched (ADR-0026).
 *
 * **No `onError`.** The `MutationCache` handler toasts a pt-BR sentence for
 * every failed mutation, and stands down when the error names a field so the
 * form renders it inline (ADR-0013).
 *
 * `pathFilter()` on the **module** rather than the audience: a Brand an Admin
 * renames is a filter a shopper narrows the catalogue by, so the write reaches
 * further than the admin list it was fired from.
 */
export const useUpdateBrand = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.brands.admin.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.brands.pathFilter());
        toast.success("Marca atualizada.");
      },
    }),
  );
};
