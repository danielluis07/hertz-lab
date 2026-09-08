"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

/**
 * The write behind the "Nova marca" dialog. It owns exactly invalidation and
 * the success toast — facts about the *write* — and nothing about the surface
 * that fired it (`docs/DATA-FLOW.md`).
 *
 * **Closing the dialog is at the call site**, which is where the `open` state
 * lives (ADR-0026). There is no navigation to own here at all: a Brand has no
 * page of its own, which is half of why its form is a dialog.
 *
 * **No `onError`.** The `MutationCache` handler toasts a pt-BR sentence for
 * every failed mutation, and stands down when the error names a field so the
 * form can render it inline (ADR-0013) — which is how a duplicate name lands
 * under the input that caused it. The wrapper adds that one call-site
 * `onError`; there is nothing for a hook to add.
 *
 * `pathFilter()` on the **module** rather than the audience: a Brand an Admin
 * creates is a filter a shopper narrows the catalogue by, so the write reaches
 * further than the admin list it was fired from.
 */
export const useCreateBrand = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.brands.admin.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.brands.pathFilter());
        toast.success("Marca criada.");
      },
    }),
  );
};
