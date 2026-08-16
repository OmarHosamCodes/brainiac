import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import {
  adjustPaginatedTotal,
  EMPTY_LIST_OVERLAY,
  mergeListWithOverlay,
} from "@/features/shared/agency-optimistic-merge";
import { findProjectTaskInCache } from "@/features/shared/agency-query-cache";
import { useAgencyOptimisticStore } from "@/features/shared/stores/agency-optimistic";
import { useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import { orpc, orpcClient } from "@/lib/orpc";

const PAGE_SIZE = 100;
const STALE_TIME_MS = 15_000;

type ChooserListKind = "catalog" | "search";

type DrainablePages = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: (opts?: { cancelRefetch: boolean }) => unknown;
};

function chooserListInput(teamId: string, search?: string) {
  return {
    teamId,
    pageSize: PAGE_SIZE,
    ...(search ? { search } : {}),
  };
}

function chooserListQueryKey(teamId: string, kind: ChooserListKind, search?: string) {
  return [
    ...orpc.agencyOps.projectTasks.list.queryOptions({
      input: chooserListInput(teamId, search),
    }).queryKey,
    "infinite",
    kind,
  ] as const;
}

function nextPageParam(lastPage: { page: number; pageSize: number; total: number }) {
  if (lastPage.page * lastPage.pageSize < lastPage.total) return lastPage.page + 1;
  return undefined;
}

function drainNextPage(query: DrainablePages) {
  if (!query.hasNextPage || query.isFetchingNextPage) return;
  void query.fetchNextPage({ cancelRefetch: false });
}

export async function ensureAgencyTaskChooserCatalog(queryClient: QueryClient, teamId: string) {
  if (!teamId) return;
  const input = chooserListInput(teamId);
  await queryClient.fetchInfiniteQuery({
    queryKey: chooserListQueryKey(teamId, "catalog"),
    queryFn: ({ pageParam }) =>
      orpcClient.agencyOps.projectTasks.list({
        ...input,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    staleTime: STALE_TIME_MS,
    pages: 1,
  });
}

function useChooserTaskPages(
  teamId: string,
  kind: ChooserListKind,
  options: { search?: string; enabled?: boolean } = {},
) {
  const search = options.search?.trim() || undefined;
  const input = useMemo(() => chooserListInput(teamId, search), [teamId, search]);
  const queryEnabled = Boolean(teamId) && (options.enabled === undefined || options.enabled);
  const queryKey = useMemo(() => chooserListQueryKey(teamId, kind, search), [teamId, kind, search]);

  const registerProjectTasksQuery = useAgencyOpsStore((s) => s.registerProjectTasksQuery);
  const unregisterProjectTasksQuery = useAgencyOpsStore((s) => s.unregisterProjectTasksQuery);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) =>
      orpcClient.agencyOps.projectTasks.list({
        ...input,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    enabled: queryEnabled,
    staleTime: STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!teamId || !queryEnabled) return;
    registerProjectTasksQuery({ queryKey: [...queryKey], teamId });
    return () => unregisterProjectTasksQuery([...queryKey]);
  }, [teamId, queryKey, queryEnabled, registerProjectTasksQuery, unregisterProjectTasksQuery]);

  const overlay = useAgencyOptimisticStore((state) => state.tasks[teamId] ?? EMPTY_LIST_OVERLAY);
  const serverItems = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data?.pages],
  );
  const items = useMemo(
    () => mergeListWithOverlay(serverItems, overlay, () => true),
    [serverItems, overlay],
  );
  const total = useMemo(() => {
    const serverTotal = query.data?.pages[0]?.total ?? 0;
    return adjustPaginatedTotal(serverTotal, overlay, serverItems);
  }, [overlay, query.data?.pages, serverItems]);

  return { ...query, items, total };
}

export function useAgencyProjectTasksForChooserQuery(
  teamId: string,
  filters: { search?: string; enabled?: boolean } = {},
  options: { selectedTaskIds?: readonly string[] } = {},
) {
  const catalogEnabled = filters.enabled === undefined || filters.enabled;
  const catalogQuery = useChooserTaskPages(teamId, "catalog", { enabled: catalogEnabled });
  const normalizedSearch = filters.search?.trim() ?? "";
  const searchQuery = useChooserTaskPages(teamId, "search", {
    search: normalizedSearch,
    enabled: Boolean(normalizedSearch) && catalogEnabled,
  });
  const selectedTaskIdsKey = options.selectedTaskIds?.filter(Boolean).join(",") ?? "";
  const selectedTaskIds = useMemo(
    () => [...new Set(selectedTaskIdsKey.split(",").filter(Boolean))],
    [selectedTaskIdsKey],
  );

  useEffect(() => {
    if (!teamId) return;
    drainNextPage(catalogQuery);
    if (normalizedSearch) drainNextPage(searchQuery);
  }, [
    teamId,
    normalizedSearch,
    catalogQuery.hasNextPage,
    catalogQuery.isFetchingNextPage,
    catalogQuery.fetchNextPage,
    catalogQuery.data?.pages.length,
    searchQuery.hasNextPage,
    searchQuery.isFetchingNextPage,
    searchQuery.fetchNextPage,
    searchQuery.data?.pages.length,
  ]);

  const items = useMemo(() => {
    const byId = new Map(catalogQuery.items.map((task) => [task.id, task]));
    for (const task of searchQuery.items) byId.set(task.id, task);
    for (const taskId of selectedTaskIds) {
      const cachedTask = findProjectTaskInCache(teamId, taskId);
      if (cachedTask) byId.set(cachedTask.id, cachedTask);
    }
    return [...byId.values()];
  }, [catalogQuery.items, searchQuery.items, selectedTaskIds, teamId]);

  const activeQuery = normalizedSearch ? searchQuery : catalogQuery;
  const isPending = catalogQuery.isPending && items.length === 0;

  return {
    ...activeQuery,
    items,
    total: activeQuery.total,
    isPending,
    isLoading: isPending,
  };
}
