import { ReviewItem } from "@/modules/reviews/shop/components/review-item";
import { ReviewListPages } from "@/modules/reviews/shop/components/review-list-pages";
import type { ReviewListPage } from "@/modules/reviews/shop/types";

/**
 * The Product page's approved Reviews, starting from the first page it read
 * through `caller`. A server component: those rows are server markup in the
 * cached route, passed through the client leaf as `children`, so nothing about
 * them is hydrated, prefetched or refetched after mount (ADR-0011, ADR-0032).
 *
 * `ReviewListPages` holds only `productId` and the first `nextCursor`, and
 * fetches nothing until the shopper asks for older Reviews.
 *
 * The page owns the Reviews heading, its placement and the empty state; with
 * zero approved Reviews it renders that instead of this list:
 *
 * ```tsx
 * const reviews = await caller.reviews.shop.list({ productId: product.id });
 *
 * {reviews.items.length > 0 ? (
 *   <ReviewList productId={product.id} page={reviews} />
 * ) : (
 *   <ReviewsEmpty />
 * )}
 * <ReviewWriter productId={product.id} />
 * ```
 */
export function ReviewList({
  productId,
  page,
}: {
  productId: string;
  page: ReviewListPage;
}) {
  return (
    // Keyed by the boundary: a re-rendered server page with a different
    // cursor starts a fresh leaf rather than keeping pages from the old one.
    <ReviewListPages
      key={page.nextCursor?.id ?? "end"}
      productId={productId}
      nextCursor={page.nextCursor}>
      {page.items.map((review) => (
        <li key={review.id}>
          <ReviewItem review={review} />
        </li>
      ))}
    </ReviewListPages>
  );
}
