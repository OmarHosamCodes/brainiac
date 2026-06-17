import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

export type AgencySyncState = "loading" | "syncing" | "synced" | "error";

function teamQueryPredicate(teamId: string) {
  return (query: { queryKey: readonly unknown[] }) =>
    JSON.stringify(query.queryKey).includes(teamId);
}

export function useAgencySyncStatus(teamId: string): AgencySyncState {
  const queryClient = useQueryClient();

  const isFetching = useIsFetching({
    predicate: teamId ? teamQueryPredicate(teamId) : undefined,
  });

  const hasError = useMemo(() => {
    if (!teamId) return false;
    const queries = queryClient.getQueryCache().findAll({
      predicate: teamQueryPredicate(teamId),
    });
    return queries.some((query) => query.state.fetchStatus === "idle" && query.state.status === "error");
  }, [teamId, queryClient, isFetching]);

  const hasData = useMemo(() => {
    if (!teamId) return false;
    const queries = queryClient.getQueryCache().findAll({
      predicate: teamQueryPredicate(teamId),
    });
    return queries.some((query) => query.state.data !== undefined);
  }, [teamId, queryClient, isFetching]);

  if (!teamId) {
    return "loading";
  }

  if (hasError) {
    return "error";
  }

  if (isFetching > 0) {
    return hasData ? "syncing" : "loading";
  }

  return "synced";
}
