"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

/** Save a Variant, then refetch every mounted Wishlist list and membership. */
export const useSaveWishlistItem = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.wishlist.save.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries(trpc.wishlist.pathFilter()),
    }),
  );
};
