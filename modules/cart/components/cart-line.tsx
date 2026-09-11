import Link from "next/link";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { CatalogImage } from "@/components/catalog-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/utils/format";
import { isProductOnSale } from "@/modules/cart/availability";
import { formatUnits, unavailableReason } from "@/modules/cart/format";
import { quantitySteps } from "@/modules/cart/quantity";
import type { CartLine } from "@/modules/cart/types";

/**
 * One Cart line: Cover, names, current unit price, line total, the quantity
 * control, removal, and — when the line cannot be bought now — why
 * (`docs/STOREFRONT.md`). It owns no write: `CartBody` holds the one instance
 * of each Cart hook and hands this line what to call, so a line leaving the
 * list mid-removal takes nothing with it.
 *
 * An unavailable line keeps its place and its quantity. It is told apart by
 * its reason in the destructive foreground and a line total set back in
 * muted ink — the subtotal leaves it out — never by a badge or a fill
 * (DESIGN.md).
 */
export function CartLineItem({
  line,
  onSetQuantity,
  onRemove,
}: {
  line: CartLine;
  onSetQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const { decrease, increase, correction } = quantitySteps(line);
  const reason = unavailableReason(line);
  const label = `${line.productName}, ${line.variantName}`;

  return (
    <article className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 py-6 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-6">
      <div
        className={cn(
          "self-start overflow-hidden rounded-lg border",
          reason && "opacity-60",
        )}>
        <CatalogImage
          s3Key={line.coverS3Key}
          alt={line.coverAltText ?? ""}
          sizes="(min-width: 640px) 112px, 80px"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-base font-medium break-words">
              {/* An archived Product's route is a 404, so its line names it
                  without sending the shopper there. */}
              {isProductOnSale(line.availability) ? (
                <Link
                  href={`/produto/${line.productSlug}`}
                  className="decoration-1 underline-offset-4 hover:underline focus-visible:underline">
                  {line.productName}
                </Link>
              ) : (
                line.productName
              )}
            </h2>
            <p className="text-muted-foreground text-sm">{line.variantName}</p>
            <p className="text-muted-foreground text-sm tabular-nums">
              {formatBRL(line.unitPriceAmount)} cada
            </p>
          </div>

          <p
            className={cn(
              "shrink-0 text-base font-medium tabular-nums",
              reason && "text-muted-foreground",
            )}>
            {reason && <span className="sr-only">Fora do subtotal: </span>}
            {formatBRL(line.lineTotalAmount)}
          </p>
        </div>

        {reason && (
          <p className="text-destructive flex flex-wrap items-baseline gap-x-2 text-sm">
            {reason}
            {correction !== null && (
              <Button
                variant="link"
                className="text-foreground h-auto px-0"
                onClick={() => onSetQuantity(correction)}>
                Ajustar para {formatUnits(correction)}
              </Button>
            )}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div
            role="group"
            aria-label={`Quantidade de ${label}`}
            className="flex h-9 items-center rounded-lg border">
            <StepButton
              to={decrease}
              onStep={onSetQuantity}
              label="Diminuir quantidade">
              <MinusIcon />
            </StepButton>
            <span
              aria-live="polite"
              className="min-w-8 px-1 text-center text-sm tabular-nums">
              {line.quantity}
            </span>
            <StepButton
              to={increase}
              onStep={onSetQuantity}
              label="Aumentar quantidade">
              <PlusIcon />
            </StepButton>
          </div>

          {/* Destructive, so a ghost in the destructive foreground and never
              a fill beside the checkout button (DESIGN.md). */}
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive -mr-2.5"
            onClick={onRemove}>
            <Trash2Icon data-icon="inline-start" />
            Remover
            <span className="sr-only"> {label} do carrinho</span>
          </Button>
        </div>
      </div>
    </article>
  );
}

/**
 * One side of the quantity control. `to` is the absolute quantity it sends,
 * or `null` when there is none the server would take (`quantitySteps`) — and
 * then it is disabled rather than fired into a refusal.
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
