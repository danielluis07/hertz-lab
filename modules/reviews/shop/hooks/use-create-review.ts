"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

/**
 * Create a pending Review, then refetch only this Product's writing state.
 *
 * The public list and the Product query stay untouched: a pending Review
 * changes neither approved Reviews nor the rating (ADR-0004, ADR-0036). The
 * awaited invalidation keeps the mutation pending until the island has
 * converged, so the form cannot be submitted twice in the gap.
 *
 * A duplicate is a `CONFLICT` with no `field`: the global tier toasts its copy,
 * and the refetch here moves a stale eligible island onto the persisted Review.
 */
export const useCreateReview = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.reviews.shop.create.mutationOptions({
      onSuccess: async (_created, { productId }) => {
        await queryClient.invalidateQueries(
          trpc.reviews.shop.writingState.queryFilter({ productId }),
        );
        toast.success("Avaliação enviada para moderação.");
      },
      onError: async (error, { productId }) => {
        if (error.data?.code !== "CONFLICT") return;

        await queryClient.invalidateQueries(
          trpc.reviews.shop.writingState.queryFilter({ productId }),
        );
      },
    }),
  );
};
