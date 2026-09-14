import { useId } from "react";
import { MinusIcon, PlusIcon, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/utils/format";
import { ratingSummary } from "@/modules/products/shop/format";
import type { useProductPurchase } from "@/modules/products/shop/hooks/use-product-purchase";
import type { ProductPurchaseFields } from "@/modules/products/shop/types";
import { WishlistControl } from "@/modules/wishlist/components/wishlist-control";

/**
 * The Buy panel: Brand, the page's `<h1>`, rating summary, the selected
 * Variant's price, Variant selection, stock, quantity, `Comprar` and the
 * Wishlist control (`docs/STOREFRONT.md`). Render only — the state and every
 * rule it follows arrive through `purchase`.
 *
 * `Comprar` is the page's one vermilion element (DESIGN.md). Everything else
 * here is ink on paper: Variants are hairline choices, the stepper and the
 * Wishlist heart are outlines.
 */
export function ProductBuyPanel({
  product,
  purchase,
  onBuy,
  adding,
  resolving,
}: {
  product: ProductPurchaseFields;
  purchase: ReturnType<typeof useProductPurchase>;
  onBuy: () => void;
  adding: boolean;
  /** The session is still resolving, so a press could not be routed yet. */
  resolving: boolean;
}) {
  const variantGroupName = useId();
  const rating = ratingSummary(product);
  const { variant, price, buyable, steps } = purchase;

  return (
    <div className="flex flex-col gap-8 lg:sticky lg:top-8 lg:self-start">
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          {product.brandName}
        </p>
        <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
          {product.name}
        </h1>
        <a
          href="#avaliacoes"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm decoration-1 underline-offset-4 transition-colors duration-150 ease-out hover:underline motion-reduce:transition-none">
          {rating ? (
            <>
              <StarIcon aria-hidden className="text-foreground size-4 fill-current" />
              <span aria-hidden className="text-foreground tabular-nums">
                {rating.average}
              </span>
              <span aria-hidden>({rating.count})</span>
              <span className="sr-only">
                Nota média {rating.average} de 5, {rating.count}
              </span>
            </>
          ) : (
            "Ainda sem avaliações"
          )}
        </a>
      </div>

      <p className="flex flex-wrap items-baseline gap-x-3 tabular-nums">
        <span className="text-2xl font-medium">{formatBRL(price.amount)}</span>
        {price.compareAt !== null && (
          <s className="text-muted-foreground">
            {/* A strike-through is not announced; the words are. */}
            <span className="sr-only">Preço anterior: </span>
            {formatBRL(price.compareAt)}
          </s>
        )}
      </p>

      <div className="flex flex-col gap-6 border-t pt-6">
        {product.variants.length > 1 && (
          <fieldset>
            <legend className="text-muted-foreground mb-3 text-xs tracking-wide uppercase">
              Variação:{" "}
              <span className="text-foreground text-sm tracking-normal normal-case">
                {variant.name}
              </span>
            </legend>
            {/* Native radios, visually hidden: arrow keys, one tab stop and
                the checked state come from the platform. */}
            <div className="flex flex-wrap gap-2">
              {product.variants.map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    "has-focus-visible:outline-ring hover:bg-muted has-checked:border-foreground inline-flex h-9 cursor-pointer items-center rounded-lg border px-3 text-sm transition-colors duration-150 ease-out has-focus-visible:outline-2 has-focus-visible:outline-offset-2 motion-reduce:transition-none",
                    option.stockQuantity <= 0 && "text-muted-foreground",
                  )}>
                  <input
                    type="radio"
                    name={variantGroupName}
                    value={option.id}
                    checked={option.id === variant.id}
                    onChange={() => purchase.selectVariant(option.id)}
                    className="sr-only"
                  />
                  {option.name}
                  {option.stockQuantity <= 0 && (
                    <span className="sr-only"> (esgotada)</span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex flex-col gap-3">
          <p role="status" className="text-sm">
            {buyable ? (
              "Em estoque"
            ) : (
              <>
                <span className="font-medium">Esgotado.</span>{" "}
                <span className="text-muted-foreground">
                  Salve nos favoritos para encontrar esta opção depois.
                </span>
              </>
            )}
          </p>

          {/* Rendered at zero stock too, both sides disabled, so switching
              Variants never moves the button below it. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div
              role="group"
              aria-label="Quantidade"
              aria-disabled={!buyable}
              className={cn(
                "flex h-9 items-center rounded-lg border",
                !buyable && "text-muted-foreground",
              )}>
              <StepButton
                to={steps.decrease}
                onStep={purchase.setQuantity}
                label="Diminuir quantidade">
                <MinusIcon />
              </StepButton>
              <span
                aria-live="polite"
                className="min-w-10 px-1 text-center text-sm tabular-nums">
                {purchase.quantity}
              </span>
              <StepButton
                to={steps.increase}
                onStep={purchase.setQuantity}
                label="Aumentar quantidade">
                <PlusIcon />
              </StepButton>
            </div>
            {buyable && steps.increase === null && (
              <p className="text-muted-foreground text-sm">
                Quantidade máxima disponível
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            size="lg"
            className="h-11 flex-1 text-base"
            // Disabled while the session resolves rather than swallowing a
            // press that could not yet tell a shopper from a visitor.
            disabled={!buyable || adding || resolving}
            focusableWhenDisabled
            aria-busy={adding || (buyable && resolving)}
            onClick={onBuy}>
            {adding && <Spinner aria-hidden data-icon="inline-start" />}
            Comprar
          </Button>
          <WishlistControl
            variantId={variant.id}
            productSlug={product.slug}
            className="size-11"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * One side of the quantity stepper. `to` is the absolute quantity it sets, or
 * `null` at a bound — and then it is disabled rather than clamped silently.
 */
function StepButton({
  to,
  onStep,
  label,
  children,
}: {
  to: number | null;
  onStep: (quantity: number) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9 rounded-none first:rounded-l-lg last:rounded-r-lg"
      aria-label={label}
      disabled={to === null}
      onClick={() => {
        if (to !== null) onStep(to);
      }}>
      {children}
    </Button>
  );
}
