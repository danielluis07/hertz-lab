"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CART_WRITE_SCOPE } from "@/modules/cart/constants";
import { useTRPC } from "@/trpc/client";

/**
 * Add units of a Variant to the Cart. **Not optimistic**: the page firing it
 * holds no Cart to edit, and whether the add fits the stock is the server's
 * to say — so it waits, then invalidates the Cart path (which is what moves
 * the header badge) and raises the only success toast any Cart write has.
 *
 * `mutate({ variantId, quantity })`.
 *
 * **Signed-in shoppers only.** There is no guest Cart, and this hook does not
 * read the session: the call site checks it before firing and sends an
 * anonymous visitor to `/login?retorno=/produto/<slug>` instead, through the
 * auth module's return helper. Nothing about the add is stored for replay —
 * the shopper presses it again on return.
 */
export const useAddToCart = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.cart.add.mutationOptions({
      scope: CART_WRITE_SCOPE,
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.cart.pathFilter());
        toast.success("Adicionado ao carrinho.");
      },
    }),
  );
};
