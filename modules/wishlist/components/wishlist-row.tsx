"use client";

import Link from "next/link";
import { ShoppingBagIcon, Trash2Icon } from "lucide-react";
import { CatalogImage } from "@/components/catalog-image";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/utils/format";
import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import {
  canAddWishlistItemToCart,
  isWishlistProductLinked,
  wishlistAvailability,
  wishlistUnavailableReason,
} from "@/modules/wishlist/availability";
import { useUnsaveWishlistItem } from "@/modules/wishlist/hooks/use-unsave-wishlist-item";
import type { WishlistItem } from "@/modules/wishlist/types";

/**
 * One saved Variant: Cover, Product and Variant names, current price, why it
 * cannot be bought when it cannot, add-to-Cart when it can, and removal
 * (`docs/STOREFRONT.md`).
 *
 * The row owns its own write hooks, so each button's pending state is this
 * row's alone. Neither write is optimistic: removal keeps the row, disabled,
 * until the refetched list drops it, and adding to the Cart leaves the entry
 * saved.
 *
 * Archived and sold-out entries stay, told apart by their reason in the
 * destructive foreground and a muted Cover — never by a badge or a fill
 * (DESIGN.md). Add-to-Cart is `outline`: a list of up to 24 rows cannot each
 * carry the page's one vermilion fill.
 */
export function WishlistRow({ item }: { item: WishlistItem }) {
  const addToCart = useAddToCart();
  const unsave = useUnsaveWishlistItem();

  const availability = wishlistAvailability(item);
  const reason = wishlistUnavailableReason(availability);
  const label = `${item.productName}, ${item.variantName}`;

  return (
    <article className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 py-6 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-6">
      <div
        className={cn(
          "self-start overflow-hidden rounded-lg border",
          reason && "opacity-60",
        )}>
        <CatalogImage
          s3Key={item.coverS3Key}
          alt={item.coverAltText ?? ""}
          sizes="(min-width: 640px) 112px, 80px"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-base font-medium break-words">
              {/* An archived Product's route is a 404, so its entry names it
                  without sending the shopper there. */}
              {isWishlistProductLinked(availability) ? (
                <Link
                  href={`/produto/${item.productSlug}`}
                  className="decoration-1 underline-offset-4 hover:underline focus-visible:underline">
                  {item.productName}
                </Link>
              ) : (
                item.productName
              )}
            </h2>
            <p className="text-muted-foreground text-sm break-words">
              <span className="sr-only">Variação: </span>
              {item.variantName}
            </p>
          </div>

          <p
            className={cn(
              "shrink-0 text-base font-medium tabular-nums",
              reason && "text-muted-foreground",
            )}>
            {formatBRL(item.priceAmount)}
          </p>
        </div>

        {reason && <p className="text-destructive text-sm">{reason}</p>}

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {canAddWishlistItemToCart(availability) ? (
            <Button
              variant="outline"
              size="lg"
              disabled={addToCart.isPending}
              onClick={() =>
                addToCart.mutate({ variantId: item.variantId, quantity: 1 })
              }>
              {addToCart.isPending ? (
                <Spinner data-icon="inline-start" aria-hidden />
              ) : (
                <ShoppingBagIcon data-icon="inline-start" />
              )}
              Adicionar ao carrinho
              <span className="sr-only"> {label}</span>
            </Button>
          ) : (
            // Keeps Remover on the right edge when there is nothing to buy.
            <span aria-hidden />
          )}

          {/* Destructive, so a ghost in the destructive foreground and never
              a fill beside the Cart action (DESIGN.md). */}
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive -mr-2.5"
            disabled={unsave.isPending}
            onClick={() => unsave.mutate({ variantId: item.variantId })}>
            {unsave.isPending ? (
              <Spinner data-icon="inline-start" aria-hidden />
            ) : (
              <Trash2Icon data-icon="inline-start" />
            )}
            Remover
            <span className="sr-only"> {label} dos favoritos</span>
          </Button>
        </div>
      </div>
    </article>
  );
}
