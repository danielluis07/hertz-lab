import {
  defaultShouldDehydrateQuery,
  MutationCache,
  QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import superjson from "superjson";
import { mutationErrorMessage } from "@/trpc/error-copy";

export function makeQueryClient() {
  return new QueryClient({
    /**
     * The safety net of ADR-0013. This fires before a hook's own `onError` and
     * before the call site's, for every mutation in the app, so no write can
     * fail silently — there is no handler to forget, because nothing opts in.
     * `mutationErrorMessage` returns null when a form will render the error.
     */
    mutationCache: new MutationCache({
      onError: (error) => {
        const message = mutationErrorMessage(error);
        if (message) toast.error(message);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  });
}
