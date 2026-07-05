import type { QueryKey } from "@tanstack/react-query";

import { getQueryClient } from "@/lib/query-client";
import { orpc } from "@/lib/orpc";
import { withAgencySyncQueryOptions } from "@/lib/utils/agency-query-options";

type OrpcQueryMeta = {
  input?: Record<string, unknown>;
  type?: string;
};

type AgencyProjectTask = {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  taskKind: "standard" | "journey_anchor" | "journey_milestone";
  assignedToTeam: boolean;
  assignees: Array<{
    userId: string;
    userName: string;
    userAvatar: string | null;
    status: "open" | "in_progress" | "done";
  }>;
  viewerStatus?: "open" | "in_progress" | "done";
  viewerCompletionCount?: number;
  viewerBlueprints?: Array<{ id: string; description: string }>;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type AgencyProjectTasksListQueryData = {
  items: AgencyProjectTask[];
  page?: number;
  pageSize?: number;
  total?: number;
};

type AgencyProjectTasksInfiniteQueryData = {
  pages: AgencyProjectTasksListQueryData[];
  pageParams?: unknown[];
};

type AgencyProjectTasksCacheData =
  | AgencyProjectTasksListQueryData
  | AgencyProjectTasksInfiniteQueryData;

type ProjectTasksListInput = {
  teamId: string;
  projectId?: string;
  assigneeUserId?: string;
  statuses?: AgencyProjectTask["status"][];
};

function isListQueryData(data: unknown): data is AgencyProjectTasksListQueryData {
  return (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as AgencyProjectTasksListQueryData).items)
  );
}

function isInfiniteQueryData(data: unknown): data is AgencyProjectTasksInfiniteQueryData {
  return (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as AgencyProjectTasksInfiniteQueryData).pages)
  );
}

function pageItems(page: AgencyProjectTasksListQueryData): AgencyProjectTask[] {
  return Array.isArray(page.items) ? page.items : [];
}

function transformTasksCacheData(
  current: unknown,
  transform: {
    list: (data: AgencyProjectTasksListQueryData) => AgencyProjectTasksListQueryData;
    infinite: (pages: AgencyProjectTasksListQueryData[]) => AgencyProjectTasksListQueryData[];
  },
  options?: { createIfEmpty?: boolean },
): AgencyProjectTasksCacheData | undefined {
  if (current == null) {
    if (options?.createIfEmpty === false) return undefined;
    return transform.list({ items: [] });
  }
  if (isInfiniteQueryData(current)) {
    const pages =
      current.pages.length > 0
        ? current.pages.map((page) => ({ ...page, items: pageItems(page) }))
        : [{ items: [] as AgencyProjectTask[] }];
    return { ...current, pages: transform.infinite(pages) };
  }
  if (isListQueryData(current)) {
    return transform.list(current);
  }
  // Unknown shape (e.g. partial cache) — leave untouched.
  return current as AgencyProjectTasksCacheData;
}

function pathsEqual(path: string[], expected: string[]) {
  return (
    path.length === expected.length && path.every((segment, index) => segment === expected[index])
  );
}

function getOrpcQueryMeta(queryKey: QueryKey): OrpcQueryMeta | undefined {
  return queryKey[1] as OrpcQueryMeta | undefined;
}

function getOrpcQueryPath(queryKey: QueryKey): string[] {
  const path = queryKey[0];
  return Array.isArray(path) ? path.map(String) : [];
}

function isAgencyOpsPath(path: string[], ...segments: string[]) {
  return pathsEqual(path, segments);
}

export function isAgencyProjectTasksListQueryKey(queryKey: QueryKey, teamId: string) {
  const path = getOrpcQueryPath(queryKey);
  if (!isAgencyOpsPath(path, "agencyOps", "projectTasks", "list")) return false;
  return getOrpcQueryMeta(queryKey)?.input?.teamId === teamId;
}

export function isAgencyProjectsListQueryKey(queryKey: QueryKey, teamId: string) {
  const path = getOrpcQueryPath(queryKey);
  if (!isAgencyOpsPath(path, "agencyOps", "projects", "list")) return false;
  return getOrpcQueryMeta(queryKey)?.input?.teamId === teamId;
}

export function isAgencyProjectJourneyQueryKey(
  queryKey: QueryKey,
  teamId: string,
  projectId?: string,
) {
  const path = getOrpcQueryPath(queryKey);
  if (!isAgencyOpsPath(path, "agencyOps", "projects", "journey", "get")) return false;
  const input = getOrpcQueryMeta(queryKey)?.input;
  if (input?.teamId !== teamId) return false;
  if (projectId && input?.projectId !== projectId) return false;
  return true;
}

export function isAgencyActiveTimerQueryKey(queryKey: QueryKey, teamId: string) {
  const path = getOrpcQueryPath(queryKey);
  if (!isAgencyOpsPath(path, "agencyOps", "timer", "getActive")) return false;
  const input = getOrpcQueryMeta(queryKey)?.input;
  return input?.teamId === teamId || input?.teamId === undefined;
}

export function isAgencyActiveMembersQueryKey(queryKey: QueryKey, teamId: string) {
  const path = getOrpcQueryPath(queryKey);
  if (!isAgencyOpsPath(path, "agencyOps", "timer", "listActiveMembers")) return false;
  return getOrpcQueryMeta(queryKey)?.input?.teamId === teamId;
}

export function isAgencyTimeEntriesListQueryKey(queryKey: QueryKey, teamId: string) {
  const path = getOrpcQueryPath(queryKey);
  if (!isAgencyOpsPath(path, "agencyOps", "timeEntries", "listMine")) return false;
  return getOrpcQueryMeta(queryKey)?.input?.teamId === teamId;
}

export function taskVisibleToAssignee(
  task: Pick<AgencyProjectTask, "assignedToTeam" | "assignees">,
  assigneeUserId: string,
): boolean {
  if (task.assignedToTeam) return true;
  return task.assignees.some((assignee) => assignee.userId === assigneeUserId);
}

export function taskMatchesAnyAssigneeFilter(
  task: Pick<AgencyProjectTask, "assignedToTeam" | "assignees">,
  assigneeUserIds: Iterable<string>,
): boolean {
  for (const assigneeUserId of assigneeUserIds) {
    if (taskVisibleToAssignee(task, assigneeUserId)) return true;
  }
  return false;
}

function isDoneCompletionQuery(input: Record<string, unknown> | undefined) {
  if (!input || typeof input.assigneeUserId !== "string") return false;
  const statuses = input.statuses;
  if (!Array.isArray(statuses) || statuses.length === 0) return false;
  const wantsDone = statuses.includes("done");
  const wantsActive = statuses.includes("open") || statuses.includes("in_progress");
  return wantsDone && !wantsActive;
}

function taskListContribution(
  task: AgencyProjectTask,
  input: Record<string, unknown> | undefined,
): number {
  if (isDoneCompletionQuery(input)) return task.viewerCompletionCount ?? 0;
  return 1;
}

export function taskMatchesQueryInput(
  task: AgencyProjectTask,
  input: Record<string, unknown> | undefined,
) {
  if (!input) return true;
  if (typeof input.projectId === "string" && input.projectId !== task.projectId) return false;
  if (
    typeof input.assigneeUserId === "string" &&
    !taskVisibleToAssignee(task, input.assigneeUserId)
  ) {
    return false;
  }
  const statuses = input.statuses;
  if (Array.isArray(statuses) && statuses.length > 0) {
    if (isDoneCompletionQuery(input)) {
      if ((task.viewerCompletionCount ?? 0) <= 0) return false;
    } else {
      const effectiveStatus =
        typeof input.assigneeUserId === "string"
          ? (task.viewerStatus ??
            (task.status === "archived" ? "done" : task.status === "done" ? "done" : task.status))
          : task.status;
      if (!statuses.includes(effectiveStatus)) return false;
    }
  }
  if (
    task.status === "archived" &&
    (!Array.isArray(statuses) || statuses.length === 0 || !statuses.includes("archived"))
  ) {
    return false;
  }
  return true;
}

export function forEachAgencyProjectTasksListQuery(
  teamId: string,
  apply: (queryKey: QueryKey, input: Record<string, unknown> | undefined) => void,
) {
  const queryClient = getQueryClient();
  for (const query of queryClient.getQueryCache().findAll()) {
    if (!isAgencyProjectTasksListQueryKey(query.queryKey, teamId)) continue;
    apply(query.queryKey, getOrpcQueryMeta(query.queryKey)?.input);
  }
}

export async function cancelAgencyProjectTaskListQueries(teamId: string) {
  const queryClient = getQueryClient();
  await queryClient.cancelQueries({
    predicate: (query) => isAgencyProjectTasksListQueryKey(query.queryKey, teamId),
  });
}

export function findProjectTaskInCache(teamId: string, taskId: string): AgencyProjectTask | null {
  const queryClient = getQueryClient();

  for (const query of queryClient.getQueryCache().findAll()) {
    if (!isAgencyProjectTasksListQueryKey(query.queryKey, teamId)) continue;
    const data = queryClient.getQueryData(query.queryKey);
    if (isListQueryData(data)) {
      const task = data.items.find((item) => item.id === taskId);
      if (task) return task;
      continue;
    }
    if (isInfiniteQueryData(data)) {
      for (const page of data.pages) {
        const task = pageItems(page).find((item) => item.id === taskId);
        if (task) return task;
      }
    }
  }

  return null;
}

function normalizeTitleKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findProjectTaskInCacheByTitle(
  teamId: string,
  projectId: string,
  title: string,
): AgencyProjectTask | null {
  const titleKey = normalizeTitleKey(title);
  if (!titleKey) return null;

  const queryClient = getQueryClient();
  for (const query of queryClient.getQueryCache().findAll()) {
    if (!isAgencyProjectTasksListQueryKey(query.queryKey, teamId)) continue;
    const data = queryClient.getQueryData(query.queryKey);
    const pages = isInfiniteQueryData(data)
      ? data.pages
      : isListQueryData(data)
        ? [data]
        : [];
    for (const page of pages) {
      const task = pageItems(page).find(
        (item) =>
          item.projectId === projectId && normalizeTitleKey(item.title) === titleKey,
      );
      if (task) return task;
    }
  }

  return null;
}

export async function refetchAgencyProjectTaskListQueries(teamId: string, _assigneeUserId?: string) {
  const queryClient = getQueryClient();
  // Refetch in place (list + infinite). Do not invalidate: that drops infinite
  // pages and flashes the rail empty until the refetch finishes.
  await queryClient.refetchQueries({
    predicate: (query) => isAgencyProjectTasksListQueryKey(query.queryKey, teamId),
    type: "active",
  });
}

export async function refetchAgencyProjectJourneyQueries(teamId: string, projectId: string) {
  const queryClient = getQueryClient();
  await queryClient.refetchQueries({
    predicate: (query) => isAgencyProjectJourneyQueryKey(query.queryKey, teamId, projectId),
    type: "active",
  });
}

function isInfiniteProjectTasksQueryKey(queryKey: QueryKey) {
  return queryKey[queryKey.length - 1] === "infinite";
}

export function patchAllProjectTasksListData(
  teamId: string,
  apply: (
    current: AgencyProjectTasksCacheData | undefined,
    input: Record<string, unknown> | undefined,
  ) => AgencyProjectTasksCacheData | undefined,
) {
  const queryClient = getQueryClient();
  forEachAgencyProjectTasksListQuery(teamId, (queryKey, input) => {
    queryClient.setQueryData<AgencyProjectTasksCacheData | undefined>(queryKey, (current) => {
      // Infinite lists must keep { pages } shape; seeding a list shape breaks the rail.
      const seeded =
        current == null && isInfiniteProjectTasksQueryKey(queryKey)
          ? { pages: [{ items: [] as AgencyProjectTask[], total: 0, page: 1, pageSize: 50 }], pageParams: [1] }
          : current;
      return apply(seeded, input);
    });
  });
}

function insertTaskIntoPage(
  page: AgencyProjectTasksListQueryData,
  task: AgencyProjectTask,
): AgencyProjectTasksListQueryData {
  const items = pageItems(page);
  if (items.some((item) => item.id === task.id)) {
    return {
      ...page,
      items: items.map((item) => (item.id === task.id ? task : item)),
    };
  }
  return {
    ...page,
    items: [task, ...items],
    total: typeof page.total === "number" ? page.total + 1 : page.total,
  };
}

export function patchInsertedProjectTaskInCache(teamId: string, task: AgencyProjectTask) {
  patchAllProjectTasksListData(teamId, (current, input) => {
    if (!taskMatchesQueryInput(task, input)) return current;
    return transformTasksCacheData(current, {
      list: (data) => insertTaskIntoPage(data, task),
      infinite: (pages) => {
        const existingPageIndex = pages.findIndex((page) =>
          page.items.some((item) => item.id === task.id),
        );
        if (existingPageIndex !== -1) {
          return pages.map((page, index) =>
            index === existingPageIndex ? insertTaskIntoPage(page, task) : page,
          );
        }
        return pages.map((page, index) => (index === 0 ? insertTaskIntoPage(page, task) : page));
      },
    });
  });
}

function updateTaskInPage(
  page: AgencyProjectTasksListQueryData,
  task: AgencyProjectTask,
  matches: boolean,
  allowInsert: boolean,
  input: Record<string, unknown> | undefined,
): AgencyProjectTasksListQueryData {
  const items = pageItems(page);
  const index = items.findIndex((item) => item.id === task.id);
  const previousContribution = index === -1 ? 0 : taskListContribution(items[index]!, input);
  const nextContribution = matches ? taskListContribution(task, input) : 0;
  const totalDelta = nextContribution - previousContribution;
  const nextTotal =
    typeof page.total === "number" ? Math.max(0, page.total + totalDelta) : page.total;

  if (matches) {
    if (index === -1) {
      if (!allowInsert) return page;
      return { ...page, items: [task, ...items], total: nextTotal };
    }
    return {
      ...page,
      items: items.map((item) => (item.id === task.id ? task : item)),
      total: nextTotal,
    };
  }

  if (index !== -1) {
    return {
      ...page,
      items: items.filter((item) => item.id !== task.id),
      total: nextTotal,
    };
  }

  return page;
}

export function patchUpdatedProjectTaskInCache(teamId: string, task: AgencyProjectTask) {
  patchAllProjectTasksListData(teamId, (current, input) => {
    const matches = taskMatchesQueryInput(task, input);
    return transformTasksCacheData(current, {
      list: (data) => updateTaskInPage(data, task, matches, true, input),
      infinite: (pages) => {
        const hasTask = pages.some((page) => page.items.some((item) => item.id === task.id));
        return pages.map((page, index) =>
          updateTaskInPage(page, task, matches, !hasTask && index === 0, input),
        );
      },
    });
  });
}

export function patchProjectTaskBlueprintDescriptionInCache(
  teamId: string,
  taskId: string,
  blueprintId: string,
  description: string,
) {
  patchAllProjectTasksListData(teamId, (current) =>
    transformTasksCacheData(current, {
      list: (data) => ({
        ...data,
        items: pageItems(data).map((task) =>
          task.id !== taskId
            ? task
            : {
                ...task,
                viewerBlueprints: (task.viewerBlueprints ?? []).map((blueprint) =>
                  blueprint.id === blueprintId ? { ...blueprint, description } : blueprint,
                ),
              },
        ),
      }),
      infinite: (pages) =>
        pages.map((page) => ({
          ...page,
          items: page.items.map((task) =>
            task.id !== taskId
              ? task
              : {
                  ...task,
                  viewerBlueprints: (task.viewerBlueprints ?? []).map((blueprint) =>
                    blueprint.id === blueprintId ? { ...blueprint, description } : blueprint,
                  ),
                },
          ),
        })),
    }),
  );
}

export function patchDeletedProjectTaskInCache(teamId: string, taskId: string) {
  patchAllProjectTasksListData(teamId, (current) =>
    transformTasksCacheData(
      current,
      {
        list: (data) => ({
          ...data,
          items: pageItems(data).filter((task) => task.id !== taskId),
        }),
        infinite: (pages) =>
          pages.map((page) => ({
            ...page,
            items: page.items.filter((task) => task.id !== taskId),
          })),
      },
      { createIfEmpty: false },
    ),
  );
}

function reconcileCreatedTaskInPage(
  page: AgencyProjectTasksListQueryData,
  optimisticIdValue: string,
  created: AgencyProjectTask,
  matches: boolean,
  allowInsert: boolean,
): AgencyProjectTasksListQueryData {
  const items = pageItems(page);
  const hadOptimistic = items.some((task) => task.id === optimisticIdValue);
  const withoutOptimistic = items.filter((task) => task.id !== optimisticIdValue);
  const existingIndex = withoutOptimistic.findIndex((task) => task.id === created.id);

  if (existingIndex !== -1) {
    return {
      ...page,
      items: withoutOptimistic.map((task) => (task.id === created.id ? created : task)),
      total:
        typeof page.total === "number" && hadOptimistic
          ? Math.max(0, page.total - 1)
          : page.total,
    };
  }

  if (!matches) {
    return {
      ...page,
      items: withoutOptimistic,
      total:
        typeof page.total === "number" && hadOptimistic
          ? Math.max(0, page.total - 1)
          : page.total,
    };
  }

  if (hadOptimistic) {
    return {
      ...page,
      items: items.map((task) => (task.id === optimisticIdValue ? created : task)),
    };
  }

  if (!allowInsert) return page;

  return {
    ...page,
    items: [created, ...items],
    total: typeof page.total === "number" ? page.total + 1 : page.total,
  };
}

export function reconcileCreatedProjectTaskInCache(
  teamId: string,
  optimisticIdValue: string,
  created: AgencyProjectTask,
) {
  patchAllProjectTasksListData(teamId, (current, input) => {
    const matches = taskMatchesQueryInput(created, input);
    return transformTasksCacheData(current, {
      list: (data) => reconcileCreatedTaskInPage(data, optimisticIdValue, created, matches, true),
      infinite: (pages) => {
        const hasCreated = pages.some((page) =>
          page.items.some(
            (task) => task.id === created.id || task.id === optimisticIdValue,
          ),
        );
        return pages.map((page, index) =>
          reconcileCreatedTaskInPage(
            page,
            optimisticIdValue,
            created,
            matches,
            !hasCreated && index === 0,
          ),
        );
      },
    });
  });
}

export async function refetchAgencyProjectsListQueries(teamId: string) {
  const queryClient = getQueryClient();
  await queryClient.invalidateQueries({
    predicate: (query) => isAgencyProjectsListQueryKey(query.queryKey, teamId),
  });
  await queryClient.refetchQueries({
    predicate: (query) => isAgencyProjectsListQueryKey(query.queryKey, teamId),
    type: "active",
  });
}

export async function refetchAgencyActiveTimerQueries(teamId: string) {
  const queryClient = getQueryClient();
  await queryClient.invalidateQueries({
    predicate: (query) =>
      isAgencyActiveTimerQueryKey(query.queryKey, teamId) ||
      isAgencyActiveMembersQueryKey(query.queryKey, teamId),
  });
  await queryClient.fetchQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.timer.getActive.queryOptions({ input: { teamId } }),
      },
      "hot",
    ),
  );
  await queryClient.fetchQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.timer.listActiveMembers.queryOptions({ input: { teamId } }),
      },
      "hot",
    ),
  );
}

export async function refetchAgencyTimeEntriesListQueries(teamId: string) {
  const queryClient = getQueryClient();
  await queryClient.invalidateQueries({
    predicate: (query) => isAgencyTimeEntriesListQueryKey(query.queryKey, teamId),
  });
  await queryClient.fetchQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.timeEntries.listMine.queryOptions({
          input: { teamId, page: 1, pageSize: 20 },
        }),
      },
      "hot",
    ),
  );
  await queryClient.refetchQueries({
    predicate: (query) => isAgencyTimeEntriesListQueryKey(query.queryKey, teamId),
    type: "active",
  });
}

type AgencyActiveTimerQueryData = {
  timer: Record<string, unknown> | null;
};

type AgencyActiveMemberItem = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  projectName: string;
  description: string;
  startedAt: string;
};

type AgencyActiveMembersQueryData = {
  items: AgencyActiveMemberItem[];
};

function applyActiveMembersCachePatch(
  current: AgencyActiveMembersQueryData | undefined,
  teamId: string,
  timer: Record<string, unknown> | null,
  removedUserId?: string,
): AgencyActiveMembersQueryData {
  const items = current?.items ?? [];

  if (timer && timer.teamId === teamId && typeof timer.userId === "string") {
    const userId = timer.userId;
    const existing = items.find((item) => item.userId === userId);
    const nextMember: AgencyActiveMemberItem = {
      userId,
      userName: existing?.userName ?? "Member",
      userAvatar: existing?.userAvatar ?? null,
      projectName: String(timer.projectName ?? ""),
      description: String(timer.description ?? ""),
      startedAt: String(timer.startedAt ?? new Date().toISOString()),
    };
    const without = items.filter((item) => item.userId !== userId);
    return {
      items: [...without, nextMember].sort((left, right) =>
        left.userName.localeCompare(right.userName),
      ),
    };
  }

  if (!removedUserId) {
    return current ?? { items: [] };
  }

  const nextItems = items.filter((item) => item.userId !== removedUserId);
  if (nextItems.length === items.length) {
    return current ?? { items: [] };
  }

  return { items: nextItems };
}

function patchActiveMembersInCache(
  teamId: string,
  timer: Record<string, unknown> | null,
  removedUserId?: string,
) {
  const queryClient = getQueryClient();
  const patch = (current: AgencyActiveMembersQueryData | undefined) =>
    applyActiveMembersCachePatch(current, teamId, timer, removedUserId);

  const canonicalKey = orpc.agencyOps.timer.listActiveMembers.queryOptions({
    input: { teamId },
  }).queryKey;

  queryClient.setQueryData<AgencyActiveMembersQueryData | undefined>(canonicalKey, patch);

  for (const query of queryClient.getQueryCache().findAll()) {
    if (query.queryKey === canonicalKey) continue;
    if (!isAgencyActiveMembersQueryKey(query.queryKey, teamId)) continue;
    queryClient.setQueryData<AgencyActiveMembersQueryData | undefined>(query.queryKey, patch);
  }
}

export function patchActiveTimerInCache(teamId: string, timer: Record<string, unknown> | null) {
  const queryClient = getQueryClient();
  let removedUserId: string | undefined;

  if (!timer) {
    for (const query of queryClient.getQueryCache().findAll()) {
      if (!isAgencyActiveTimerQueryKey(query.queryKey, teamId)) continue;
      const cached = queryClient.getQueryData<AgencyActiveTimerQueryData>(query.queryKey);
      const cachedUserId = cached?.timer?.userId;
      if (typeof cachedUserId === "string") {
        removedUserId = cachedUserId;
      }
    }
  }

  for (const query of queryClient.getQueryCache().findAll()) {
    if (!isAgencyActiveTimerQueryKey(query.queryKey, teamId)) continue;
    queryClient.setQueryData<AgencyActiveTimerQueryData | undefined>(query.queryKey, (current) => ({
      ...(current ?? { timer: null }),
      timer: timer && timer.teamId === teamId ? timer : null,
    }));
  }

  patchActiveMembersInCache(teamId, timer, removedUserId);
}
