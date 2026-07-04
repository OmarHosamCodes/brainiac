import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ListChecks,
  Loader2,
  PanelLeftOpen,
} from "lucide-react";

import { AgencyTaskVirtualList } from "@/components/agency/work/task-list/agency-task-virtual-list";
import { AgencyTaskCreateInlineView } from "@/components/agency/work/task-list/agency-task-create-inline-view";
import { AgencyTaskRowView } from "@/components/agency/work/task-list/agency-task-row-view";
import { AgencyTaskRailSummary } from "@/components/agency/agency-task-rail-summary";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgencyTaskListViewModel } from "@/lib/agency/work/hooks/use-agency-task-list";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import type { AgencyProjectTask } from "@/lib/schemas/agency-work";
import {
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTaskRailClass,
} from "@/lib/utils/agency-ui";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { cn } from "@/lib/utils";
import { useAgencyOpsStore } from "@/stores/agency-ops";

type AgencyTaskListViewProps = {
  view: AgencyTaskListViewModel;
};

function AgencyTaskRailLiquidDone({ donePct }: { donePct: number }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [fillPct, setFillPct] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setFillPct(donePct);
      return;
    }

    // Double rAF so the browser paints height 0% before easing upward.
    let frame2 = 0;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        setFillPct(donePct);
      });
    });
    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, [donePct, prefersReducedMotion]);

  const heightPct = prefersReducedMotion ? donePct : fillPct;
  if (donePct <= 0 && heightPct <= 0) return null;

  return (
    <div
      className="agency-task-rail-liquid__done absolute bottom-0 left-0 right-0 top-auto"
      style={{ height: `${heightPct}%` }}
    >
      <div className="agency-task-rail-liquid__shine" />
    </div>
  );
}

function AgencyTaskDeleteDialog({
  task,
  teamId,
  deleting,
  onDismiss,
  onConfirm,
}: {
  task: AgencyProjectTask | null;
  teamId: string;
  deleting: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={task !== null} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete task</DialogTitle>
          <DialogDescription>
            {task
              ? `This removes "${task.title}" for everyone on the project. This cannot be undone.`
              : "This removes the task for everyone on the project. This cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onDismiss} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={deleting || !task || !teamId} onClick={onConfirm}>
            {deleting ? <Loader2 className="size-4 motion-safe:animate-spin" /> : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type AgencyTaskListReadyViewProps = {
  view: Extract<AgencyTaskListViewModel, { status: "ready" }>;
};

function AgencyTaskListReadyView({ view }: AgencyTaskListReadyViewProps) {
  const agencyOps = useAgencyOpsStore();
  const deletingTaskIds = useAgencyOpsStore((state) => state.deletingTaskIds);
  const [deleteTarget, setDeleteTarget] = useState<AgencyProjectTask | null>(null);

  const deleting =
    deleteTarget !== null && deletingTaskIds.includes(deleteTarget.id);

  async function confirmDelete() {
    if (!deleteTarget) return;
    await agencyOps.deleteProjectTask({
      teamId: view.teamId,
      taskId: deleteTarget.id,
      taskTitle: deleteTarget.title,
    });
    setDeleteTarget(null);
  }

  return (
    <>
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
            isRowPending={(taskId) =>
              view.isRowPending(taskId) || deletingTaskIds.includes(taskId)
            }
            onClientExpandedChange={view.onClientExpandedChange}
            onSelect={view.onSelect}
            onSelectProject={view.onSelectProject}
            onStatusChange={view.onStatusChange}
            onDelete={setDeleteTarget}
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
                <ul
                  className="max-h-48 overflow-x-hidden overflow-y-auto border-t border-default"
                  aria-label="Done tasks"
                >
                  {view.doneTasks.map((task) => (
                    <AgencyTaskRowView
                      key={task.id}
                      task={task}
                      projects={view.projects}
                      teamId={view.teamId}
                      selectedTaskId={view.selectedTaskId}
                      highlight={view.recentlyCompletedTaskId === task.id}
                      readOnly
                      isRowPending={view.isRowPending(task.id) || view.create.isCreatingTask}
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

      <AgencyTaskDeleteDialog
        task={deleteTarget}
        teamId={view.teamId}
        deleting={deleting}
        onDismiss={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

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
    case "collapsed": {
      const total = view.totalCount;
      const done = view.doneCount;
      const active = view.activeCount;
      const hasCounts = total !== null && total > 0;
      const donePct = hasCounts ? ((done ?? 0) / total) * 100 : 0;
      const progressLabel =
        total === null
          ? "Loading task progress"
          : total === 0
            ? "No tasks"
            : `${done ?? 0} done, ${active ?? 0} open of ${total}`;

      return (
        <section className={cn(agencyTaskRailClass, "relative items-center gap-3 px-2 py-3")}>
          <div
            className="agency-task-rail-liquid pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total ?? 0}
            aria-valuenow={done ?? 0}
            aria-valuetext={progressLabel}
            aria-label="Task completion"
          >
            {hasCounts ? (
              <>
                <div className="agency-task-rail-liquid__active absolute inset-x-0 bottom-0 h-full" />
                <AgencyTaskRailLiquidDone donePct={donePct} />
              </>
            ) : null}
          </div>

          <button
            type="button"
            className={cn(
              "relative z-10 flex size-11 items-center justify-center rounded-xl border border-default bg-default text-muted transition-colors hover:bg-elevated hover:text-highlighted",
              agencyFocusRingClass,
              "motion-reduce:transition-none",
            )}
            aria-label="Expand task list"
            onClick={view.onExpand}
          >
            <PanelLeftOpen className="size-4" />
          </button>

          <div className="relative z-10 flex flex-col items-center" title="My tasks">
            <AgencyTaskRailSummary
              compact
              total={view.totalCount}
              done={view.doneCount}
              left={view.activeCount}
            />
          </div>
        </section>
      );
    }
    case "ready": {
      return <AgencyTaskListReadyView view={view} />;
    }
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}
