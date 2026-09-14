"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ReviewItem } from "@/modules/reviews/shop/components/review-item";
import type { ReviewCursor } from "@/modules/reviews/shop/schemas";
import { useTRPC } from "@/trpc/client";

/**
 * The Review list's one interactive leaf: it appends older approved Reviews
 * after the server-rendered first page, only once the shopper asks.
 *
 * - **The first page is `children`**, server markup that never enters this
 *   component's cache. The infinite query starts at the server page's
 *   `nextCursor`, so the two cannot overlap or repeat a row.
 * - **Cold until requested.** `enabled` waits for the first press, then every
 *   later press asks for the next page. A remount forgets the request and
 *   shows the server page alone, whatever the cache still holds.
 * - **Older pages never outlive their boundary.** The query key is only
 *   `{ productId }` — `cursor` is the page parameter — so cached pages may have
 *   started from an earlier server page's cursor. The first press resets them,
 *   and `ReviewList` keys this leaf by its cursor so a new boundary remounts it.
 * - **A failure is local**: a sentence and a retry in place of the button.
 *   Queries have no global error tier (ADR-0013 covers mutations).
 *
 * Focus stays on the button while it works (`focusableWhenDisabled`), and a
 * polite live region says how many older Reviews arrived, since they appear
 * above where the shopper is.
 */
export function ReviewListPages({
  productId,
  nextCursor,
  children,
}: {
  productId: string;
  nextCursor: ReviewCursor | null;
  children: React.ReactNode;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [requested, setRequested] = useState(false);
  const olderOptions = trpc.reviews.shop.list.infiniteQueryOptions(
    { productId },
    {
      enabled: requested && nextCursor !== null,
      initialCursor: nextCursor,
      getNextPageParam: (page) => page.nextCursor,
    },
  );
  const older = useInfiniteQuery(olderOptions);

  const olderReviews = requested
    ? (older.data?.pages.flatMap((page) => page.items) ?? [])
    : [];
  const failed = requested && older.isError;
  const hasMore = requested
    ? older.isPending || older.hasNextPage
    : nextCursor !== null;

  return (
    <div className="flex flex-col">
      <ul aria-label="Avaliações de compradores" className="divide-y border-y">
        {children}
        {olderReviews.map((review) => (
          <li key={review.id}>
            <ReviewItem review={review} />
          </li>
        ))}
      </ul>

      {(hasMore || failed) && (
        <div className="flex flex-col items-start gap-3 pt-8">
          {failed && (
            <p role="alert" className="text-destructive text-sm">
              Não foi possível carregar mais avaliações.
            </p>
          )}
          <Button
            variant="outline"
            size="lg"
            disabled={older.isFetching}
            focusableWhenDisabled
            aria-busy={older.isFetching}
            onClick={() => {
              if (!requested) {
                void queryClient.resetQueries({
                  queryKey: olderOptions.queryKey,
                });
                setRequested(true);
              } else if (older.isError && !older.data) older.refetch();
              else older.fetchNextPage();
            }}>
            {older.isFetching && <Spinner aria-hidden data-icon="inline-start" />}
            {failed ? "Tentar novamente" : "Ver avaliações anteriores"}
          </Button>
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {olderReviews.length > 0 &&
          !older.isFetching &&
          `Avaliações anteriores carregadas: ${olderReviews.length}.`}
      </p>
    </div>
  );
}
