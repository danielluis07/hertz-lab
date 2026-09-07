"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useRemoveCategory } from "@/modules/categories/admin/hooks/use-remove-category";
import { useConfirm } from "@/providers/confirm-provider";

/**
 * A `<td>`'s worth of actions on one Category: open it, or delete it. A
 * **leaf** client component — it takes an `id` and a `name` and nothing else,
 * so no row object is serialized into the document, which is the property
 * ADR-0016 measured and `ProductRowActions` established.
 *
 * **`Excluir` renders on every row, always** (ADR-0023, which argues it at
 * length beside the procedure that refuses). The row carries both counts and
 * this component could read them; it does not, and that is why there is no
 * rule to import here — ADR-0023 declines to extract an `isRemovable`
 * precisely because no client asks it.
 *
 * **It confirms**, which nothing in `products` does. Not a reversal of
 * `docs/PRODUCTS-ADMIN.md` but the same reason applied to a different fact:
 * archiving is undone by a filter and removing an Image is a field edit, while
 * deleting a Category is un-undoable from this screen (`docs/DATA-FLOW.md`).
 * The Category is named in the message, because the one thing a confirmation
 * dialog must establish is *which* row it is about. `mutateAsync` is handed
 * over rather than called, so the provider owns the pending state and the
 * closing — the one place `docs/DATA-FLOW.md` allows it.
 *
 * The refusals come back as toasts and that is correct: they carry no field,
 * there is no form, and the Admin is looking at the row (ADR-0013).
 */
export function CategoryRowActions({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const removeCategory = useRemoveCategory();
  const { confirm } = useConfirm();

  // Gated on the variables the write carried, not on `isPending` alone: one
  // hook instance is shared by every row that mounted it, so an ungated
  // disable would freeze the whole table while one Category is deleting.
  //
  // It is a backstop rather than the pending state an Admin reads: the delete
  // runs as the dialog's `action`, so the dialog is open over this row for the
  // whole of it and owns the spinner (`ConfirmProvider`). Hence no `Spinner`
  // beside the label — a second one nobody can see — and hence `disabled`
  // rather than a condition on rendering, which would move the button.
  const isRemoving =
    removeCategory.isPending && removeCategory.variables?.id === id;

  const handleRemove = () =>
    confirm({
      title: "Excluir categoria",
      message: `A categoria "${name}" será excluída. Esta ação não pode ser desfeita.`,
      action: async () => {
        await removeCategory.mutateAsync({ id });
      },
    });

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/admin/categories/${id}`}
        className={buttonVariants({ variant: "outline", size: "sm" })}>
        Editar
      </Link>

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
