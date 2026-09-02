/**
 * Slugs are the Portuguese half of a public URL (see ADR-0005), so accented
 * characters are the normal case, not an edge case: "Fones de Ouvido" and
 * "Áudio Automotivo" both have to come out URL-safe and readable.
 */

/**
 * U+0300–U+036F, the combining diacritical marks that `normalize("NFD")`
 * separates out. Built from code points rather than written as a literal
 * character class, which renders as unreadable mojibake in most editors.
 */
const COMBINING_MARKS = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  "g",
);

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
