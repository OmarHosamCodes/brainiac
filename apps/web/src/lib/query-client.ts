import type { QueryClient } from "@tanstack/react-query";

let queryClient: QueryClient | null = null;

export function bindQueryClient(client: QueryClient) {
  queryClient = client;
}

export function getQueryClient(): QueryClient {
  if (!queryClient) {
    throw new Error("QueryClient is not initialized. Wrap the app in QueryProvider.");
  }
  return queryClient;
}
