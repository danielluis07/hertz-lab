import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth-guards";
import { WishlistBody } from "@/modules/wishlist/components/wishlist-body";
import { WishlistSkeleton } from "@/modules/wishlist/components/wishlist-skeleton";
import { parseWishlistListParams } from "@/modules/wishlist/schemas";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Favoritos",
};

/**
 * Protected and dynamic. `proxy.ts` already bounced a visitor with no session
 * cookie; `requireUser()` is the check that counts (ADR-0006).
 *
 * `?pagina=` is parsed once, here, and the same object is both the prefetch
 * input and `WishlistBody`'s prop, so the dehydrated entry and the client's
 * `useSuspenseQuery` share one key (ADR-0011). A write on the client
 * invalidates it, which is why it is hydrated rather than read by `caller`
 * (ADR-0032).
 *
 * No `loading.tsx`: a prefetched dynamic route owns an explicit boundary
 * instead (ADR-0040), and the heading stays outside it so it paints at once.
 */
const WishlistPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  await requireUser();

  const input = parseWishlistListParams(await searchParams);

  // Never awaited, so the heading streams ahead of the data.
  prefetch(trpc.wishlist.list.queryOptions(input));

  return (
    <div className="flex w-full flex-col gap-8">
      <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
        Favoritos
      </h1>
      <HydrateClient>
        <Suspense fallback={<WishlistSkeleton />}>
          <WishlistBody input={input} />
        </Suspense>
      </HydrateClient>
    </div>
  );
};

export default WishlistPage;
