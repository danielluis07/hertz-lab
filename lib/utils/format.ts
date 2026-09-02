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
 * Parse pt-BR money input into BRL cents. Returns `null` when the input is not
 * a number, so a caller can distinguish "empty field" from "zero".
 *
 * Accepts `"R$ 1.234,56"`, `"1.234,56"`, `"1234,56"` and `"1234"`. Also accepts
 * `"1234.56"` — a trailing dot followed by exactly two digits is read as a
 * decimal separator, because that is what a keyboard-driven admin types.
 */
export function parseBRL(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const digitsAndSeparators = trimmed.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(digitsAndSeparators)) return null;

  let normalized: string;
  if (digitsAndSeparators.includes(",")) {
    // pt-BR: dots are thousands separators, the comma is the decimal point.
    normalized = digitsAndSeparators.replace(/\./g, "").replace(",", ".");
  } else if (/\.\d{2}$/.test(digitsAndSeparators)) {
    // A single trailing `.dd` is a decimal point, not a thousands separator.
    normalized = digitsAndSeparators.replace(/\.(?=.*\.)/g, "");
  } else {
    normalized = digitsAndSeparators.replace(/\./g, "");
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  return Math.round(value * 100);
}
