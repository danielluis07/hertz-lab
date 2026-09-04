"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

/**
 * The withdrawal half of the pair — see `use-publish-product.ts` for why the
 * filter is the module's path and why there is no `onError` here.
 *
 * It invalidates the same path for the same reason read from the other side:
 * an archived Product leaves the shop, so the shop's queries are as stale as
 * the admin list that fired this.
 */
export const useArchiveProduct = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.products.admin.archive.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.products.pathFilter());
        toast.success("Produto arquivado.");
      },
    }),
  );
};
