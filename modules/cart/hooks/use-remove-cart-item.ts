"use client";

import { useMutation } from "@tanstack/react-query";
import { CART_WRITE_SCOPE } from "@/modules/cart/constants";
import { useCartCache } from "@/modules/cart/hooks/use-cart-cache";
import { withoutLine } from "@/modules/cart/optimistic";
import { useTRPC } from "@/trpc/client";

/**
 * Remove one line. It leaves the list and the totals at once; a failure puts
 * it back where it was. A direct write with no confirmation step — the line
 * is one click away from being added again — and no success toast, because
 * the line disappearing is the feedback.
 *
 * `mutate({ variantId })`.
 */
export const useRemoveCartItem = () => {
  const trpc = useTRPC();
  const cache = useCartCache();

  return useMutation(
    trpc.cart.remove.mutationOptions({
      scope: CART_WRITE_SCOPE,
      onMutate: ({ variantId }) =>
        cache.apply((cart) => withoutLine(cart, variantId)),
      onError: (_error, { variantId }, context) =>
        cache.rollback(context, variantId),
      onSettled: () => cache.settle(),
    }),
  );
};
