"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

/** Update Customer values, then refresh every mounted Customer query. */
export const useUpdateProfile = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.customers.shop.updateProfile.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.customers.pathFilter());
        toast.success("Perfil atualizado.");
      },
    }),
  );
};
