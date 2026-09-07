"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";
import { useImageUpload } from "@/hooks/use-image-upload";
import { useCreateImageUpload } from "@/modules/categories/admin/hooks/use-create-image-upload";
import { useDiscardImageUpload } from "@/modules/categories/admin/hooks/use-discard-image-upload";
import type { CategoryFormValues } from "@/modules/categories/schemas";

/**
 * The picture half of the Category form, as state (ADR-0018): the one key the
 * form holds, plus — through `useImageUpload` — the file that is still on its
 * way to becoming it.
 *
 * **This module's thin equivalent of `use-product-images`**, and thin is the
 * point. Pick, check, presign, PUT, progress, retry and cancel are true of any
 * picture and live in `hooks/use-image-upload.ts`; this hands that hook the two
 * procedures that do not promote (`use-create-image-upload`,
 * `use-discard-image-upload`) and keeps the three rules a *single* picture has:
 *
 * 1. **An arriving key replaces the current one** rather than appending. A
 *    Category carries one `image_s3_key` (ADR-0021), so a second file is a
 *    correction, not a second photograph — which is also what `multiple={false}`
 *    on the field says to the Admin before they pick it.
 * 2. **The replaced key is discarded only if it was never persisted.** That
 *    orphan is the one this code can see. A key the row already holds is left
 *    alone, because its object dies with the `update` that drops it — after the
 *    commit, so a rolled-back save does not leave a live Category pointing at
 *    an object that is gone.
 * 3. **Removing the picture is `null`**, and discards on the same terms. The
 *    column is nullable and a Category is fully usable without a picture.
 *
 * **It is a hook and not the `.tsx`** because it is nothing but rule and
 * sequence, which a component may not hold (`docs/CONVENTIONS.md`) — and
 * because submit is its second reader: `category-form.tsx` disables the button
 * while `upload.isUploading`, so a Category cannot be saved having silently
 * lost the picture that was still going up.
 *
 * Neither of the two mutations invalidates or toasts, which is the same pair of
 * exemptions the products module records: minting a URL changes no row, and a
 * toast per picture is noise beside a tile that already shows one.
 */
export function useCategoryImage({
  form,
  persistedKey,
}: {
  form: UseFormReturn<CategoryFormValues>;
  /**
   * The key the row was loaded holding — the edit form's `defaultValues`, and
   * `null` on a Category that does not exist yet. Read at the call site rather
   * than from `formState`, for the reason `useSlugFromName` takes `follows`
   * there: what the form opened with is the owner's fact, not something a hook
   * should reach back into the form to rediscover.
   *
   * It is what tells rule 2 above which orphan is ours to take. Misjudging it
   * cannot delete a live picture even so: `discardImageUpload` refuses a key
   * any `category` row references.
   */
  persistedKey: string | null;
}) {
  // In this leaf rather than through `form.watch`, so a picture arriving
  // redraws the tile and not every field on the form.
  const s3Key = useWatch({ control: form.control, name: "imageS3Key" });

  const createUpload = useCreateImageUpload();
  const discardUpload = useDiscardImageUpload();

  /**
   * The one write this hook makes, and all three rules go through it: a key
   * from an upload, or `null` from "Remover".
   *
   * `shouldValidate` because a refusal the *server* wrote onto this field —
   * an object that was missing or oversized when the save `stat`ed it — is
   * about the picture that is now gone, and a sentence under a tile the Admin
   * has already replaced is a sentence about nothing.
   */
  const replace = (next: string | null) => {
    const current = form.getValues("imageS3Key");

    form.setValue("imageS3Key", next, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (current !== null && current !== persistedKey) {
      discardUpload.mutate({ key: current });
    }
  };

  const upload = useImageUpload({
    createUpload,
    discardUpload,
    // Nothing else to fill in: a Category picture has no alt text (ADR-0021),
    // no badge and no Variant. The key *is* the field.
    onUploaded: replace,
  });

  return {
    /** The key the form holds, or null for a Category with no picture. */
    s3Key,
    /** The file still on its way to becoming it. */
    upload,
    remove: () => replace(null),
  };
}
