import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAuth } from "@/lib/auth-guards";
import { CartBody } from "@/modules/cart/components/cart-body";
import { CartSkeleton } from "@/modules/cart/components/cart-skeleton";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Carrinho",
};

/**
 * Protected and dynamic. `proxy.ts` already bounced a visitor with no session
 * cookie; `requireAuth()` is the check that counts (ADR-0006).
 *
 * The page never reads the Cart itself. The dehydrated `cart.get` entry is the
 * only Cart state crossing the RSC boundary, and `CartBody` reads it with
 * `useSuspenseQuery(trpc.cart.get.queryOptions())` — the same key the header
 * badge observes, so every Cart write updates both.
 *
 * No `loading.tsx`: a prefetched dynamic route owns an explicit boundary
 * instead (ADR-0040), and the heading stays outside it so it paints at once.
 */
const CartPage = async () => {
  await requireAuth();

  // Never awaited, so the heading streams ahead of the data.
  prefetch(trpc.cart.get.queryOptions());

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-12 md:py-16">
      <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
        Carrinho
      </h1>
      <HydrateClient>
        <Suspense fallback={<CartSkeleton />}>
          <CartBody />
        </Suspense>
      </HydrateClient>
    </div>
  );
};

export default CartPage;
