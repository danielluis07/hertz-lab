import { Suspense } from "react";
import { requireAuth } from "@/lib/auth-guards";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

/**
 * Protected and dynamic. `proxy.ts` already bounced a visitor with no session
 * cookie; `requireAuth()` is the check that counts (ADR-0006).
 *
 * The page never reads the Cart itself. The dehydrated `cart.get` entry is the
 * only Cart state crossing the RSC boundary, and the client Cart body reads it
 * with `useSuspenseQuery(trpc.cart.get.queryOptions())` — the same key the
 * header badge observes, so every Cart write updates both.
 *
 * No `loading.tsx`: a prefetched dynamic route owns an explicit boundary
 * instead (ADR-0040), and the heading stays outside it so it paints at once.
 */
const CartPage = async () => {
  await requireAuth();

  // Never awaited, so the heading streams ahead of the data.
  prefetch(trpc.cart.get.queryOptions());

  return (
    <HydrateClient>
      <h1>Carrinho</h1>
      {/* TODO(#111, UI): the Cart skeleton as the fallback, and the client Cart
          body as the child. */}
      <Suspense fallback={null}></Suspense>
    </HydrateClient>
  );
};

export default CartPage;
