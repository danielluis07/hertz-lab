"use client";

import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

/**
 * Throws away the object behind a picture the Admin replaced or removed before
 * the Category was ever saved with it — the one orphan ADR-0018 can see, and
 * therefore the one it takes.
 *
 * **Fire and forget.** Nothing waits on it and nothing renders its result: the
 * picture is already gone from the form, which is the act the Admin performed.
 * The procedure refuses a key any `category` row references and swallows an S3
 * failure, so what is left when this does nothing is exactly the orphan the ADR
 * already tolerates — and so a client that misjudges a key as unpersisted
 * cannot delete a live picture.
 *
 * No invalidation and no toast, for the same reasons as the hook beside it.
 */
export const useDiscardImageUpload = () => {
  const trpc = useTRPC();

  return useMutation(
    trpc.categories.admin.discardImageUpload.mutationOptions(),
  );
};
