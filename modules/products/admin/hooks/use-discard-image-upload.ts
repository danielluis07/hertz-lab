"use client";

import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

/**
 * Throws away the object behind a tile the Admin removed before it was ever
 * saved — the one orphan ADR-0018 can see, and therefore the one it takes.
 *
 * **Fire and forget.** Nothing waits on it and nothing renders its result:
 * the tile is already gone from the form, which is the act the Admin
 * performed. The procedure refuses a key any row references and swallows an
 * S3 failure, so what is left when this does nothing is exactly the orphan
 * the ADR already tolerates.
 *
 * No invalidation and no toast, for the same reasons as the hook beside it.
 */
export const useDiscardImageUpload = () => {
  const trpc = useTRPC();

  return useMutation(trpc.products.admin.discardImageUpload.mutationOptions());
};
