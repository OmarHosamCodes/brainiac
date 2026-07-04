import {
  AlertTriangle,
  ChevronDown,
  ListChecks,
  PanelLeftOpen,
} from "lucide-react";

import { AgencyTaskVirtualList } from "@/components/agency/work/task-list/agency-task-virtual-list";
import { AgencyTaskCreateInlineView } from "@/components/agency/work/task-list/agency-task-create-inline-view";
import { AgencyTaskRowView } from "@/components/agency/work/task-list/agency-task-row-view";
import { AgencyTaskRailSummary } from "@/components/agency/agency-task-rail-summary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgencyTaskListViewModel } from "@/lib/agency/work/hooks/use-agency-task-list";
import {
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTaskRailClass,
} from "@/lib/utils/agency-ui";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { cn } from "@/lib/utils";

type AgencyTaskListViewProps = {
  view: AgencyTaskListViewModel;
};

export function AgencyTaskListView({ view }: AgencyTaskListViewProps) {
  switch (view.status) {
    case "unsigned":
      return (
        <section className={agencyTaskRailClass}>
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <ListChecks className="size-6 text-muted" aria-hidden />
            <p className="mt-3 text-xs text-muted">Sign in to view your tasks.</p>
          </div>
        </section>
      );
    case "collapsed":
      return (
        <section className={cn(agencyTaskRailClass, "items-center gap-3 px-2 py-3")}>
          <button
            type="button"
            className={cn(
              "flex size-11 items-center justify-center rounded-xl border border-default bg-default text-muted transition-colors hover:bg-elevated hover:text-highlighted",
              agencyFocusRingClass,
              "motion-reduce:transition-none",
            )}
            aria-label="Expand task list"
            onClick={view.onExpand}
          >
            <PanelLeftOpen className="size-4" />
          </button>

          <div className="flex flex-col items-center gap-2" title="My tasks">
            <ListChecks className="size-4 text-muted" aria-hidden />
            <AgencyTaskRailSummary
              compact
              total={view.totalCount}
              done={view.doneCount}
              left={view.activeCount}
            />
          </div>
        </section>
      );
    case "ready":
      return (
        <section className={agencyTaskRailClass}>
          <AgencyTaskRailSummary
            total={view.totalCount}
            done={view.doneCount}
            left={view.activeCount}
            onCollapse={view.onCollapseRail}
          />

          {view.isLoading ? (
            <div className="min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto p-3">
              {[1, 2, 3].map((rowIndex) => (
                <div key={rowIndex} className="space-y-2">
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="ml-2 h-14 rounded-lg" />
                </div>
              ))}
            </div>
          ) : view.activeTasksQueryError ? (
            <div
              className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center"
              role="alert"
            >
              <AlertTriangle className="size-5 text-error" aria-hidden />
              <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load tasks.</p>
              <p className="mt-1 text-xs text-muted">
                {getErrorMessage(view.activeTasksErrorMessage, "Try refreshing.")}
              </p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={view.onRetryActiveTasks}>
                Retry
              </Button>
            </div>
          ) : view.activeTasksEmpty ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6 text-center">
              <ListChecks className="size-6 text-muted" aria-hidden />
              <p className="mt-3 text-xs text-muted">No tasks assigned to you.</p>
              <p className="mt-1 text-xs text-muted">Add one below to get started.</p>
            </div>
          ) : (
            <AgencyTaskVirtualList
              clientGroups={view.clientGroups}
              collapsedClients={view.collapsedClients}
              projects={view.projects}
              teamId={view.teamId}
              currentUserId={view.currentUserId}
              selectedTaskId={view.selectedTaskId}
              highlightTaskId={view.recentlyCreatedTaskId}
              isRowPending={view.isRowPending}
              onClientExpandedChange={view.onClientExpandedChange}
              onSelect={view.onSelect}
              onSelectProject={view.onSelectProject}
              onStatusChange={view.onStatusChange}
              hasMore={view.hasMoreActiveTasks}
              isFetchingMore={view.isFetchingMoreActiveTasks}
              onFetchMore={view.onFetchMoreActiveTasks}
            />
          )}

          <AgencyTaskCreateInlineView projects={view.projects} create={view.create} />

          <div className="shrink-0 border-t border-default">
            <button
              type="button"
              className={cn(
                "flex w-full items-center justify-between px-4 py-2 text-xs transition-colors hover:bg-default/60",
                agencyFocusRingClass,
                "motion-reduce:transition-none",
              )}
              aria-expanded={view.doneExpanded}
              aria-controls={view.donePanelId}
              onClick={() => view.onDoneExpandedChange(!view.doneExpanded)}
            >
              <span className="font-semibold text-muted">Done</span>
              <span className="flex items-center gap-1.5">
                <span className={cn(agencyMetricClass, "text-[11px] text-muted")}>
                  {view.doneCount === null ? "—" : view.doneCount}
                </span>
                <ChevronDown
                  className={cn(
                    "size-3.5 text-muted motion-safe:transition-transform motion-safe:duration-200",
                    view.doneExpanded && "rotate-180",
                  )}
                  aria-hidden
                />
              </span>
            </button>

            {view.doneExpanded ? (
              <div id={view.donePanelId}>
                {view.doneTasksLoading ? (
                  <div className="space-y-2 border-t border-default px-3 py-2">
                    {[1, 2].map((rowIndex) => (
                      <Skeleton key={rowIndex} className="h-12 rounded-lg" />
                    ))}
                  </div>
                ) : view.doneTasksQueryError ? (
                  <div className="border-t border-default px-4 py-3 text-center" role="alert">
                    <p className="text-xs text-muted">
                      {getErrorMessage(view.doneTasksErrorMessage, "Couldn't load done tasks.")}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={view.onRetryDoneTasks}
                    >
                      Retry
                    </Button>
                  </div>
                ) : view.doneTasks.length === 0 ? (
                  <div className="border-t border-default px-4 py-3 text-center">
                    <p className="text-xs text-muted">Nothing completed yet.</p>
                  </div>
                ) : (
                  <ul className="max-h-48 overflow-x-hidden overflow-y-auto border-t border-default" aria-label="Done tasks">
                    {view.doneTasks.map((task) => (
                      <AgencyTaskRowView
                        key={task.id}
                        task={task}
                        projects={view.projects}
                        teamId={view.teamId}
                        selectedTaskId={view.selectedTaskId}
                        highlight={view.recentlyCompletedTaskId === task.id}
                        readOnly
                        isRowPending={
                          view.isRowPending(task.id) || view.create.isCreatingTask
                        }
                        onSelect={view.onSelect}
                        onSelectProject={view.onSelectProject}
                        onReopenToActive={view.onReopenDoneTask}
                      />
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        </section>
      );
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}
