import type { ProductStatus } from "@/modules/products/constants";

/**
 * The Product transition rule, as two pure predicates. `CONTEXT.md` gives an
 * Admin exactly two acts on a Product's status — publishing and archiving —
 * and this is which of them is legal from where.
 *
 * Pure, and importing nothing from the database or from tRPC, because
 * `docs/MODULES.md` puts rules at the module root and leaves procedures to
 * orchestrate: `publish` and `archive` read a row, ask a question here, and
 * write. That is also what lets `bun test` reach the rule without a database.
 *
 * The refusal copy is not here. A message is what a *procedure* says when it
 * refuses (ADR-0013), and it lives in `server/admin.ts` beside the throw.
 */

/** A Product goes on sale from `draft` (never sold) or `archived` (sold before). */
export function isPublishable(status: ProductStatus): boolean {
  return status === "draft" || status === "archived";
}

/**
 * A Product is withdrawn from sale from `active`, or from `draft` to shelve
 * one that was never finished. Archiving is reversible — `isPublishable`
 * accepts `archived` — which is why neither act asks for confirmation
 * (`docs/DATA-FLOW.md`).
 */
export function isArchivable(status: ProductStatus): boolean {
  return status === "draft" || status === "active";
}
