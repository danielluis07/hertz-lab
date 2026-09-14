import { LOCALE } from "@/lib/constants";
import { formatRating } from "@/lib/utils/format";

/** Built once, for the reason `docs/CONVENTIONS.md` gives its formatters. */
const integer = new Intl.NumberFormat(LOCALE);

/**
 * `1` -> `"1 produto"`, `1234` -> `"1.234 produtos"`.
 *
 * Singular for exactly one and nothing else. `Intl.PluralRules` would say
 * `"0 produto"`, because CLDR files zero under Portuguese's "one", and that is
 * not how a Brazilian writes a count.
 */
export function formatProductCount(count: number): string {
  return `${integer.format(count)} ${count === 1 ? "produto" : "produtos"}`;
}

/** `1` -> `"1 avaliação"`, `1234` -> `"1.234 avaliações"`, for the reason above. */
export function formatReviewCount(count: number): string {
  return `${integer.format(count)} ${count === 1 ? "avaliação" : "avaliações"}`;
}

/**
 * The Buy panel's rating summary, or `null` when the Product has no approved
 * Review. `rating_average` defaults to `0` (ADR-0004), so an unreviewed
 * Product must say it has no reviews rather than print `0,0` — the page links
 * that state to its Reviews block instead.
 */
export function ratingSummary({
  ratingAverage,
  ratingCount,
}: {
  ratingAverage: number;
  ratingCount: number;
}): { average: string; count: string } | null {
  if (ratingCount <= 0) return null;
  return {
    average: formatRating(ratingAverage),
    count: formatReviewCount(ratingCount),
  };
}
