import type { QueryClient } from "@tanstack/react-query";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { authClient } from "@/lib/auth-client";
import { mergeAgencyPresenceMembers } from "@/features/shared/agency-presence-members";
import {
  useMergedAgencyActiveTimerQuery,
  useMergedAgencyCapacityQuery,
  useMergedAgencyClientsQuery,
  useMergedAgencyContactQuery,
  useMergedAgencyProjectTasksQuery,
  useMergedAgencyProjectsQuery,
  useMergedAgencyTimeEntriesQuery,
} from "@/features/shared/agency-optimistic";
import { getQueryClient } from "@/lib/query-client";
import type { AgencyClientArchiveFilter } from "@/features/shared/agency-client-archive-filter";
import { orpc, orpcClient } from "@/lib/orpc";
import {
  adjustPaginatedTotal,
  EMPTY_LIST_OVERLAY,
  mergeListWithOverlay,
} from "@/features/shared/agency-optimistic-merge";
import {
  withAgencySyncQueryOptions,
  prefetchAgencySyncQueryOptions,
} from "@/features/shared/agency-query-options";
import {
  taskMatchesAgencyFilters,
  useAgencyOptimisticStore,
} from "@/features/shared/stores/agency-optimistic";
import { useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import { useAgencyTimeTrackingStore } from "@/features/time-tracking/stores/agency-time-tracking";

export type AgencyProjectTaskStatus = "open" | "in_progress" | "done" | "archived";

export type AgencyProjectTasksFilters = {
  projectId?: string;
  assigneeUserId?: string;
  delegatedByUserId?: string;
  journeyDiscoveryForUserId?: string;
  statuses?: AgencyProjectTaskStatus[];
  search?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
};

export type AgencyProjectTasksListPage = {
  items: Array<{
    id: string;
    projectId: string;
    title: string;
    status: AgencyProjectTaskStatus;
    assignees: Array<{ userId: string; userName: string }>;
    assignedToTeam: boolean;
    dueDate: string | null;
    createdAt: string;
    updatedAt: string;
    teamId: string;
    memberStatus?: AgencyProjectTaskStatus;
  }>;
  page: number;
  pageSize: number;
  total: number;
};

export async function ensureAgencyWorkBootQueries(
  queryClient: QueryClient,
  teamId: string,
  assigneeUserId: string,
) {
  if (!teamId) return;

  await Promise.all([
    queryClient.ensureQueryData(
      prefetchAgencySyncQueryOptions(
        orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
        "cold",
      ),
    ),
    queryClient.ensureQueryData(
      prefetchAgencySyncQueryOptions(
        orpc.agencyOps.projectTasks.list.queryOptions({
          input: {
            teamId,
            assigneeUserId,
            statuses: ["open", "in_progress"],
          },
        }),
        "hot",
      ),
    ),
    queryClient.ensureQueryData(
      prefetchAgencySyncQueryOptions(
        orpc.agencyOps.projectTasks.list.queryOptions({
          input: {
            teamId,
            assigneeUserId,
            statuses: ["done"],
          },
        }),
        "hot",
      ),
    ),
    queryClient.ensureQueryData(
      prefetchAgencySyncQueryOptions(
        orpc.agencyOps.timer.getActive.queryOptions({
          input: { teamId },
        }),
        "hot",
      ),
    ),
    queryClient.ensureQueryData(
      prefetchAgencySyncQueryOptions(
        orpc.agencyOps.timer.listActiveMembers.queryOptions({
          input: { teamId },
        }),
        "hot",
      ),
    ),
    queryClient.ensureQueryData(
      prefetchAgencySyncQueryOptions(
        orpc.agencyOps.timeEntries.listMine.queryOptions({
          input: { teamId, page: 1, pageSize: 20 },
        }),
        "hot",
      ),
    ),
  ]);
}

export function prefetchAgencyWorkQueries(teamId: string, assigneeUserId: string) {
  void ensureAgencyWorkBootQueries(getQueryClient(), teamId, assigneeUserId);
}

export async function invalidateAgencyTeamQueries(teamId: string) {
  if (!teamId) return;

  const queryClient = getQueryClient();
  await queryClient.invalidateQueries({
    predicate: (query) => JSON.stringify(query.queryKey).includes(teamId),
  });
}

export function useAgencyProjectsQuery(
  teamId: string,
  options: { clientId?: string; archiveFilter?: AgencyClientArchiveFilter } = {},
) {
  const archiveFilter = options.archiveFilter ?? "nonarchived";
  const registerProjectsQuery = useAgencyOpsStore((s) => s.registerProjectsQuery);
  const unregisterProjectsQuery = useAgencyOpsStore((s) => s.unregisterProjectsQuery);

  const input = useMemo(
    () => ({
      teamId,
      archiveFilter,
      ...(options.clientId ? { clientId: options.clientId } : {}),
    }),
    [teamId, archiveFilter, options.clientId],
  );

  const queryKey = orpc.agencyOps.projects.list.queryOptions({ input }).queryKey;

  const query = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.projects.list.queryOptions({ input }),
        enabled: Boolean(teamId),
        placeholderData: keepPreviousData,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  useEffect(() => {
    if (!teamId) return;
    registerProjectsQuery({ queryKey, teamId, clientId: options.clientId });
    return () => unregisterProjectsQuery(queryKey);
  }, [teamId, queryKey, options.clientId, registerProjectsQuery, unregisterProjectsQuery]);

  return useMergedAgencyProjectsQuery(query, teamId, options.clientId);
}

export function useAgencyClientsQuery(
  teamId: string,
  options: { archiveFilter?: AgencyClientArchiveFilter } = {},
) {
  const archiveFilter = options.archiveFilter ?? "nonarchived";
  const registerClientsQuery = useAgencyOpsStore((s) => s.registerClientsQuery);
  const unregisterClientsQuery = useAgencyOpsStore((s) => s.unregisterClientsQuery);

  const input = useMemo(() => ({ teamId, archiveFilter }), [teamId, archiveFilter]);

  const queryKey = orpc.agencyOps.clients.list.queryOptions({ input }).queryKey;

  const query = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.clients.list.queryOptions({ input }),
        enabled: Boolean(teamId),
        placeholderData: keepPreviousData,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  useEffect(() => {
    if (!teamId) return;
    registerClientsQuery({ queryKey, teamId });
    return () => unregisterClientsQuery(queryKey);
  }, [teamId, queryKey, registerClientsQuery, unregisterClientsQuery]);

  return useMergedAgencyClientsQuery(query, teamId);
}

export function useAgencyContactQuery(teamId: string, clientId: string) {
  const registerContactQuery = useAgencyOpsStore((s) => s.registerContactQuery);
  const unregisterContactQuery = useAgencyOpsStore((s) => s.unregisterContactQuery);

  const queryKey = orpc.agencyOps.contacts.get.queryOptions({
    input: { teamId, clientId },
  }).queryKey;

  const query = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.contacts.get.queryOptions({
          input: { teamId, clientId },
        }),
        enabled: Boolean(teamId) && Boolean(clientId),
        placeholderData: keepPreviousData,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  useEffect(() => {
    if (!teamId || !clientId) return;
    registerContactQuery({ queryKey, teamId, clientId });
    return () => unregisterContactQuery(queryKey);
  }, [teamId, clientId, queryKey, registerContactQuery, unregisterContactQuery]);

  return useMergedAgencyContactQuery(query, teamId, clientId);
}

export function useAgencyCapacityQuery(teamId: string, weekStart: string, weeks: number) {
  const registerCapacityQuery = useAgencyOpsStore((s) => s.registerCapacityQuery);
  const unregisterCapacityQuery = useAgencyOpsStore((s) => s.unregisterCapacityQuery);

  const input = useMemo(() => ({ teamId, weekStart, weeks }), [teamId, weekStart, weeks]);

  const queryKey = orpc.agencyOps.capacity.list.queryOptions({ input }).queryKey;

  const query = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.capacity.list.queryOptions({ input }),
        enabled: Boolean(teamId),
        placeholderData: keepPreviousData,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  useEffect(() => {
    if (!teamId) return;
    registerCapacityQuery({ queryKey, teamId });
    return () => unregisterCapacityQuery(queryKey);
  }, [teamId, queryKey, registerCapacityQuery, unregisterCapacityQuery]);

  return useMergedAgencyCapacityQuery(query, teamId);
}

export function useAgencyProjectJourneyQuery(teamId: string, projectId: string) {
  return useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.projects.journey.get.queryOptions({
          input: { teamId, projectId },
        }),
        enabled: Boolean(teamId) && Boolean(projectId),
        placeholderData: keepPreviousData,
      },
      "warm",
      { liveGated: true, teamId, noPoll: true },
    ),
  );
}

export function useAgencyProjectTasksQuery(
  teamId: string,
  filters: AgencyProjectTasksFilters = {},
) {
  const registerProjectTasksQuery = useAgencyOpsStore((s) => s.registerProjectTasksQuery);
  const unregisterProjectTasksQuery = useAgencyOpsStore((s) => s.unregisterProjectTasksQuery);

  const statusesKey = filters.statuses?.join(",") ?? "";

  const stableFilters = useMemo(
    () => ({
      projectId: filters.projectId,
      assigneeUserId: filters.assigneeUserId,
      delegatedByUserId: filters.delegatedByUserId,
      journeyDiscoveryForUserId: filters.journeyDiscoveryForUserId,
      statuses: filters.statuses,
      search: filters.search,
      page: filters.page,
      pageSize: filters.pageSize,
    }),
    [
      filters.projectId,
      filters.assigneeUserId,
      filters.delegatedByUserId,
      filters.journeyDiscoveryForUserId,
      statusesKey,
      filters.statuses,
      filters.search,
      filters.page,
      filters.pageSize,
    ],
  );

  const input = useMemo(
    () => ({
      teamId,
      ...(stableFilters.projectId ? { projectId: stableFilters.projectId } : {}),
      ...(stableFilters.assigneeUserId ? { assigneeUserId: stableFilters.assigneeUserId } : {}),
      ...(stableFilters.delegatedByUserId
        ? { delegatedByUserId: stableFilters.delegatedByUserId }
        : {}),
      ...(stableFilters.journeyDiscoveryForUserId
        ? { journeyDiscoveryForUserId: stableFilters.journeyDiscoveryForUserId }
        : {}),
      ...(stableFilters.statuses ? { statuses: stableFilters.statuses } : {}),
      ...(stableFilters.search ? { search: stableFilters.search } : {}),
      ...(stableFilters.page ? { page: stableFilters.page } : {}),
      ...(stableFilters.pageSize ? { pageSize: stableFilters.pageSize } : {}),
    }),
    [teamId, stableFilters],
  );

  const queryKey = useMemo(
    () => orpc.agencyOps.projectTasks.list.queryOptions({ input }).queryKey,
    [input],
  );

  const queryEnabled =
    Boolean(teamId) &&
    (stableFilters.projectId === undefined || Boolean(stableFilters.projectId)) &&
    (stableFilters.assigneeUserId === undefined || Boolean(stableFilters.assigneeUserId)) &&
    (stableFilters.delegatedByUserId === undefined || Boolean(stableFilters.delegatedByUserId)) &&
    (stableFilters.journeyDiscoveryForUserId === undefined ||
      Boolean(stableFilters.journeyDiscoveryForUserId)) &&
    (filters.enabled === undefined || filters.enabled);

  const query = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.projectTasks.list.queryOptions({ input }),
        enabled: queryEnabled,
        placeholderData: keepPreviousData,
      },
      "hot",
      { liveGated: true, teamId },
    ),
  );

  useEffect(() => {
    if (!teamId || !queryEnabled) return;
    registerProjectTasksQuery({
      queryKey,
      teamId,
      projectId: stableFilters.projectId,
      assigneeUserId: stableFilters.assigneeUserId,
      statuses: stableFilters.statuses,
    });
    return () => unregisterProjectTasksQuery(queryKey);
  }, [
    teamId,
    queryKey,
    queryEnabled,
    stableFilters.projectId,
    stableFilters.assigneeUserId,
    stableFilters.statuses,
    registerProjectTasksQuery,
    unregisterProjectTasksQuery,
  ]);

  return useMergedAgencyProjectTasksQuery(query, teamId, stableFilters);
}

export function useAgencyProjectTasksInfiniteQuery(
  teamId: string,
  filters: AgencyProjectTasksFilters = {},
) {
  const pageSize = filters.pageSize ?? 50;
  const statusesKey = filters.statuses?.join(",") ?? "";

  const baseInput = useMemo(
    () => ({
      teamId,
      pageSize,
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.assigneeUserId ? { assigneeUserId: filters.assigneeUserId } : {}),
      ...(filters.delegatedByUserId ? { delegatedByUserId: filters.delegatedByUserId } : {}),
      ...(filters.journeyDiscoveryForUserId
        ? { journeyDiscoveryForUserId: filters.journeyDiscoveryForUserId }
        : {}),
      ...(filters.statuses ? { statuses: filters.statuses } : {}),
      ...(filters.search ? { search: filters.search } : {}),
    }),
    [
      teamId,
      pageSize,
      filters.projectId,
      filters.assigneeUserId,
      filters.delegatedByUserId,
      filters.journeyDiscoveryForUserId,
      statusesKey,
      filters.statuses,
      filters.search,
    ],
  );

  const queryEnabled =
    Boolean(teamId) &&
    (filters.projectId === undefined || Boolean(filters.projectId)) &&
    (filters.assigneeUserId === undefined || Boolean(filters.assigneeUserId)) &&
    (filters.delegatedByUserId === undefined || Boolean(filters.delegatedByUserId)) &&
    (filters.journeyDiscoveryForUserId === undefined || Boolean(filters.journeyDiscoveryForUserId));

  const queryKey = useMemo(
    () =>
      [
        ...orpc.agencyOps.projectTasks.list.queryOptions({ input: baseInput }).queryKey,
        "infinite",
      ] as const,
    [baseInput],
  );

  const registerProjectTasksQuery = useAgencyOpsStore((s) => s.registerProjectTasksQuery);
  const unregisterProjectTasksQuery = useAgencyOpsStore((s) => s.unregisterProjectTasksQuery);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) =>
      orpcClient.agencyOps.projectTasks.list({
        ...baseInput,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page * lastPage.pageSize < lastPage.total) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: queryEnabled,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!teamId || !queryEnabled) return;
    registerProjectTasksQuery({
      queryKey: [...queryKey],
      teamId,
      projectId: filters.projectId,
      assigneeUserId: filters.assigneeUserId,
      statuses: filters.statuses,
    });
    return () => unregisterProjectTasksQuery([...queryKey]);
  }, [
    teamId,
    queryKey,
    queryEnabled,
    filters.projectId,
    filters.assigneeUserId,
    filters.statuses,
    registerProjectTasksQuery,
    unregisterProjectTasksQuery,
  ]);

  const overlay = useAgencyOptimisticStore((state) => state.tasks[teamId] ?? EMPTY_LIST_OVERLAY);
  const pruneTasks = useAgencyOptimisticStore((state) => state.pruneTasks);

  const matches = useMemo(
    () => (task: Parameters<typeof taskMatchesAgencyFilters>[0]) =>
      taskMatchesAgencyFilters(task, {
        projectId: filters.projectId,
        assigneeUserId: filters.assigneeUserId,
        delegatedByUserId: filters.delegatedByUserId,
        journeyDiscoveryForUserId: filters.journeyDiscoveryForUserId,
        statuses: filters.statuses,
      }),
    [
      filters.projectId,
      filters.assigneeUserId,
      filters.delegatedByUserId,
      filters.journeyDiscoveryForUserId,
      filters.statuses,
      statusesKey,
    ],
  );

  const serverItems = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data?.pages],
  );

  const items = useMemo(
    () => mergeListWithOverlay(serverItems, overlay, matches),
    [serverItems, overlay, matches],
  );

  const isDoneCompletionList =
    Boolean(filters.assigneeUserId) &&
    Boolean(filters.statuses?.includes("done")) &&
    !filters.statuses?.includes("open") &&
    !filters.statuses?.includes("in_progress");

  const total = useMemo(() => {
    if (isDoneCompletionList) {
      return items.reduce((sum, task) => sum + (task.viewerCompletionCount ?? 0), 0);
    }
    const serverTotal = query.data?.pages[0]?.total ?? 0;
    return adjustPaginatedTotal(serverTotal, overlay, serverItems);
  }, [isDoneCompletionList, items, overlay, query.data?.pages, serverItems]);

  useEffect(() => {
    if (!teamId || !query.isSuccess) return;
    // Only the assignee-filtered Active rail may prune status/create overlays.
    // Done-list pages can carry a patched in_progress row and drop the overlay
    // while Active still has a stale open row (timer flash).
    const isActiveRail =
      Boolean(filters.assigneeUserId) &&
      Boolean(filters.statuses?.includes("open") || filters.statuses?.includes("in_progress")) &&
      !filters.statuses?.includes("done");
    if (!isActiveRail) return;
    pruneTasks(teamId, serverItems);
  }, [teamId, query.isSuccess, pruneTasks, serverItems, filters.assigneeUserId, filters.statuses]);

  return { ...query, items, total };
}

const TASK_CHOOSER_PAGE_SIZE = 100;

/** Loads every page for task picker UIs. ponytail: sequential fetches; upgrade path is a dedicated unpaginated endpoint. */
export function useAgencyProjectTasksForChooserQuery(
  teamId: string,
  filters: Omit<AgencyProjectTasksFilters, "page" | "pageSize"> = {},
) {
  const infiniteQuery = useAgencyProjectTasksInfiniteQuery(teamId, {
    ...filters,
    pageSize: TASK_CHOOSER_PAGE_SIZE,
  });

  useEffect(() => {
    if (!teamId || !infiniteQuery.hasNextPage || infiniteQuery.isFetchingNextPage) return;
    void infiniteQuery.fetchNextPage();
  }, [
    teamId,
    infiniteQuery.hasNextPage,
    infiniteQuery.isFetchingNextPage,
    infiniteQuery.fetchNextPage,
    infiniteQuery.data?.pages.length,
  ]);

  const isFetchingAll = infiniteQuery.isFetchingNextPage || Boolean(infiniteQuery.hasNextPage);

  return {
    ...infiniteQuery,
    items: infiniteQuery.items,
    total: infiniteQuery.total,
    isPending: infiniteQuery.isPending,
    isLoading: infiniteQuery.isPending,
    isFetchingAll,
  };
}

export type { AgencyPresenceMember } from "@/features/shared/agency-presence-members";
export { mergeAgencyPresenceMembers } from "@/features/shared/agency-presence-members";

export function useAgencyActiveMembersQuery(teamId: string) {
  return useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.timer.listActiveMembers.queryOptions({
          input: { teamId },
        }),
        enabled: Boolean(teamId),
        placeholderData: keepPreviousData,
      },
      "hot",
      { liveGated: true, teamId },
    ),
  );
}

export function useAgencyPresenceMembers(teamId: string) {
  const activeMembersQuery = useAgencyActiveMembersQuery(teamId);
  const activeTimerQuery = useAgencyActiveTimerQuery(teamId);
  const timerOverlay = useAgencyOptimisticStore((state) => state.activeTimers[teamId]);
  const session = authClient.useSession();
  const user = session.data?.user;

  const timer = useMemo(() => {
    if (timerOverlay !== undefined) {
      return timerOverlay;
    }
    return activeTimerQuery.data?.timer ?? null;
  }, [timerOverlay, activeTimerQuery.data?.timer]);

  const members = useMemo(
    () => mergeAgencyPresenceMembers(activeMembersQuery.data?.items ?? [], timer, teamId, user),
    [activeMembersQuery.data?.items, timer, teamId, user],
  );

  return {
    members,
    isPending: activeMembersQuery.isPending || activeTimerQuery.isPending,
  };
}

export function useAgencyActiveTimerQuery(teamId: string) {
  const registerActiveTimerQuery = useAgencyTimeTrackingStore((s) => s.registerActiveTimerQuery);
  const unregisterActiveTimerQuery = useAgencyTimeTrackingStore(
    (s) => s.unregisterActiveTimerQuery,
  );

  const queryKey = orpc.agencyOps.timer.getActive.queryOptions({
    input: { teamId: teamId || undefined },
  }).queryKey;

  const query = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.timer.getActive.queryOptions({
          input: { teamId: teamId || undefined },
        }),
        enabled: Boolean(teamId),
        placeholderData: keepPreviousData,
      },
      "hot",
      { liveGated: true, teamId },
    ),
  );

  useEffect(() => {
    if (!teamId) return;
    registerActiveTimerQuery({ teamId, queryKey });
    return () => unregisterActiveTimerQuery(queryKey);
  }, [teamId, queryKey, registerActiveTimerQuery, unregisterActiveTimerQuery]);

  return useMergedAgencyActiveTimerQuery(query, teamId);
}

export function useAgencyFavoritesQuery(teamId: string) {
  return useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.favorites.list.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId),
        placeholderData: keepPreviousData,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );
}

export function useAgencyProjectTemplatesQuery(teamId: string) {
  return useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.projectTemplates.list.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId),
        placeholderData: keepPreviousData,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );
}

export function useAgencyTimeEntriesQuery(teamId: string, page: number, pageSize: number) {
  const registerLogQuery = useAgencyTimeTrackingStore((s) => s.registerLogQuery);
  const unregisterLogQuery = useAgencyTimeTrackingStore((s) => s.unregisterLogQuery);
  const utcOffsetMinutes = new Date().getTimezoneOffset();
  const listMineInput = { teamId, page, pageSize, utcOffsetMinutes };

  const queryKey = orpc.agencyOps.timeEntries.listMine.queryOptions({
    input: listMineInput,
  }).queryKey;

  const query = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.timeEntries.listMine.queryOptions({
          input: listMineInput,
        }),
        enabled: Boolean(teamId),
        placeholderData: keepPreviousData,
      },
      "hot",
      { liveGated: true, teamId },
    ),
  );

  useEffect(() => {
    if (!teamId) return;
    registerLogQuery({ teamId, page, queryKey });
    return () => unregisterLogQuery(queryKey);
  }, [teamId, page, queryKey, registerLogQuery, unregisterLogQuery]);

  return useMergedAgencyTimeEntriesQuery(query, teamId);
}
