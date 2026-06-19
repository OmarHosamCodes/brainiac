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
  assigneeUserId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type AgencyProjectTasksListQueryData = {
  items: AgencyProjectTask[];
};

type ProjectTasksListInput = {
  teamId: string;
  projectId?: string;
  assigneeUserId?: string;
  statuses?: AgencyProjectTask["status"][];
};

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

export function isAgencyActiveTimerQueryKey(queryKey: QueryKey, teamId: string) {
  const path = getOrpcQueryPath(queryKey);
  if (!isAgencyOpsPath(path, "agencyOps", "timer", "getActive")) return false;
  const input = getOrpcQueryMeta(queryKey)?.input;
  return input?.teamId === teamId || input?.teamId === undefined;
}

export function isAgencyTimeEntriesListQueryKey(queryKey: QueryKey, teamId: string) {
  const path = getOrpcQueryPath(queryKey);
  if (!isAgencyOpsPath(path, "agencyOps", "timeEntries", "listMine")) return false;
  return getOrpcQueryMeta(queryKey)?.input?.teamId === teamId;
}

export function taskMatchesQueryInput(
  task: AgencyProjectTask,
  input: Record<string, unknown> | undefined,
) {
  if (!input) return true;
  if (typeof input.projectId === "string" && input.projectId !== task.projectId) return false;
  if (typeof input.assigneeUserId === "string" && input.assigneeUserId !== task.assigneeUserId) {
    return false;
  }
  const statuses = input.statuses;
  if (Array.isArray(statuses) && statuses.length > 0 && !statuses.includes(task.status)) {
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
    const data = queryClient.getQueryData<AgencyProjectTasksListQueryData>(query.queryKey);
    const task = data?.items.find((item) => item.id === taskId);
    if (task) return task;
  }

  return null;
}

export async function refetchAgencyProjectTaskListQueries(teamId: string, assigneeUserId?: string) {
  const queryClient = getQueryClient();

  await queryClient.invalidateQueries({
    predicate: (query) => isAgencyProjectTasksListQueryKey(query.queryKey, teamId),
  });

  const inputs: ProjectTasksListInput[] = [
    { teamId, statuses: ["open", "in_progress"] },
    { teamId, statuses: ["done"] },
  ];

  if (assigneeUserId) {
    inputs.push(
      { teamId, assigneeUserId, statuses: ["open", "in_progress"] },
      { teamId, assigneeUserId, statuses: ["done"] },
    );
  }

  await Promise.all(
    inputs.map((input) =>
      queryClient.fetchQuery(
        withAgencySyncQueryOptions(
          {
            ...orpc.agencyOps.projectTasks.list.queryOptions({ input }),
          },
          "hot",
        ),
      ),
    ),
  );
}

export function patchAllProjectTasksListData(
  teamId: string,
  apply: (
    current: AgencyProjectTasksListQueryData | undefined,
    input: Record<string, unknown> | undefined,
  ) => AgencyProjectTasksListQueryData | undefined,
) {
  const queryClient = getQueryClient();
  forEachAgencyProjectTasksListQuery(teamId, (queryKey, input) => {
    queryClient.setQueryData<AgencyProjectTasksListQueryData | undefined>(queryKey, (current) =>
      apply(current, input),
    );
  });
}

export function patchInsertedProjectTaskInCache(teamId: string, task: AgencyProjectTask) {
  patchAllProjectTasksListData(teamId, (current, input) => {
    if (!taskMatchesQueryInput(task, input)) return current;
    const base = current ?? { items: [] };
    const exists = base.items.some((item) => item.id === task.id);
    if (exists) {
      return {
        ...base,
        items: base.items.map((item) => (item.id === task.id ? task : item)),
      };
    }
    return { ...base, items: [task, ...base.items] };
  });
}

export function patchUpdatedProjectTaskInCache(teamId: string, task: AgencyProjectTask) {
  patchAllProjectTasksListData(teamId, (current, input) => {
    const base = current ?? { items: [] };
    const index = base.items.findIndex((item) => item.id === task.id);
    const matches = taskMatchesQueryInput(task, input);

    if (matches) {
      if (index === -1) {
        return { ...base, items: [task, ...base.items] };
      }
      return {
        ...base,
        items: base.items.map((item) => (item.id === task.id ? task : item)),
      };
    }

    if (index !== -1) {
      return { ...base, items: base.items.filter((item) => item.id !== task.id) };
    }

    return base;
  });
}

export function patchDeletedProjectTaskInCache(teamId: string, taskId: string) {
  patchAllProjectTasksListData(teamId, (current) => {
    if (!current) return current;
    return { ...current, items: current.items.filter((task) => task.id !== taskId) };
  });
}

export function reconcileCreatedProjectTaskInCache(
  teamId: string,
  optimisticIdValue: string,
  created: AgencyProjectTask,
) {
  patchAllProjectTasksListData(teamId, (current, input) => {
    const base = current ?? { items: [] };
    const hasOptimistic = base.items.some((task) => task.id === optimisticIdValue);
    if (hasOptimistic) {
      return {
        ...base,
        items: base.items.map((task) => (task.id === optimisticIdValue ? created : task)),
      };
    }
    if (!taskMatchesQueryInput(created, input)) {
      return base;
    }
    if (base.items.some((task) => task.id === created.id)) {
      return {
        ...base,
        items: base.items.map((task) => (task.id === created.id ? created : task)),
      };
    }
    return { ...base, items: [created, ...base.items] };
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
    predicate: (query) => isAgencyActiveTimerQueryKey(query.queryKey, teamId),
  });
  await queryClient.fetchQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.timer.getActive.queryOptions({ input: { teamId } }),
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

export function patchActiveTimerInCache(teamId: string, timer: Record<string, unknown> | null) {
  const queryClient = getQueryClient();

  for (const query of queryClient.getQueryCache().findAll()) {
    if (!isAgencyActiveTimerQueryKey(query.queryKey, teamId)) continue;
    queryClient.setQueryData<AgencyActiveTimerQueryData | undefined>(query.queryKey, (current) => ({
      ...(current ?? { timer: null }),
      timer: timer && timer.teamId === teamId ? timer : null,
    }));
  }
}
