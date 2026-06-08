import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

export function useWorkspaceSnapshot() {
  const session = useSession();

  return useQuery({
    ...orpc.workspace.get.queryOptions(),
    enabled: Boolean(session.data?.user),
    staleTime: 30_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
  });
}
