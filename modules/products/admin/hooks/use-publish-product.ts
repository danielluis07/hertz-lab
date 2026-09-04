"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

/**
 * One hook per write, named for the verb, owning exactly two things:
 * invalidation and the success toast (`docs/DATA-FLOW.md`).
 *
 * `pathFilter()` on the **module** rather than the audience — publishing a
 * Product changes what a shopper sees too. It reads blunt and behaves narrow:
 * `invalidateQueries` marks every products query stale but refetches only the
 * *active* ones, which on this page is the one list a mounted table observes.
 *
 * **No `onError`.** The `MutationCache` handler toasts a pt-BR sentence for
 * every failed mutation in the app, so a refused transition already speaks
 * (ADR-0013). Navigation is the call site's, and there is none here: the row
 * that fired this stays where it is.
 */
export const usePublishProduct = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.products.admin.publish.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.products.pathFilter());
        toast.success("Produto publicado.");
      },
    }),
  );
};
