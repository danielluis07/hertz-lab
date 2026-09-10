"use client";

import { useQueryClient } from "@tanstack/react-query";
import { restoreLine } from "@/modules/cart/optimistic";
import type { Cart } from "@/modules/cart/types";
import { useTRPC } from "@/trpc/client";

/**
 * The cache half shared by the Cart's two optimistic writes,
 * `useSetCartQuantity` and `useRemoveCartItem`. `cart.get`'s entry is the only
 * client copy of the Cart, and it is what `/carrinho` and the header badge
 * both observe, so this is the whole of what "optimistic" means here: move a
 * value into that entry, back out of it, and hand it back to the server. What
 * the value *becomes* is `optimistic.ts`'s.
 */
export const useOptimisticCart = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const queryKey = trpc.cart.get.queryKey();

  return {
    /**
     * For `onMutate`: stop a read in flight from landing over the change,
     * apply it, and return the pre-write Cart as the mutation's context.
     */
    apply: async (
      transform: (cart: Cart) => Cart,
    ): Promise<{ snapshot: Cart | undefined }> => {
      await queryClient.cancelQueries({ queryKey });
      const snapshot = queryClient.getQueryData(queryKey);

      if (snapshot) queryClient.setQueryData(queryKey, transform(snapshot));

      return { snapshot };
    },

    /**
     * For `onError`: put back the one line this write touched, as the
     * snapshot held it, leaving other lines' in-flight changes alone. The
     * failure's toast is the global `MutationCache`'s (ADR-0013).
     */
    rollback: (snapshot: Cart | undefined, variantId: string) => {
      if (!snapshot) return;

      queryClient.setQueryData(queryKey, (current) =>
        current ? restoreLine(current, snapshot, variantId) : snapshot,
      );
    },

    /**
     * For `onSettled`: refetch the authoritative Cart — through the path, so
     * the badge's `select` observer is the same entry — but only once the
     * last queued Cart write has settled. Refetching between two of them
     * would briefly paint the server's answer to the first over the second's
     * optimistic change. This write still counts itself while settling,
     * hence `1`.
     */
    settle: () => {
      if (queryClient.isMutating({ mutationKey: trpc.cart.pathKey() }) > 1) {
        return;
      }

      return queryClient.invalidateQueries(trpc.cart.pathFilter());
    },
  };
};
