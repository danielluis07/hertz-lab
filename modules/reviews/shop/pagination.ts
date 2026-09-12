import { REVIEWS_PER_PAGE } from "@/modules/reviews/shop/constants";
import type { ReviewCursor } from "@/modules/reviews/shop/schemas";

/** Turns a one-extra-row query result into the public Review page envelope. */
export function toReviewPage<T extends ReviewCursor>(rows: readonly T[]) {
  const items = rows.slice(0, REVIEWS_PER_PAGE);
  const lastItem = items.at(-1);

  return {
    items,
    nextCursor:
      rows.length > REVIEWS_PER_PAGE && lastItem
        ? { createdAt: lastItem.createdAt, id: lastItem.id }
        : null,
  };
}
