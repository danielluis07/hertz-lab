import { BadgeCheckIcon } from "lucide-react";
import { formatDate } from "@/lib/utils/date";
import { RatingStars } from "@/modules/reviews/shop/components/rating-stars";
import type { ReviewListItem } from "@/modules/reviews/shop/types";

/**
 * One approved Review. Hook-free, so the server renders the first page with it
 * and `ReviewListPages` renders older pages with the same markup.
 *
 * Rating, optional title, the body as written, then who and when. "Compra
 * verificada" is stated on every row without a flag to read: a Review cannot
 * exist without the delivered Order that proves it (CONTEXT.md). The body keeps
 * its line breaks, because a shopper's paragraphs are part of what they wrote.
 */
export function ReviewItem({
  review,
  headingLevel: Heading = "h3",
}: {
  review: ReviewListItem;
  /** The title's level beneath the page's own Reviews heading. */
  headingLevel?: "h3" | "h4";
}) {
  return (
    <article className="flex flex-col gap-3 py-8">
      <RatingStars rating={review.rating} />

      {review.title && (
        <Heading className="text-base font-medium">{review.title}</Heading>
      )}

      <p className="max-w-prose whitespace-pre-line break-words">
        {review.body}
      </p>

      <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-foreground font-medium">
          {review.authorLabel}
        </span>
        <span className="inline-flex items-center gap-1">
          <BadgeCheckIcon aria-hidden className="size-4" />
          Compra verificada
        </span>
        <time dateTime={review.createdAt.toISOString()}>
          {formatDate(review.createdAt, "long")}
        </time>
      </p>
    </article>
  );
}
