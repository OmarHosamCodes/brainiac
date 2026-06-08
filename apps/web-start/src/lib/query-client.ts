import { QueryCache, QueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui/toast";

export function createQueryClient() {
  return new QueryClient({
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
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    }),
  });
}
