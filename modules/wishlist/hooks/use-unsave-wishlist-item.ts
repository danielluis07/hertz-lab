"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

/** Unsave a Variant, then refetch every mounted Wishlist list and membership. */
export const useUnsaveWishlistItem = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.wishlist.unsave.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries(trpc.wishlist.pathFilter()),
    }),
  );
};
