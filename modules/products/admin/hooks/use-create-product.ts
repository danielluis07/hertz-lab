"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

/**
 * The write behind `/admin/products/new`. Like the two transitions beside it,
 * it owns exactly invalidation and the success toast — facts about the *write*
 * — and nothing about the surface that fired it (`docs/DATA-FLOW.md`).
 *
 * **Navigation is at the call site.** Where an Admin goes after a save differs
 * per surface, and the third tier is the one that knows: the create form
 * pushes to the new Product's page from its own `onSuccess`.
 *
 * **No `onError`.** The `MutationCache` handler toasts a pt-BR sentence for
 * every failed mutation, and stands down when the error names a field so the
 * form can render it inline (ADR-0013). The form adds that one call-site
 * `onError`; there is nothing for a hook to add.
 *
 * `pathFilter()` on the **module** rather than the audience, for the reason
 * `use-publish-product.ts` gives: it reads blunt and behaves narrow, and a new
 * Product is a row the admin list has to show even though the shop does not
 * see a draft.
 */
export const useCreateProduct = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.products.admin.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.products.pathFilter());
        toast.success("Produto criado.");
      },
    }),
  );
};
