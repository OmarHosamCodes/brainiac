import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { bindQueryClient } from "@/lib/query-client";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
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
          toast.error("Error", {
            description: error.message || "An unexpected error occurred.",
          });
        },
      }),
    });
    bindQueryClient(client);
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
