import { LOCALE } from "@/lib/constants";
import type { CartLine } from "@/modules/cart/types";

/** Built once, for the reason `docs/CONVENTIONS.md` gives its formatters. */
const integer = new Intl.NumberFormat(LOCALE);

/**
 * `1` -> `"1 unidade"`, `3` -> `"3 unidades"`. Singular for exactly one and
 * nothing else, as `formatProductCount` does and for the same reason.
 */
export function formatUnits(count: number): string {
  return `${integer.format(count)} ${count === 1 ? "unidade" : "unidades"}`;
}

/** The largest count the header badge prints before it stops counting. */
const BADGE_MAX = 99;

/**
 * The header badge's number: the Cart's `totalQuantity`, capped at two digits
 * so the badge stays the size of the icon it sits on. Past the cap it reads
 * `99+`, and the badge's screen-reader text carries the exact count.
 */
export function formatBadgeCount(count: number): string {
  return count > BADGE_MAX
    ? `${integer.format(BADGE_MAX)}+`
    : integer.format(count);
}

/**
 * Why a line cannot be bought right now, in the sentence the line renders
 * beside it — or `null` for an available line. The same sentences the Cart's
 * writes refuse with (`server/router.ts`), so a shopper who sees one on a line
 * and then meets it in a toast reads one fact twice, not two.
 */
export function unavailableReason({
  availability,
  stockQuantity,
}: Pick<CartLine, "availability" | "stockQuantity">): string | null {
  switch (availability) {
    case "available":
      return null;
    case "product_unavailable":
      return "Este produto não está mais à venda.";
    case "out_of_stock":
      return "Esta variação está esgotada.";
    case "insufficient_stock":
      return `Só temos ${formatUnits(stockQuantity)} em estoque.`;
  }
}
