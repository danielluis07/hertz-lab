"use client";

import { useState } from "react";
import type { Path } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BrandForm,
  type BrandFormSubmit,
  type BrandRow,
} from "@/modules/brands/admin/components/brand-form";
import { useUpdateBrand } from "@/modules/brands/admin/hooks/use-update-brand";
import type { BrandFormValues } from "@/modules/brands/schemas";

/**
 * The form body's second owner, and as thin as the first: same field, a
 * different hook, its own trigger in the row and its own `open` state. There
 * is no `mode` prop, here or beside it — a branch inside one component would
 * put a rule in a `.tsx`, and the two wrappers *are* the branch.
 *
 * **It reads no query.** There is no `byId` in this module (ADR-0026): the one
 * field it edits is already on the list row the Admin opened it from, handed
 * down through `BrandRowActions` as two scalars. A dialog mounts on a click
 * rather than on a navigation, so a query here would have no prefetch site to
 * be hydrated from.
 *
 * **One dialog per row, and that is affordable because a closed one is
 * unmounted.** `keepMounted` is never passed, so N rows cost N unmounted
 * portals rather than N mounted forms — no `useForm`, no hooks and no queries
 * among them.
 *
 * That unmount is also a correctness property: the form remounts on every
 * open, so `defaultValues` are re-read from the row the last save invalidated.
 * **An abandoned half-edit does not survive to the next open**, which is what
 * a route form got for free by navigating — and why closing on success is
 * `setOpen(false)` with no `form.reset()`.
 *
 * **No `router.refresh()`.** The list page renders nothing from a server read,
 * so the hook's invalidation reaches every copy of this row there is
 * (`docs/DATA-FLOW.md`).
 */
export function BrandEditForm({ id, name }: Pick<BrandRow, "id" | "name">) {
  const [open, setOpen] = useState(false);
  const updateBrand = useUpdateBrand();

  const onSubmit: BrandFormSubmit = (values, form) => {
    updateBrand.mutate(
      { ...values, id },
      {
        onSuccess: () => setOpen(false),
        onError: (error) => {
          // The third error tier, identical to the create wrapper's: a refusal
          // that names an input is rendered on that input (ADR-0013). Here
          // that is a name another Brand already holds — never this one's own,
          // because the lookup runs with an `exceptId`.
          //
          // A Brand deleted from another tab is the other refusal, and it
          // carries no field on purpose: the pt-BR code map toasts "Este item
          // não existe mais. Atualize a página.", which is not a sentence
          // about the name input.
          const field = error.data?.field;
          if (field) {
            form.setError(field as Path<BrandFormValues>, {
              message: error.message,
            });
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Editar
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          {/* The Brand is named in the title, because the one thing a dialog
              opened from a row must establish is *which* row it is about. */}
          <DialogTitle>Editar {name}</DialogTitle>
          <DialogDescription>
            O fabricante pelo qual o cliente filtra a vitrine.
          </DialogDescription>
        </DialogHeader>

        <BrandForm
          // The row's own column, named rather than spread: `id` is what the
          // write addresses and not a field of this form. Typed off the list
          // row (`BrandRow`), so a field this form grows and `list` forgets is
          // a type error rather than a blank input saving over real data
          // (ADR-0026).
          defaultValues={{ name }}
          onSubmit={onSubmit}
          isPending={updateBrand.isPending}
          submitLabel="Salvar alterações"
        />
      </DialogContent>
    </Dialog>
  );
}
