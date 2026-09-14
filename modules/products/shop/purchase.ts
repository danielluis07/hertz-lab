import { cardPrice } from "@/modules/products/shop/card";

/**
 * The product page's purchase rules: which Variant is selected, which of its
 * photographs is showing, and how many units the shopper is about to buy
 * (`docs/STOREFRONT.md`, `/produto/[slug]`). One state, because changing the
 * Variant changes what the other two may be.
 *
 * Pure, and structural in what it accepts, so `bun test` reaches every
 * transition without a Product page or a browser. The hook that holds the
 * state is `shop/hooks/use-product-purchase.ts`; the components render what
 * these return.
 */

type Variant = { id: string; stockQuantity: number };

type Image = { variantId: string | null };

export type PurchaseState = {
  variantId: string;
  /** Index into the selected Variant's `galleryImages`. */
  imageIndex: number;
  quantity: number;
};

/**
 * The state a Product page opens in: its first ordered Variant — **even at
 * zero stock**, because the Admin's order is the page's order and a sold-out
 * first Variant is still worth reading about and saving — its first
 * photograph, and one unit.
 *
 * Every Product has at least one Variant (`CONTEXT.md`).
 */
export function initialPurchase(variants: readonly Variant[]): PurchaseState {
  return { variantId: variants[0].id, imageIndex: 0, quantity: 1 };
}

/**
 * The Variant the state points at. Falls back to the first, so a stale id can
 * never leave the Buy panel with nothing to price.
 */
export function selectedVariant<TVariant extends Variant>(
  variants: readonly TVariant[],
  state: Pick<PurchaseState, "variantId">,
): TVariant {
  return (
    variants.find((variant) => variant.id === state.variantId) ?? variants[0]
  );
}

/**
 * Selecting a Variant resets the photograph and the quantity to their first
 * values: the previous index points into another Variant's Gallery, and a
 * quantity chosen against another Variant's stock means nothing here.
 * Re-selecting the Variant already selected changes nothing.
 */
export function selectVariant(
  state: PurchaseState,
  variantId: string,
): PurchaseState {
  if (state.variantId === variantId) return state;
  return { variantId, imageIndex: 0, quantity: 1 };
}

/** Shows one of the current Gallery's photographs; an index outside it is ignored. */
export function selectImage(
  state: PurchaseState,
  imageIndex: number,
  imageCount: number,
): PurchaseState {
  if (imageIndex < 0 || imageIndex >= imageCount) return state;
  return { ...state, imageIndex };
}

/**
 * Sets the quantity within `[1, stock]`. A zero-stock Variant has no quantity
 * to choose, and keeps the one it has.
 */
export function setQuantity(
  state: PurchaseState,
  quantity: number,
  stockQuantity: number,
): PurchaseState {
  if (stockQuantity <= 0) return state;
  return {
    ...state,
    quantity: Math.min(Math.max(Math.trunc(quantity), 1), stockQuantity),
  };
}

/**
 * The quantity stepper's two sides: the absolute quantity each would set, or
 * `null` where there is none to set — so a control is disabled rather than
 * fired past a bound. Both are `null` on a zero-stock Variant.
 */
export function quantitySteps(
  quantity: number,
  stockQuantity: number,
): { decrease: number | null; increase: number | null } {
  if (stockQuantity <= 0) return { decrease: null, increase: null };

  return {
    decrease: quantity > 1 ? Math.min(quantity - 1, stockQuantity) : null,
    increase: quantity < stockQuantity ? quantity + 1 : null,
  };
}

/**
 * Whether the selected Variant can go into the Cart now. A zero-stock Variant
 * stays selectable and saveable; it is only this that it fails.
 */
export function isBuyable(variant: Pick<Variant, "stockQuantity">): boolean {
  return variant.stockQuantity > 0;
}

/**
 * The photographs the Gallery shows for a Variant, in the Admin's order: its
 * own Images when it has any, otherwise the Product-level ones. **Never a
 * sibling Variant's**, which would show the shopper a colour they did not
 * choose — the same rule `server/lines.ts` applies to a single Cover.
 *
 * Empty only for a Product published before every Variant had to be
 * photographed; the Gallery renders its placeholder then.
 */
export function galleryImages<TImage extends Image>(
  images: readonly TImage[],
  variantId: string,
): TImage[] {
  const own = images.filter((image) => image.variantId === variantId);
  return own.length > 0
    ? own
    : images.filter((image) => image.variantId === null);
}

/**
 * The selected Variant's price and its struck-through price, the latter only
 * when it is above the price — the card's rule (`card.ts`) for one Variant,
 * which is why there is no _A partir de_ here.
 */
export function variantPrice(variant: {
  priceAmount: number;
  compareAtPriceAmount: number | null;
}): { amount: number; compareAt: number | null } {
  const { amount, compareAt } = cardPrice({ ...variant, variantCount: 1 });
  return { amount, compareAt };
}
