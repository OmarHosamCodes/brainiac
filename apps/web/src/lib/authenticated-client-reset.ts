import type { QueryClient } from "@tanstack/react-query";

import { useTeamStore } from "@/features/team/team-store";

export type AuthenticatedRouterReset = {
  invalidate: () => Promise<unknown>;
  clearCache: (opts?: { filter?: (match: { routeId: string }) => boolean }) => void;
};

export function shouldResetAuthenticatedClientState(
  previousUserId: string | null,
  nextUserId: string | null,
  isPending: boolean,
): boolean {
  if (isPending) {
    return false;
  }
  if (!previousUserId) {
    return false;
  }
  return previousUserId !== nextUserId;
}

export function resetAuthenticatedClientState(input: {
  queryClient: QueryClient;
  router: AuthenticatedRouterReset;
}): void {
  input.queryClient.clear();
  useTeamStore.getState().setSelectedTeamId("");
  input.router.clearCache({
    filter: (match) =>
      match.routeId === "/_authenticated" || match.routeId.startsWith("/_authenticated"),
  });
  void input.router.invalidate();
}
