"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

/**
 * The one write in this module that makes a row go away (ADR-0023). Like
 * `useCreateCategory` and `useUpdateCategory` beside it, it owns exactly
 * invalidation and the success toast — facts about the *write* — and nothing
 * about the surface that fired it (`docs/DATA-FLOW.md`).
 *
 * **No `onError`.** The `MutationCache` handler toasts a pt-BR sentence for
 * every failed mutation (ADR-0013), and the two refusals this write can throw
 * name no field — there is no form, the Admin is looking at a row — so a toast
 * is where they belong and the global tier is what renders them.
 *
 * **No navigation either**, unlike the create form's push: the row leaves the
 * table the Admin is already on, and the list is entirely hydrated, so the
 * invalidation below is the whole of what happens after
 * (`docs/DATA-FLOW.md`'s "staying put").
 *
 * `pathFilter()` on the **module** rather than the audience: a Category an
 * Admin deletes is a browse node a shopper walks through, so the write reaches
 * further than the admin list it was fired from.
 */
export const useRemoveCategory = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.categories.admin.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.categories.pathFilter());
        toast.success("Categoria excluída.");
      },
    }),
  );
};
