import { useState } from "react";
import { AlertTriangle, ListChecks, Loader2 } from "lucide-react";

import { AgencyTaskVirtualList } from "@/components/agency/work/task-list/agency-task-virtual-list";
import { AgencyTaskGroupsList } from "@/components/agency/work/task-list/agency-task-groups-list";
import { AgencyTaskCreateInlineView } from "@/components/agency/work/task-list/agency-task-create-inline-view";
import { AgencyTaskRailStatusFilters } from "@/components/agency/work/task-list/agency-task-rail-status-filters";
import { AgencyTaskRailExpandButton } from "@/components/agency/work/task-list/agency-task-rail-expand-button";
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
import type { AgencyProjectTask } from "@/lib/schemas/agency-work";
import { agencyTaskRailClass, agencyTaskRailCollapsedClass } from "@/lib/utils/agency-ui";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useAgencyOpsStore } from "@/stores/agency-ops";

type AgencyTaskListViewProps = {
  view: AgencyTaskListViewModel;
};

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

  const deleting = deleteTarget !== null && deletingTaskIds.includes(deleteTarget.id);
  const showingDone = view.railStatusFilter === "done";
  const displayedGroups = showingDone ? view.doneProjectGroups : view.projectGroups;
  const listLoading = showingDone ? view.doneTasksLoading : view.isLoading;
  const listQueryError = showingDone ? view.doneTasksQueryError : view.activeTasksQueryError;
  const listErrorMessage = showingDone ? view.doneTasksErrorMessage : view.activeTasksErrorMessage;
  const onRetryList = showingDone ? view.onRetryDoneTasks : view.onRetryActiveTasks;
  const listEmpty = displayedGroups.length === 0;

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
      <section
        className={agencyTaskRailClass}
        tabIndex={-1}
        data-agency-task-rail
        onKeyDown={(event) => {
          if (
            event.key === "n" &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey &&
            event.target === event.currentTarget
          ) {
            event.preventDefault();
            view.create.onFocusQuickAdd();
          }
        }}
      >
        <AgencyTaskRailSummary
          total={view.totalCount}
          done={view.doneCount}
          left={view.activeCount}
          journeyCount={view.journeyCount}
          standaloneTaskCount={view.standaloneTaskCount}
          onCollapse={view.onCollapseRail}
        />

        <div className="shrink-0 border-b border-default px-3 py-2">
          <AgencyTaskRailStatusFilters
            railStatusFilter={view.railStatusFilter}
            activeCount={view.activeCount}
            doneCount={view.doneCount}
            onRailStatusFilterChange={view.onRailStatusFilterChange}
          />
        </div>

        {listLoading ? (
          <div className="min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto p-3">
            {[1, 2, 3].map((rowIndex) => (
              <div key={rowIndex} className="space-y-2">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="ml-2 h-14 rounded-lg" />
              </div>
            ))}
          </div>
        ) : listQueryError ? (
          <div
            className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center"
            role="alert"
          >
            <AlertTriangle className="size-5 text-error" aria-hidden />
            <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load tasks.</p>
            <p className="mt-1 text-xs text-muted">
              {getErrorMessage(listErrorMessage, "Try refreshing.")}
            </p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={onRetryList}>
              Retry
            </Button>
          </div>
        ) : listEmpty ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6 text-center">
            <ListChecks className="size-6 text-muted" aria-hidden />
            <p className="mt-3 text-xs text-muted">
              {showingDone ? "Nothing completed yet." : "No tasks assigned to you."}
            </p>
            {!showingDone ? (
              <p className="mt-1 text-xs text-muted">Type below to add one.</p>
            ) : null}
          </div>
        ) : showingDone ? (
          <AgencyTaskGroupsList
            projectGroups={displayedGroups}
            allTasks={view.allListedTasks}
            collapsedProjects={view.collapsedProjects}
            projects={view.projects}
            teamId={view.teamId}
            selectedTaskId={view.selectedTaskId}
            highlightBlueprintId={view.recentlyCreatedBlueprintId}
            highlightTaskId={view.recentlyCompletedTaskId}
            isRowPending={(taskId) => view.isRowPending(taskId) || deletingTaskIds.includes(taskId)}
            onProjectExpandedChange={view.onProjectExpandedChange}
            onSelect={view.onSelect}
            onSelectProject={view.onSelectProject}
            onStatusChange={view.onStatusChange}
            readOnly
            onReopenToActive={view.onReopenDoneTask}
            listAriaLabel="Done tasks"
          />
        ) : (
          <AgencyTaskVirtualList
            projectGroups={displayedGroups}
            allTasks={view.allListedTasks}
            collapsedProjects={view.collapsedProjects}
            projects={view.projects}
            teamId={view.teamId}
            selectedTaskId={view.selectedTaskId}
            highlightBlueprintId={view.recentlyCreatedBlueprintId}
            isRowPending={(taskId) => view.isRowPending(taskId) || deletingTaskIds.includes(taskId)}
            onProjectExpandedChange={view.onProjectExpandedChange}
            onSelect={view.onSelect}
            onSelectProject={view.onSelectProject}
            onStatusChange={view.onStatusChange}
            onDelete={setDeleteTarget}
            hasMore={view.hasMoreActiveTasks}
            isFetchingMore={view.isFetchingMoreActiveTasks}
            onFetchMore={view.onFetchMoreActiveTasks}
            getTaskTrackingState={view.getTaskTrackingState}
            onBlueprintDescriptionChange={view.onBlueprintDescriptionChange}
            onTrackerDescriptionChange={view.onTrackerDescriptionChange}
            onAssociateTrackerForDescription={view.onAssociateTrackerForDescription}
            listAriaLabel="My tasks"
          />
        )}

        <AgencyTaskCreateInlineView projects={view.projects} create={view.create} />
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
      return (
        <section className={agencyTaskRailCollapsedClass}>
          <AgencyTaskRailExpandButton
            activeCount={view.activeCount}
            doneCount={view.doneCount}
            totalCount={view.totalCount}
            onClick={view.onExpand}
          />

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
