import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as React from "react";

import { Toaster } from "@/components/ui/toast";
import { AppShellProvider } from "@/layouts/app-layout";
import { createQueryClient } from "@/lib/query-client";

export function AppProviders(props: { children: React.ReactNode }): React.ReactElement {
  const [queryClient] = React.useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AppShellProvider>{props.children}</AppShellProvider>
      <Toaster />
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
