/**
 * The one row every shop Product card reads (ADR-0045): the catalogue grid,
 * `/`'s four Product previews and the product page's related section each
 * project exactly this.
 *
 * Declared rather than inferred, because no single read is its source — it is
 * the contract all of them are held to. Each read assigns its rows to it, so
 * one that projects something narrower fails to compile: the reads are each
 * other's tests.
 *
 * Adding a field is a change to every card query, which is the reason to add
 * one only when the card renders it. Ranking-only facts — sold units, rating —
 * stay inside their queries.
 */
export type ProductCardRow = {
  /** Stable Product identity used to keep composed preview sections unique. */
  id: string;
  slug: string;
  name: string;
  brandName: string;
  coverS3Key: string;
  coverAltText: string;
  /** BRL cents: the lowest Variant price (ADR-0033). */
  priceAmount: number;
  /** BRL cents: the struck-through price of that same Variant, when it has one. */
  compareAtPriceAmount: number | null;
  /** `> 1` is the card's _A partir de_ test. */
  variantCount: number;
};
