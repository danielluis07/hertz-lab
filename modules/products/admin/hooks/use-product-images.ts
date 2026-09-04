"use client";

import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { useImageUpload } from "@/hooks/use-image-upload";
import { variantIndexAfterRemoval } from "@/modules/products/admin/form-values";
import { useCreateImageUpload } from "@/modules/products/admin/hooks/use-create-image-upload";
import { useDiscardImageUpload } from "@/modules/products/admin/hooks/use-discard-image-upload";
import type { ProductFormValues } from "@/modules/products/schemas";

/**
 * The images half of the Product form, as state (ADR-0018): the array React
 * Hook Form holds, plus — through `useImageUpload` — the files that are still
 * on their way to it.
 *
 * **What is left here is what is a rule about a Product** (ADR-0021). Pick,
 * check, presign, PUT, retry and cancel are true of any picture and moved to
 * `hooks/use-image-upload.ts` when a Category became the second uploader; the
 * field array, the Variant index an Image carries and the orphan a removed
 * Image leaves did not, and this is where they stayed. The module's own
 * `createImageUpload` and `discardImageUpload` are handed to the shared hook,
 * which is how it stays a stranger to the `products/` prefix.
 *
 * **It is a hook and not a component** because it is nothing but rule and
 * sequence, and a `.tsx` may hold only render logic (`docs/CONVENTIONS.md`). It
 * is called by `product-form.tsx` rather than by the field group it feeds,
 * because the *submit button* is the other consumer: submit is blocked while
 * anything is in flight, and the button lives one component above the tiles.
 *
 * **A file becomes a form value only once its bytes are in the bucket** — which
 * is what `onUploaded` below is, and what keeps `images` a list of keys that
 * certainly exist.
 */
export function useProductImages({
  form,
}: {
  form: UseFormReturn<ProductFormValues>;
}) {
  const control = form.control;

  /**
   * `keyName` is not decoration. `useFieldArray` writes React's key onto the
   * field object as `id`, which is the name this array already uses for the
   * `product_image` row's id — the thing that says whether an Image has been
   * persisted (ADR-0019). Renaming React's key is what keeps ours readable.
   */
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "images",
    keyName: "tileId",
  });

  const createUpload = useCreateImageUpload();
  const discardUpload = useDiscardImageUpload();

  const upload = useImageUpload({
    createUpload,
    discardUpload,
    // Blank alt text and no Variant: the two Product facts a file cannot carry,
    // and the two the Admin fills in on the tile it has just become.
    onUploaded: (key) => append({ s3Key: key, altText: "", variantId: null }),
  });

  /**
   * Remove an Image the form already holds. **A field edit, not a confirmed
   * write** (ADR-0018): it is undone by adding the file back, and confirming
   * it would mean confirming every array row on this form.
   *
   * A key that was never persisted takes its object with it now — that orphan
   * is the one we can see. A persisted row's object dies with the `update`
   * that writes an array no longer holding its key: irreversible, but
   * irreversible at submit, which is the act the Admin performs deliberately.
   */
  const removeImage = (index: number) => {
    const image = fields[index];

    remove(index);

    if (image && !image.id) discardUpload.mutate({ key: image.s3Key });
  };

  /**
   * Keep every tile pointing at the Variant it was pointing at, after the
   * Variant at `removedIndex` leaves the array (`variantIndexAfterRemoval`).
   * `VariantFields` calls this as it removes a row: the two arrays are one
   * form, and an index into one of them is only true while the other holds
   * still.
   *
   * `setValue` per tile rather than `replace`, which would remount the tiles
   * and take the alt text an Admin is halfway through typing with it.
   */
  const dropVariant = (removedIndex: number) => {
    form.getValues("images").forEach((image, index) => {
      const next = variantIndexAfterRemoval(image.variantId, removedIndex);

      if (next !== image.variantId) {
        form.setValue(`images.${index}.variantId`, next);
      }
    });
  };

  return {
    /** The Images the form holds, in the order the shop will render them. */
    fields,
    /** The files still on their way to becoming one of them. */
    upload,
    removeImage,
    dropVariant,
    /** Reordering is a client-side array move; `position` is derived on save. */
    move,
  };
}

/** One prop rather than five, for the field group this hook feeds. */
export type ProductImages = ReturnType<typeof useProductImages>;
