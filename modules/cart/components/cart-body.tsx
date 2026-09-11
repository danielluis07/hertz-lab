"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CartLineItem } from "@/modules/cart/components/cart-line";
import { CartSummary } from "@/modules/cart/components/cart-summary";
import { useRemoveCartItem } from "@/modules/cart/hooks/use-remove-cart-item";
import { useSetCartQuantity } from "@/modules/cart/hooks/use-set-cart-quantity";
import { useTRPC } from "@/trpc/client";

/**
 * `/carrinho`'s client body. It reads the `cart.get` entry the page
 * prefetched — the one client copy of the Cart, and the one the header badge
 * observes — and renders it empty or filled.
 *
 * It holds the only instance of each write hook and hands every line what to
 * call. Both writes are optimistic (`useSetCartQuantity`,
 * `useRemoveCartItem`), so there is no pending state to scope per line: the
 * changed number, or the line leaving, is the feedback, and a refusal rolls
 * the line back under the global toast.
 */
export function CartBody() {
  const trpc = useTRPC();
  const { data: cart } = useSuspenseQuery(trpc.cart.get.queryOptions());
  const setQuantity = useSetCartQuantity();
  const removeItem = useRemoveCartItem();

  if (cart.items.length === 0) return <CartEmpty />;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-16">
      <ul aria-label="Itens do carrinho" className="divide-y border-y">
        {cart.items.map((line) => (
          <li key={line.variantId}>
            <CartLineItem
              line={line}
              onSetQuantity={(quantity) =>
                setQuantity.mutate({ variantId: line.variantId, quantity })
              }
              onRemove={() => removeItem.mutate({ variantId: line.variantId })}
            />
          </li>
        ))}
      </ul>

      <CartSummary
        subtotalAmount={cart.subtotalAmount}
        canCheckout={cart.canCheckout}
      />
    </div>
  );
}

/**
 * One sentence and one way out (`docs/STOREFRONT.md`). With nothing to check
 * out, the way to the catalogue is the page's primary action, so it is the
 * one `default` Button.
 */
function CartEmpty() {
  return (
    <div className="flex flex-col items-start gap-6 border-t py-16 md:py-24">
      <div className="flex flex-col gap-2">
        <p className="text-xl font-medium tracking-tight md:text-2xl">
          Seu carrinho está vazio.
        </p>
        <p className="text-muted-foreground">
          Os produtos que você adicionar aparecem aqui.
        </p>
      </div>
      <Button
        size="lg"
        nativeButton={false}
        render={<Link href="/produtos" />}>
        Explorar produtos
      </Button>
    </div>
  );
}
