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
 * Whether a shopper may buy the Product: only `active` is on sale
 * (`CONTEXT.md`). The pure twin of `server/visibility.ts`'s `visibleProduct`
 * clause, for a caller that has already fetched the status — a Cart keeps a
 * line whose Product was archived, and has to say so rather than filter it out.
 */
export function isOnSale(status: ProductStatus): boolean {
  return status === "active";
}

/**
 * The status half of the publish rule: a Product goes on sale from `draft`
 * (never sold) or `archived` (sold before).
 *
 * Split out from `isPublishable` for the one caller that knows a status and
 * nothing else — the list row, which renders a `Publicar` button from a row
 * that carries no Images. The row keeps deciding nothing
 * (`docs/CONVENTIONS.md`): it asks the coarser half of the same rule, and the
 * photograph is the procedure's to refuse, with a sentence that says so.
 */
export function isPublishableStatus(status: ProductStatus): boolean {
  return status === "draft" || status === "archived";
}

/**
 * Who owns each of a Product's photographs, and which Variants it has: all a
 * publish needs to know about its Gallery, fetched once by the procedure.
 * `imageVariantIds` holds one entry per Image — its Variant's id, or `null`
 * for a Product-level Image.
 */
export type GalleryCoverage = {
  variantIds: readonly string[];
  imageVariantIds: readonly (string | null)[];
};

/**
 * The Variants a shopper could select and find no applicable photograph for,
 * in the order given. An applicable photograph is one of the Variant's own
 * Images or, failing those, a Product-level one — never a sibling's
 * (`docs/STOREFRONT.md`, the Gallery) — so one Product-level Image covers
 * every Variant at once.
 *
 * Ids rather than a boolean, so the refusal can name the Variants.
 */
export function uncoveredVariantIds({
  variantIds,
  imageVariantIds,
}: GalleryCoverage): string[] {
  if (imageVariantIds.includes(null)) return [];

  const photographed = new Set(imageVariantIds);
  return variantIds.filter((id) => !photographed.has(id));
}

/**
 * Whether every Variant a shopper can select has an applicable photograph
 * (`CONTEXT.md`, **Product**): at least one Product-level Image, or at least
 * one Image of its own for each Variant.
 *
 * No Images at all is never photographable, whatever the Variant list says:
 * an empty Variant list must not pass by vacuity.
 */
export function isPhotographable(coverage: GalleryCoverage): boolean {
  return (
    coverage.imageVariantIds.length > 0 &&
    uncoveredVariantIds(coverage).length === 0
  );
}

/**
 * Whether a Product may go on sale: the right status, **and** a photograph
 * for every Variant. An active Product is one a shopper can evaluate whichever
 * Variant they select, and a Variant nobody photographed is not one
 * (`CONTEXT.md`).
 *
 * A publish rule and not a schema rule, deliberately. A draft may be
 * imageless — writing the description before the photo shoot arrives is
 * normal — so `productSchema` still saves one. Products already active or
 * archived are not rewritten: the rule gates the next publish, not the rows
 * that are already there.
 */
export function isPublishable(
  status: ProductStatus,
  coverage: GalleryCoverage,
): boolean {
  return isPublishableStatus(status) && isPhotographable(coverage);
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
