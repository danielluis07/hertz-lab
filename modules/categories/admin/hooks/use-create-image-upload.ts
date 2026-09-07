"use client";

import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

/**
 * Asks for one presigned PUT, and the key the Category's picture will live
 * under (ADR-0018). The upload it authorises is not this mutation and does not
 * run here — `putWithProgress` sends the bytes, because only `XMLHttpRequest`
 * reports progress.
 *
 * **The twin of the products hook, and a copy of it on purpose.** What differs
 * is the procedure it binds, and that procedure is the half of the uploader
 * that does not promote: it mints the `categories/` prefix (ADR-0021).
 * Importing the products hook to avoid four lines is what ADR-0009 forbids
 * outright.
 *
 * **It owns neither of the two things a write hook usually owns**
 * (`docs/MODULES.md`). There is nothing to invalidate: minting a URL changes no
 * row and no query. And there is no success toast: the tile is already showing
 * a preview and a bar, and a toast for a picture that is not saved yet would
 * congratulate the Admin for something that has not happened.
 *
 * **No `onError` either**, and here that is worth stating: `createImageUpload`
 * *is* a mutation, so the `MutationCache` toasts a pt-BR sentence when it
 * fails (ADR-0013). The PUT it authorises is where that guarantee stops, and
 * the tile owns that failure itself.
 */
export const useCreateImageUpload = () => {
  const trpc = useTRPC();

  return useMutation(trpc.categories.admin.createImageUpload.mutationOptions());
};
