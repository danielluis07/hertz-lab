"use client";

import { useMutation } from "@tanstack/react-query";
import { CART_WRITE_SCOPE } from "@/modules/cart/constants";
import { useOptimisticCart } from "@/modules/cart/hooks/use-optimistic-cart";
import { withQuantity } from "@/modules/cart/optimistic";
import { useTRPC } from "@/trpc/client";

/**
 * Set one line's absolute quantity. The line reprices and the totals update
 * the moment it fires; the request queues behind any other Cart write
 * (`CART_WRITE_SCOPE`), so one change per Variant — per Cart, in fact — is in
 * flight at a time. A refusal rolls the line back and the global handler
 * toasts the procedure's sentence.
 *
 * **No success toast** — the changed number is the feedback — and no
 * `router.refresh()`: no Server Component rendered the Cart.
 *
 * `mutate({ variantId, quantity })` with `quantity ≥ 1`. Reaching zero is a
 * removal, which is `useRemoveCartItem`.
 */
export const useSetCartQuantity = () => {
  const trpc = useTRPC();
  const cache = useOptimisticCart();

  return useMutation(
    trpc.cart.setQuantity.mutationOptions({
      scope: CART_WRITE_SCOPE,
      onMutate: ({ variantId, quantity }) =>
        cache.apply((cart) => withQuantity(cart, variantId, quantity)),
      onError: (_error, { variantId }, context) =>
        cache.rollback(context?.snapshot, variantId),
      onSettled: () => cache.settle(),
    }),
  );
};
