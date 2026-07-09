import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { orpc } from "@/lib/orpc";
import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";
import { groupDelegatedTasks } from "@/features/task-management/group-tasks-by-recency";
import type { AgencyTaskListViewModel } from "@/features/task-management/hooks/use-agency-task-list";
import type { AgencyProjectTask } from "@/features/task-management/agency-work";

export type AgencyWorkSurfaceDelegatedViewModel = {
  delegatedTasks: AgencyProjectTask[];
  sections: ReturnType<typeof groupDelegatedTasks>;
  totalLoaded: number;
  loading: boolean;
  queryError: boolean;
  error: unknown;
  retry: () => void;
};

type UseAgencyWorkSurfaceDelegatedOptions = {
  view: Extract<AgencyTaskListViewModel, { status: "ready" }>;
};

export function useAgencyWorkSurfaceDelegated({
  view,
}: UseAgencyWorkSurfaceDelegatedOptions): AgencyWorkSurfaceDelegatedViewModel {
  const doneDelegatedQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.projectTasks.list.queryOptions({
          input: {
            teamId: view.teamId,
            delegatedByUserId: view.currentUserId,
            statuses: ["done"],
            pageSize: 50,
          },
        }),
        enabled: Boolean(view.teamId && view.currentUserId),
      },
      "warm",
      { liveGated: true, teamId: view.teamId },
    ),
  );

  const delegatedTasks = useMemo(() => {
    const active: AgencyProjectTask[] = [];
    const seen = new Set<string>();

    for (const group of view.assignedClientGroups) {
      for (const projectGroup of group.projectGroups) {
        for (const row of projectGroup.standaloneRows) {
          if (seen.has(row.task.id)) continue;
          seen.add(row.task.id);
          active.push(row.task);
        }
        if (projectGroup.journeyCluster) {
          const anchor = projectGroup.journeyCluster.anchorRow.task;
          if (!seen.has(anchor.id)) {
            seen.add(anchor.id);
            active.push(anchor);
          }
          for (const milestone of projectGroup.journeyCluster.milestoneRows) {
            if (seen.has(milestone.task.id)) continue;
            seen.add(milestone.task.id);
            active.push(milestone.task);
          }
        }
      }
    }

    const completed = doneDelegatedQuery.data?.items ?? [];
    return [...active, ...completed.filter((task) => !seen.has(task.id))];
  }, [doneDelegatedQuery.data?.items, view.assignedClientGroups]);

  const sections = useMemo(() => groupDelegatedTasks(delegatedTasks), [delegatedTasks]);
  const totalLoaded = delegatedTasks.length;

  const loading =
    view.assignedTasksLoading || (doneDelegatedQuery.isPending && delegatedTasks.length === 0);
  const queryError = view.assignedTasksQueryError || doneDelegatedQuery.isError;
  const error = view.assignedTasksErrorMessage || doneDelegatedQuery.error;

  function retry() {
    view.onRetryAssignedTasks();
    void doneDelegatedQuery.refetch();
  }

  return {
    delegatedTasks,
    sections,
    totalLoaded,
    loading,
    queryError,
    error,
    retry,
  };
}
