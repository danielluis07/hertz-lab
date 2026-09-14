/** The fixed size of each public Review page. */
export const REVIEWS_PER_PAGE = 5;

/** Every rating a Review may carry, lowest first. */
export const REVIEW_RATINGS = [1, 2, 3, 4, 5] as const;

export type ReviewRating = (typeof REVIEW_RATINGS)[number];

/** The spoken name of each rating choice on the Review form. */
export const REVIEW_RATING_LABELS: Record<ReviewRating, string> = {
  1: "1 estrela",
  2: "2 estrelas",
  3: "3 estrelas",
  4: "4 estrelas",
  5: "5 estrelas",
};
