"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PaginationNav } from "@/components/pagination-nav";
import { Button } from "@/components/ui/button";
import { WishlistRow } from "@/modules/wishlist/components/wishlist-row";
import {
  WISHLIST_PARAMS,
  WISHLIST_PATH,
  WISHLIST_PER_PAGE,
} from "@/modules/wishlist/constants";
import type { WishlistListInput } from "@/modules/wishlist/schemas";
import { useTRPC } from "@/trpc/client";

/**
 * `/minha-conta/favoritos`'s client body. It reads the `wishlist.list` page the
 * route prefetched, under the key built from the same parsed `input`, so the
 * server and client caches cannot disagree about which page this is.
 *
 * Every write here waits for the server: a removed entry leaves, and a saved
 * one appears, only when the refetched list says so (`useUnsaveWishlistItem`).
 * An out-of-range page is not a 404 but the empty view (ADR-0041).
 */
export function WishlistBody({ input }: { input: WishlistListInput }) {
  const trpc = useTRPC();
  const {
    data: { items, total },
  } = useSuspenseQuery(trpc.wishlist.list.queryOptions(input));

  if (items.length === 0) return <WishlistEmpty pastTheEnd={total > 0} />;

  return (
    <div className="flex flex-col gap-16">
      <ul aria-label="Variações salvas" className="divide-y border-y">
        {items.map((item) => (
          <li key={item.variantId}>
            <WishlistRow item={item} />
          </li>
        ))}
      </ul>

      <PaginationNav
        pathname={WISHLIST_PATH}
        searchParams={new URLSearchParams()}
        paramKey={WISHLIST_PARAMS.page}
        page={input.page}
        totalPages={Math.ceil(total / WISHLIST_PER_PAGE)}
      />
    </div>
  );
}

/**
 * One sentence and the way to the catalogue, in both cases
 * (`docs/STOREFRONT.md`). With nothing listed, that is the page's primary
 * action and so its one `default` Button; a page past the end also offers the
 * first page.
 */
function WishlistEmpty({ pastTheEnd }: { pastTheEnd: boolean }) {
  return (
    <div className="flex flex-col items-start gap-6 border-t py-16 md:py-24">
      <div className="flex flex-col gap-2">
        <p className="text-xl font-medium tracking-tight md:text-2xl">
          {pastTheEnd
            ? "Esta página não tem favoritos."
            : "Você ainda não salvou nenhum favorito."}
        </p>
        <p className="text-muted-foreground">
          {pastTheEnd
            ? "Seus favoritos estão nas páginas anteriores."
            : "As variações que você salvar na página de um produto aparecem aqui."}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href="/produtos" />}>
          Explorar produtos
        </Button>
        {/* Past the end there is no pagination to walk back with. */}
        {pastTheEnd && (
          <Button
            variant="outline"
            size="lg"
            nativeButton={false}
            render={<Link href={WISHLIST_PATH} />}>
            Voltar para a primeira página
          </Button>
        )}
      </div>
    </div>
  );
}
