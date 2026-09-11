import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/utils/format";
import type { Cart } from "@/modules/cart/types";

/**
 * The merchandise subtotal and the way to `/checkout` — and nothing checkout
 * owns: no Coupon, discount, shipping or final total (`docs/STOREFRONT.md`).
 *
 * "Finalizar compra" is the page's one `default` Button, its one vermilion
 * fill (DESIGN.md). While any line is unavailable it stays in place, disabled
 * and described by the sentence saying why, rather than vanishing from under
 * the shopper looking for it.
 */
export function CartSummary({
  subtotalAmount,
  canCheckout,
}: Pick<Cart, "subtotalAmount" | "canCheckout">) {
  return (
    <section
      aria-labelledby="cart-summary-title"
      className="flex flex-col gap-6 rounded-lg border p-6 lg:sticky lg:top-8">
      <h2
        id="cart-summary-title"
        className="text-muted-foreground text-xs tracking-wide uppercase">
        Resumo
      </h2>

      <dl>
        <div className="flex items-baseline justify-between gap-4">
          <dt>Subtotal</dt>
          <dd className="text-xl font-medium tracking-tight tabular-nums md:text-2xl">
            {formatBRL(subtotalAmount)}
          </dd>
        </div>
      </dl>

      <p className="text-muted-foreground text-sm">
        Frete e cupom de desconto são calculados na finalização da compra.
      </p>

      {canCheckout ? (
        <Button
          size="lg"
          className="h-11 w-full text-base"
          nativeButton={false}
          render={<Link href="/checkout" />}>
          Finalizar compra
        </Button>
      ) : (
        <div className="flex flex-col gap-3">
          <p id="cart-checkout-blocked" className="text-sm">
            Itens indisponíveis não entram no subtotal. Ajuste ou remova esses
            itens para finalizar a compra.
          </p>
          <Button
            size="lg"
            className="h-11 w-full text-base"
            disabled
            aria-describedby="cart-checkout-blocked">
            Finalizar compra
          </Button>
        </div>
      )}

      <Link
        href="/produtos"
        className="self-center text-sm decoration-1 underline-offset-4 hover:underline focus-visible:underline">
        Continuar comprando
      </Link>
    </section>
  );
}
