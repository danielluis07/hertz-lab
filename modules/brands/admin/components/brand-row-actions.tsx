"use client";

import { BrandEditForm } from "@/modules/brands/admin/components/brand-edit-form";
import type { BrandRow } from "@/modules/brands/admin/components/brand-form";

/**
 * A `<td>`'s worth of actions on one Brand. A **leaf** client component — it
 * takes an `id` and a `name` and nothing else, so no row object is serialized
 * into the document, which is the property ADR-0016 measured and
 * `ProductRowActions` established.
 *
 * The two scalars are `Pick`ed from the list row rather than declared as
 * `{ id: string; name: string }`, and that is what carries ADR-0026's pairing
 * down the tree: the edit dialog has no query of its own, so everything it
 * edits arrives through here from the row — and a field `list` does not select
 * cannot be `Pick`ed.
 *
 * For now it renders the edit dialog alone. **"Excluir" is the next issue's**,
 * and it will sit beside this one as a `useConfirm` — one modal primitive
 * serving both purposes rather than two competing idioms (ADR-0026, on
 * ADR-0023).
 */
export function BrandRowActions({ id, name }: Pick<BrandRow, "id" | "name">) {
  return (
    <div className="flex items-center justify-end gap-1">
      <BrandEditForm id={id} name={name} />
    </div>
  );
}
