"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useArchiveProduct } from "@/modules/products/admin/hooks/use-archive-product";
import { usePublishProduct } from "@/modules/products/admin/hooks/use-publish-product";
import type { ProductStatus } from "@/modules/products/constants";
import { isArchivable, isPublishable } from "@/modules/products/status";

/**
 * A `<td>`'s worth of buttons: put a Product on sale, or withdraw it, without
 * opening the form. The second client component on this page, and a **leaf** —
 * it takes an `id` and a `status` and nothing else, so no row object is
 * serialized into the document, which is the property ADR-0016 measured.
 *
 * Which buttons exist is the same rule the procedures ask, imported rather
 * than restated: a `.tsx` renders, it does not decide (`docs/CONVENTIONS.md`).
 * So an illegal transition has no control to fire it, and the `CONFLICT` the
 * procedure still throws is the guard for a row whose status moved underneath
 * the Admin — a stale button, not a missing rule.
 *
 * Neither act confirms. Both are reversible from this row, and a reversible
 * act should not cost a dialog (`docs/DATA-FLOW.md`).
 */
export function ProductRowActions({
  id,
  status,
}: {
  id: string;
  status: ProductStatus;
}) {
  const publishProduct = usePublishProduct();
  const archiveProduct = useArchiveProduct();

  // Gated on the variables the write carried, not on `isPending` alone: one
  // hook instance is shared by every row that mounted it, so an ungated
  // spinner would appear on all of them at once and publishing one Product
  // would look like the whole table freezing.
  const isPublishing =
    publishProduct.isPending && publishProduct.variables?.id === id;
  const isArchiving =
    archiveProduct.isPending && archiveProduct.variables?.id === id;
  const isPendingRow = isPublishing || isArchiving;

  return (
    <div className="flex items-center justify-end gap-1">
      {isPublishable(status) && (
        <Button
          variant="outline"
          size="sm"
          disabled={isPendingRow}
          onClick={() => publishProduct.mutate({ id })}>
          {isPublishing && <Spinner data-icon="inline-start" />}
          {/* An archived Product coming back is still "publishing" it: the
              domain has two verbs, not three (`CONTEXT.md`). */}
          Publicar
        </Button>
      )}

      {isArchivable(status) && (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPendingRow}
          onClick={() => archiveProduct.mutate({ id })}>
          {isArchiving && <Spinner data-icon="inline-start" />}
          Arquivar
        </Button>
      )}
    </div>
  );
}
