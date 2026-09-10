import type { ProductStatus } from "@/modules/products/constants";
import { lineAvailability } from "@/modules/cart/availability";
import type { Cart, CartLine } from "@/modules/cart/types";

/**
 * What the server knows about one stored line before any Cart rule runs: the
 * `cart_item` quantity joined to `variantLines`' Catalog facts. The Product's
 * status is read here and nowhere after — a line carries its consequence,
 * `availability`, instead.
 */
export type CartLineFacts = Omit<CartLine, "lineTotalAmount" | "availability"> & {
  productStatus: ProductStatus;
};

/**
 * The three numbers derived from a Cart's lines.
 *
 * An unavailable line is still in the Cart: it stays visible, its quantity
 * still counts toward the badge, and it blocks checkout until the shopper
 * corrects or removes it. What it does not do is contribute to the subtotal,
 * which is a sum of what could be bought right now.
 */
export function cartTotals(
  items: Pick<CartLine, "quantity" | "lineTotalAmount" | "availability">[],
): Omit<Cart, "items"> {
  let subtotalAmount = 0;
  let totalQuantity = 0;
  let allAvailable = true;

  for (const line of items) {
    totalQuantity += line.quantity;
    if (line.availability === "available") {
      subtotalAmount += line.lineTotalAmount;
    } else {
      allAvailable = false;
    }
  }

  return {
    subtotalAmount,
    totalQuantity,
    canCheckout: items.length > 0 && allAvailable,
  };
}

/** A line priced and judged against the current Catalog. */
export function toCartLine({ productStatus, ...line }: CartLineFacts): CartLine {
  return {
    ...line,
    lineTotalAmount: line.unitPriceAmount * line.quantity,
    availability: lineAvailability({
      productStatus,
      stockQuantity: line.stockQuantity,
      quantity: line.quantity,
    }),
  };
}

/**
 * The Cart value `cart.get` returns, from its lines in display order. The
 * procedure fetches and orders; everything the shopper reads as a rule is
 * decided here.
 */
export function toCart(facts: CartLineFacts[]): Cart {
  const items = facts.map(toCartLine);
  return { items, ...cartTotals(items) };
}
