"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

/**
 * The one write in this module that makes a row go away (ADR-0023, by its
 * amendment). Like `useCreateBrand` and `useUpdateBrand` beside it, it owns
 * exactly invalidation and the success toast — facts about the *write* — and
 * nothing about the surface that fired it (`docs/DATA-FLOW.md`).
 *
 * **No `onError`.** The `MutationCache` handler toasts a pt-BR sentence for
 * every failed mutation (ADR-0013), and the two refusals this write can throw
 * name no field — there is no form, the Admin is looking at a row — so a toast
 * is where they belong and the global tier is what renders them.
 *
 * **No navigation and no `router.refresh()`.** The row leaves the table the
 * Admin is already on, and the list page renders nothing from a server read —
 * it only `prefetch`es — so the invalidation below reaches every copy of the
 * row there is (`docs/DATA-FLOW.md`, "staying put").
 *
 * `pathFilter()` on the **module** rather than the audience: a Brand an Admin
 * deletes is a filter a shopper narrows the catalogue by, so the write reaches
 * further than the admin list it was fired from.
 */
export const useRemoveBrand = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.brands.admin.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.brands.pathFilter());
        toast.success("Marca excluída.");
      },
    }),
  );
};
