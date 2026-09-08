import { CURRENCY, LOCALE } from "@/lib/constants";

/**
 * Money in Hertz Lab is always BRL cents (see `CONTEXT.md`). Coupon
 * percentages are basis points, which are also plain integers — never pass one
 * to `formatBRL`.
 */

/** Built once: constructing an `Intl` formatter per product card is measurable. */
const brl = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
});

/** `123456` -> `"R$ 1.234,56"` */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

const percent = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  maximumFractionDigits: 2,
});

/** Basis points -> percentage. `1000` -> `"10%"` */
export function formatBasisPoints(basisPoints: number): string {
  return percent.format(basisPoints / 10_000);
}

/**
 * Read BRL cents out of a money box as it is being typed. Every digit in the
 * string is a centavo, filled right to left: `"1"` is `R$ 0,01` and `"1234"`
 * is `R$ 12,34`. Everything else — the `R$`, the dots, the comma — is
 * punctuation `formatBRL` put there and this reads straight back out, which is
 * what lets the box be re-rendered on every keystroke without its value
 * drifting: `parseBRLInput(formatBRL(cents)) === cents`.
 *
 * Returns `null` when there is no digit at all, so a caller can tell an
 * emptied box from a zero. A pasted `"R$ 1.234,56"` lands on `123456` because
 * those are its digits; a pasted `"1234"` reads as `R$ 12,34`, since a digit
 * means a centavo here and a paste cannot be told apart from typing.
 */
export function parseBRLInput(input: string): number | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;

  // Truncated before `Number`: an Admin leaning on a key would otherwise leave
  // the safe-integer range and watch the amount round itself under the cursor.
  return Number(digits.slice(0, 15));
}

const rating = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * A Product's rating average is stored in hundredths, the same way money is
 * stored in cents (ADR-0004). `450` -> `"4,5"`.
 */
export function formatRating(hundredths: number): string {
  return rating.format(hundredths / 100);
}
