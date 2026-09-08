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
} from "@/modules/brands/admin/components/brand-form";
import { useCreateBrand } from "@/modules/brands/admin/hooks/use-create-brand";
import { NEW_BRAND } from "@/modules/brands/constants";
import type { BrandFormValues } from "@/modules/brands/schemas";

/**
 * The form body's first owner, and the whole of "Nova marca": its trigger, its
 * own `open` state, and its own `Dialog` chrome.
 *
 * **The wrappers are the branch** (ADR-0026). There is no `mode` prop, no
 * single dialog taking an optional row, and no shared shell owning `open` and
 * handing each wrapper a callback to ask for a close — the wrapper already
 * owns where the Admin lands afterwards, which in a dialog *is* the close.
 *
 * **It renders beside the page heading, outside the table** (`page.tsx`), so
 * an Admin with no Brands at all is not looking at a dead end: the empty
 * state's advice to cadastrar the first one has a button next to it rather
 * than inside an empty table.
 *
 * Closing on success is `setOpen(false)` and nothing else — the unmount does
 * the resetting, for the reason `brand-edit-form.tsx` gives at length.
 *
 * The dialog is **not addressable**: no `?novo`, no back-button close. A
 * recorded cost of ADR-0026, not an oversight — nobody links a colleague to a
 * half-filled brand form.
 */
export function BrandCreateForm() {
  const [open, setOpen] = useState(false);
  const createBrand = useCreateBrand();

  const onSubmit: BrandFormSubmit = (values, form) => {
    createBrand.mutate(values, {
      // The close and nothing else. The hook already invalidated the list and
      // toasted, and there is nowhere to navigate: a Brand has no page of its
      // own, which is half of why this is a dialog.
      onSuccess: () => setOpen(false),
      onError: (error) => {
        // The third error tier: a refusal that names an input is rendered on
        // that input rather than as a toast the Admin has to match up with a
        // field by hand (ADR-0013). Here that is a name another Brand already
        // holds, whatever the casing.
        //
        // The cast is the type the wire cannot carry: `data.field` is a
        // string, and the path this procedure names is one the form
        // registered.
        const field = error.data?.field;
        if (field) {
          form.setError(field as Path<BrandFormValues>, {
            message: error.message,
          });
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Nova marca</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova marca</DialogTitle>
          <DialogDescription>
            O fabricante pelo qual o cliente filtra a vitrine.
          </DialogDescription>
        </DialogHeader>

        <BrandForm
          defaultValues={NEW_BRAND}
          onSubmit={onSubmit}
          isPending={createBrand.isPending}
          submitLabel="Criar marca"
        />
      </DialogContent>
    </Dialog>
  );
}
