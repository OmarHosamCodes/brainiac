import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { bindQueryClient } from "@/lib/query-client";

export function createAppQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        retryDelay: (attempt) => Math.min(250 * 2 ** attempt, 1_500),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        if (typeof window === "undefined") return;
        toast.error("Error", {
          description: error.message || "An unexpected error occurred.",
        });
      },
    }),
  });
  bindQueryClient(client);
  return client;
}
