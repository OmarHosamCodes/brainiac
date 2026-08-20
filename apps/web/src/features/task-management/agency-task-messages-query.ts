import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { orpc, orpcClient } from "@/lib/orpc";

const PAGE_SIZE = 50;

export function agencyTaskMessagesInfiniteQueryKey(teamId: string, taskId: string) {
  return [
    ...orpc.agencyOps.taskMessages.list.queryOptions({
      input: { teamId, taskId, pageSize: PAGE_SIZE },
    }).queryKey,
    "infinite",
  ] as const;
}

export function useAgencyTaskMessagesInfiniteQuery(teamId: string, taskId: string, enabled = true) {
  const queryKey = useMemo(
    () => agencyTaskMessagesInfiniteQueryKey(teamId, taskId),
    [teamId, taskId],
  );

  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      orpcClient.agencyOps.taskMessages.list({
        teamId,
        taskId,
        pageSize: PAGE_SIZE,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(teamId && taskId && enabled),
    placeholderData: keepPreviousData,
  });
}
