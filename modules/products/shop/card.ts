import type { ProductCardRow } from "@/modules/products/shop/types";

/**
 * What a Product card prints beside its price — the card's two rules, kept out
 * of `product-card.tsx` so every surface rendering the card agrees on them.
 *
 * - **`fromPrice`** — _A partir de_ when `variantCount > 1` (ADR-0045): a fact
 *   about the Product having more than one thing to buy, not about those
 *   things being priced differently.
 * - **`compareAt`** — the struck-through price, only when it is **above** the
 *   price. The Admin schema checks each amount alone, so a compare-at at or
 *   below the price can be stored, and striking it through would claim a
 *   saving that does not exist. The same `compareAt > price` test is what
 *   `?promocao=1` selects on.
 */
export function cardPrice({
  priceAmount,
  compareAtPriceAmount,
  variantCount,
}: Pick<
  ProductCardRow,
  "priceAmount" | "compareAtPriceAmount" | "variantCount"
>): { amount: number; compareAt: number | null; fromPrice: boolean } {
  return {
    amount: priceAmount,
    compareAt:
      compareAtPriceAmount !== null && compareAtPriceAmount > priceAmount
        ? compareAtPriceAmount
        : null,
    fromPrice: variantCount > 1,
  };
}
