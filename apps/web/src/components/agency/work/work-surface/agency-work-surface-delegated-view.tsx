import { AlertTriangle, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AgencyWorkSurfacePaginationFooter } from "@/components/agency/work/work-surface/agency-work-surface-pagination-footer";
import { AgencyWorkSurfaceTaskTableRowView } from "@/components/agency/work/work-surface/agency-work-surface-task-table-row-view";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgencyTaskListViewModel } from "@/lib/agency/work/hooks/use-agency-task-list";
import type { AgencyProjectTask } from "@/lib/schemas/agency-work";
import { orpc } from "@/lib/orpc";
import { agencyMutedSectionHeaderClass } from "@/lib/utils/agency-ui";
import { withAgencySyncQueryOptions } from "@/lib/utils/agency-query-options";
import { groupDelegatedTasks, type DelegatedTaskGroupId } from "@/lib/utils/group-tasks-by-recency";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { cn } from "@/lib/utils";

type AgencyWorkSurfaceDelegatedViewProps = {
  view: Extract<AgencyTaskListViewModel, { status: "ready" }>;
};

export function AgencyWorkSurfaceDelegatedView({ view }: AgencyWorkSurfaceDelegatedViewProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<DelegatedTaskGroupId>>(
    () => new Set(),
  );

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

  function toggleSection(sectionId: DelegatedTaskGroupId) {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  if (queryError) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <AlertTriangle className="size-5 text-warning" aria-hidden />
        <p className="text-sm text-muted">
          {getErrorMessage(
            view.assignedTasksErrorMessage || doneDelegatedQuery.error,
            "Could not load delegated tasks.",
          )}
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            view.onRetryAssignedTasks();
            void doneDelegatedQuery.refetch();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <p className="shrink-0 border-b border-default px-4 py-2.5 text-sm text-muted">
        Tasks you have delegated to other team members.
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">No delegated tasks yet.</p>
        ) : (
          sections.map((section) => {
            const collapsed = collapsedSections.has(section.id);
            return (
              <section key={section.id}>
                <div className={agencyMutedSectionHeaderClass}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-semibold text-highlighted">{section.label}</span>
                    <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-semibold text-muted">
                      {section.tasks.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-highlighted"
                    onClick={() => toggleSection(section.id)}
                  >
                    {collapsed ? "Expand" : "Collapse"}
                    <ChevronUp
                      className={cn("size-3.5 transition-transform", collapsed && "rotate-180")}
                      aria-hidden
                    />
                  </button>
                </div>
                {!collapsed
                  ? section.tasks.map((task) => (
                      <AgencyWorkSurfaceTaskTableRowView
                        key={task.id}
                        task={task}
                        projects={view.projects}
                        teamId={view.teamId}
                        variant="delegated"
                        isRowPending={view.isRowPending(task.id)}
                        onSelect={(taskId) => view.onSelect(taskId)}
                      />
                    ))
                  : null}
              </section>
            );
          })
        )}
      </div>

      <AgencyWorkSurfacePaginationFooter
        rangeStart={totalLoaded === 0 ? 0 : 1}
        rangeEnd={totalLoaded}
        total={Math.max(view.assignedTasksTotal, totalLoaded)}
        previousDisabled
        nextDisabled={!view.hasMoreAssignedTasks}
        onNext={view.onFetchMoreAssignedTasks}
      />
    </div>
  );
}
