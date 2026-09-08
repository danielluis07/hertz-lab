"use client";

import { Button } from "@/components/ui/button";
import { BrandEditForm } from "@/modules/brands/admin/components/brand-edit-form";
import type { BrandRow } from "@/modules/brands/admin/components/brand-form";
import { useRemoveBrand } from "@/modules/brands/admin/hooks/use-remove-brand";
import { useConfirm } from "@/providers/confirm-provider";

/**
 * A `<td>`'s worth of actions on one Brand: rename it, or delete it. A **leaf**
 * client component — it takes an `id` and a `name` and nothing else, so no row
 * object is serialized into the document, which is the property ADR-0016
 * measured and `ProductRowActions` established.
 *
 * The two scalars are `Pick`ed from the list row rather than declared as
 * `{ id: string; name: string }`, and that is what carries ADR-0026's pairing
 * down the tree: the edit dialog has no query of its own, so everything it
 * edits arrives through here from the row — and a field `list` does not select
 * cannot be `Pick`ed. The delete needs the same two, for the same reason: the
 * confirmation names the Brand.
 *
 * **The two dialogs are one idiom, not two.** `providers/confirm-provider.tsx`
 * *is* a `components/ui/dialog`, so a delete confirm beside a form dialog is
 * one modal primitive serving two purposes (ADR-0026, on ADR-0023).
 *
 * **`Excluir` renders on every row, always** — never hidden, never
 * conditionally absent (ADR-0023, whose amendment brings the rule here with
 * the noun changed). The row carries `productCount` and this component could
 * read it; it does not, and that is why there is no rule to import — ADR-0023
 * declines to extract an `isRemovable` precisely because no client asks it.
 * A refusal naming the number is a work order; a missing button tells the
 * Admin nothing.
 */
export function BrandRowActions({ id, name }: Pick<BrandRow, "id" | "name">) {
  const removeBrand = useRemoveBrand();
  const { confirm } = useConfirm();

  // Gated on the variables the write carried, not on `isPending` alone: one
  // hook instance is shared by every row that mounted it, so an ungated
  // disable would freeze the whole table while one Brand is deleting.
  //
  // It is a backstop rather than the pending state an Admin reads: the delete
  // runs as the dialog's `action`, so the dialog is open over this row for the
  // whole of it and owns the spinner (`ConfirmProvider`). Hence no `Spinner`
  // beside the label — a second one nobody can see — and hence `disabled`
  // rather than a condition on rendering, which would move the button.
  const isRemoving = removeBrand.isPending && removeBrand.variables?.id === id;

  const handleRemove = () =>
    confirm({
      title: "Excluir marca",
      message: `A marca "${name}" será excluída. Esta ação não pode ser desfeita.`,
      // Handed over rather than called, so the provider owns the pending state
      // and the closing — the one place `docs/DATA-FLOW.md` allows it.
      action: async () => {
        await removeBrand.mutateAsync({ id });
      },
    });

  return (
    <div className="flex items-center justify-end gap-1">
      <BrandEditForm id={id} name={name} />

      <Button
        variant="destructive"
        size="sm"
        disabled={isRemoving}
        onClick={handleRemove}>
        Excluir
      </Button>
    </div>
  );
}
