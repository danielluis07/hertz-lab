import type { CartLineAvailability } from "@/modules/cart/availability";

/**
 * One line of `cart.get`: the shopper's stored intent (Variant and quantity)
 * dressed in current Catalog facts. Declared rather than inferred because two
 * writers are held to it — `toCart` on the server and the optimistic
 * transforms in `optimistic.ts` on the client — and the procedure's output is
 * inferred *from* it, so it cannot be inferred from the procedure.
 *
 * Every amount is current BRL cents: a Cart stores no price (ADR-0003), so
 * there is no previous price to compare against.
 */
export type CartLine = {
  variantId: string;
  variantName: string;
  productName: string;
  /** Links to `/produto/<slug>` only while the Product is on sale — see `linksToProduct`. */
  productSlug: string;
  /** Null when the Product has no Image left, which only an archived one can. */
  coverS3Key: string | null;
  coverAltText: string | null;
  unitPriceAmount: number;
  stockQuantity: number;
  /** What the shopper asked for, kept as asked even when stock fell below it. */
  quantity: number;
  /** `unitPriceAmount × quantity`, whether or not the line is available. */
  lineTotalAmount: number;
  availability: CartLineAvailability;
};

/**
 * The whole of `cart.get`. A User with no Cart row receives this shape empty,
 * never `null` (`docs/READ-PATH.md`).
 */
export type Cart = {
  /** Oldest line first (`cart_item.created_at`); a quantity change never moves one. */
  items: CartLine[];
  /** BRL cents over **available** lines only. */
  subtotalAmount: number;
  /** Every line's quantity, available or not: the header badge's number. */
  totalQuantity: number;
  /** At least one line, and every line available. */
  canCheckout: boolean;
};
