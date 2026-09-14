"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { loginHref } from "@/modules/auth/redirects";
import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";

/**
 * `Comprar`: the Cart add, with the session check `useAddToCart` leaves to its
 * call site.
 *
 * - **Signed in** — adds the selected Variant and quantity and stays on the
 *   route. The Cart hook's invalidation moves the frame's badge and raises the
 *   success toast; a refusal reaches the global error tier (ADR-0013).
 * - **Anonymous** — navigates to `/login?retorno=/produto/<slug>` before any
 *   mutation. Nothing is stored for replay: the shopper presses it again on
 *   return.
 * - **Session still resolving** — does nothing rather than guess which of the
 *   two it is. `resolving` lets the button say so.
 */
export function useBuyVariant(productSlug: string) {
  const router = useRouter();
  const { data: session, isPending: resolving } = authClient.useSession();
  const add = useAddToCart();

  const buy = ({
    variantId,
    quantity,
  }: {
    variantId: string;
    quantity: number;
  }) => {
    if (resolving) return;
    if (!session) {
      router.push(loginHref(`/produto/${productSlug}`));
      return;
    }
    add.mutate({ variantId, quantity });
  };

  return { buy, adding: add.isPending, resolving };
}
