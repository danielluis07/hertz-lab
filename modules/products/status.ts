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

/**
 * The status half of the publish rule: a Product goes on sale from `draft`
 * (never sold) or `archived` (sold before).
 *
 * Split out from `isPublishable` for the one caller that knows a status and
 * nothing else — the list row, which renders a `Publicar` button from a row
 * that carries no image count. The row keeps deciding nothing
 * (`docs/CONVENTIONS.md`): it asks the coarser half of the same rule, and the
 * photograph is the procedure's to refuse, with a sentence that says so.
 */
export function isPublishableStatus(status: ProductStatus): boolean {
  return status === "draft" || status === "archived";
}

/**
 * Whether a Product may go on sale: the right status, **and** at least one
 * photograph. An active Product is one a shopper can evaluate, and a Product
 * with no image is not one (`CONTEXT.md`).
 *
 * A publish rule and not a schema rule, deliberately. A draft may be
 * imageless — writing the description before the photo shoot arrives is
 * normal — so `productSchema` still saves one, and a Product archived before
 * this rule existed stays archived and intact rather than being rewritten.
 */
export function isPublishable(
  status: ProductStatus,
  imageCount: number,
): boolean {
  return isPublishableStatus(status) && imageCount > 0;
}

/**
 * A Product is withdrawn from sale from `active`, or from `draft` to shelve
 * one that was never finished. Archiving is reversible — `isPublishable`
 * accepts `archived` — which is why neither act asks for confirmation
 * (`docs/DATA-FLOW.md`).
 *
 * Photographs do not enter into it: withdrawing something from sale is never
 * blocked, whatever it was shot with.
 */
export function isArchivable(status: ProductStatus): boolean {
  return status === "draft" || status === "active";
}
