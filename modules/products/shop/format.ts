import { LOCALE } from "@/lib/constants";

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
