"use client";

import { useQueryClient } from "@tanstack/react-query";
import { restoreLine } from "@/modules/cart/optimistic";
import type { Cart } from "@/modules/cart/types";
import { useTRPC } from "@/trpc/client";

/** What an optimistic Cart write hands from `onMutate` to `onError`. */
export type CartWriteContext = { snapshot: Cart | undefined };

/**
 * The cache half shared by the Cart's writes. `cart.get`'s entry is the only
 * client copy of the Cart, and it is what `/carrinho` and the header badge
 * both observe, so this is the whole of what the hooks do to it: move a value
 * in, back out, and hand it back to the server. What the value *becomes* is
 * `optimistic.ts`'s.
 *
 * Every Cart write runs in `CART_WRITE_SCOPE`, so they reach the server one at
 * a time while each one's `onMutate` runs the moment it is fired. A write can
 * therefore have later writes queued behind it, already painted — which is
 * what `rollback` and `settle` both have to respect.
 */
export const useCartCache = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const queryKey = trpc.cart.get.queryKey();

  /** The Cart writes still waiting on the server, the calling one included. */
  const pendingWrites = () =>
    queryClient
      .getMutationCache()
      .findAll({ mutationKey: trpc.cart.pathKey(), status: "pending" })
      .map((mutation) => ({
        context: mutation.state.context as CartWriteContext | undefined,
        variables: mutation.state.variables as { variantId?: string } | undefined,
      }));

  return {
    /**
     * For `onMutate`: stop a read in flight from landing over the change,
     * apply it, and return the pre-write Cart as the mutation's context.
     */
    apply: async (
      transform: (cart: Cart) => Cart,
    ): Promise<CartWriteContext> => {
      await queryClient.cancelQueries({ queryKey });
      const snapshot = queryClient.getQueryData(queryKey);

      if (snapshot) queryClient.setQueryData(queryKey, transform(snapshot));

      return { snapshot };
    },

    /**
     * For `onError`: undo this write on the one line it touched. The failure's
     * toast is the global `MutationCache`'s (ADR-0013).
     *
     * When a later write to the **same** line is queued, the cache is left
     * showing that write — it is the shopper's latest intent, and restoring
     * under it would flash a value they already moved past. That write's
     * snapshot is re-based instead, because it was taken from this write's
     * optimistic value, which the server never held. With nothing queued
     * behind it, the line goes back as this write's snapshot held it, and
     * other lines' in-flight changes stay.
     */
    rollback: (context: CartWriteContext | undefined, variantId: string) => {
      const snapshot = context?.snapshot;
      if (!snapshot) return;

      const queuedOnLine = pendingWrites().filter(
        (write) =>
          write.context !== context &&
          write.context?.snapshot &&
          write.variables?.variantId === variantId,
      );

      for (const { context: queued } of queuedOnLine) {
        // Mutating the queued write's own context object is deliberate: it is
        // the value TanStack will hand to that write's `onError`.
        if (queued?.snapshot) {
          queued.snapshot = restoreLine(queued.snapshot, snapshot, variantId);
        }
      }

      if (queuedOnLine.length > 0) return;

      queryClient.setQueryData(queryKey, (current) =>
        current ? restoreLine(current, snapshot, variantId) : snapshot,
      );
    },

    /**
     * For `onSettled`, on every Cart write: refetch the authoritative Cart —
     * through the path, so the badge's `select` observer is the same entry —
     * once the last queued Cart write has settled. Refetching between two of
     * them would paint the server's answer to the first over the second's
     * optimistic change. This write still counts itself while settling, hence
     * `> 1`.
     */
    settle: () => {
      if (pendingWrites().length > 1) return;

      return queryClient.invalidateQueries(trpc.cart.pathFilter());
    },
  };
};
