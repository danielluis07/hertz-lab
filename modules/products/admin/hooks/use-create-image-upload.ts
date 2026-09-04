"use client";

import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

/**
 * Asks for one presigned PUT, and the key the object will live under
 * (ADR-0018). The upload it authorises is not this mutation and does not run
 * here — `putWithProgress` sends the bytes, because only `XMLHttpRequest`
 * reports progress.
 *
 * **It owns neither of the two things a write hook usually owns.** There is
 * nothing to invalidate: minting a URL changes no row and no query. And there
 * is no success toast: the tile is already showing a preview and a bar, and a
 * toast per photograph on a form where six is normal is noise.
 *
 * **No `onError` either**, and here that is worth stating: `createImageUpload`
 * *is* a mutation, so the `MutationCache` toasts a pt-BR sentence when it
 * fails (ADR-0013). The PUT it authorises is where that guarantee stops, and
 * the tile owns that failure itself.
 */
export const useCreateImageUpload = () => {
  const trpc = useTRPC();

  return useMutation(trpc.products.admin.createImageUpload.mutationOptions());
};
