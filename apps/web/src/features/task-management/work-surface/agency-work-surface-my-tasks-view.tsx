import {
  AlertTriangle,
  Calendar,
  CircleDot,
  FolderKanban,
  Loader2,
  MoreHorizontal,
  Play,
} from "lucide-react";
import { useEffect } from "react";

import { AgencyWorkSurfacePaginationFooter } from "@/features/task-management/work-surface/agency-work-surface-pagination-footer";
import { AgencyWorkSurfaceTableHeaderView } from "@/features/task-management/work-surface/agency-work-surface-table-header-view";
import type { RenderAgencyWorkSurfaceTaskTableRow } from "@/features/task-management/work-surface/agency-work-surface-task-table-row-model";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Skeleton } from "@/ui/skeleton";
import type { AgencyTaskListViewModel } from "@/features/task-management/hooks/use-agency-task-list";
import type { AgencyProjectTask } from "@/features/task-management/agency-work";
import {
  agencyWorkTableBodyScrollClass,
  agencyWorkTableListClass,
  agencyWorkTableStackClass,
} from "@/features/shared/agency-ui";

type AgencyWorkSurfaceMyTasksViewProps = {
  view: Extract<AgencyTaskListViewModel, { status: "ready" }>;
  renderTaskTableRow: RenderAgencyWorkSurfaceTaskTableRow;
};

function AgencyWorkSurfaceTaskDeleteDialog({
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

export function AgencyWorkSurfaceMyTasksView({
  view,
  renderTaskTableRow,
}: AgencyWorkSurfaceMyTasksViewProps) {
  const tasks = view.activeTableTasks;

  useEffect(() => {
    const taskId = view.recentlyCreatedTaskId;
    const projectId = view.recentlyHighlightedProjectId;
    if (!taskId && !projectId) return;
    const frame = requestAnimationFrame(() => {
      const target =
        (taskId
          ? document.querySelector<HTMLElement>(`[data-task-id="${CSS.escape(taskId)}"]`)
          : null) ??
        (projectId
          ? document.querySelector<HTMLElement>(`[data-project-id="${CSS.escape(projectId)}"]`)
          : null);
      target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [view.recentlyCreatedTaskId, view.recentlyHighlightedProjectId]);

  if (view.activeTasksQueryError) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <AlertTriangle className="size-5 text-warning" aria-hidden />
        <p className="text-sm text-muted">
          {view.activeTasksErrorMessage || "Could not load tasks."}
        </p>
        <Button size="sm" variant="secondary" onClick={view.onRetryActiveTasks}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={agencyWorkTableBodyScrollClass}>
        {view.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-[4.5rem] w-full rounded-lg" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No active tasks yet.</p>
        ) : (
          <div className={agencyWorkTableStackClass}>
            <div className={agencyWorkTableListClass}>
              <AgencyWorkSurfaceTableHeaderView
                variant="active"
                meta={[
                  { icon: FolderKanban, label: "Project / Category" },
                  { icon: Calendar, label: "Due / Scheduled" },
                  { icon: CircleDot, label: "Status" },
                  { icon: Play, label: "Actions", secondaryIcon: MoreHorizontal },
                ]}
              />
              {tasks.map((task) =>
                renderTaskTableRow({
                  task,
                  projects: view.projects,
                  teamId: view.teamId,
                  variant: "active",
                  selected: task.id === view.selectedTaskId,
                  highlight: task.id === view.recentlyCreatedTaskId,
                  highlightProject: task.projectId === view.recentlyHighlightedProjectId,
                  isRowPending: view.isRowPending(task.id),
                  currentUserId: view.currentUserId,
                  teamMembers: view.create.members,
                  onSelect: (taskId) => view.onSelect(taskId),
                  onSelectProject: view.onSelectProject,
                  onStatusChange: view.onStatusChange,
                  onDueDateChange: view.onDueDateChange,
                  onDescriptionChange: view.onTaskDescriptionChange,
                  onDelete: view.onRequestDelete,
                }),
              )}
            </div>
          </div>
        )}
      </div>

      <AgencyWorkSurfacePaginationFooter
        rangeStart={tasks.length === 0 ? 0 : 1}
        rangeEnd={tasks.length}
        total={view.activeTasksTotal}
        previousDisabled
        nextDisabled={!view.hasMoreActiveTasks}
        onNext={view.onFetchMoreActiveTasks}
      />

      <AgencyWorkSurfaceTaskDeleteDialog
        task={view.deleteTarget}
        teamId={view.teamId}
        deleting={view.deletePending}
        onDismiss={view.onDismissDelete}
        onConfirm={view.onConfirmDelete}
      />
    </div>
  );
}
