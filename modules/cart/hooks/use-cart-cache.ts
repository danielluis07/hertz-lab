"use client";

import { useQueryClient } from "@tanstack/react-query";
import { rollBackWrite } from "@/modules/cart/optimistic";
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
     * For `onError`: undo this write on the one line it touched, leaving
     * other lines' in-flight changes alone — or, when a later write to the
     * same line is queued, re-base that write instead (`rollBackWrite`). The
     * failure's toast is the global `MutationCache`'s (ADR-0013).
     */
    rollback: (context: CartWriteContext | undefined, variantId: string) => {
      const snapshot = context?.snapshot;
      if (!snapshot) return;

      // Writes run one at a time in fire order, so every other pending Cart
      // write was fired after this one.
      const queuedAfter = pendingWrites().filter(
        (write) => write.context !== context,
      );
      const current = queryClient.getQueryData(queryKey) ?? snapshot;

      const { cart, rebased } = rollBackWrite(
        current,
        { variantId, snapshot },
        queuedAfter.map((write) => ({
          variantId: write.variables?.variantId,
          snapshot: write.context?.snapshot,
        })),
      );

      const next = rebased && queuedAfter[rebased.index]?.context;
      // Mutating the queued write's own context object is deliberate: it is
      // the value TanStack will hand to that write's `onError`.
      if (rebased && next) next.snapshot = rebased.snapshot;

      queryClient.setQueryData(queryKey, cart);
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
