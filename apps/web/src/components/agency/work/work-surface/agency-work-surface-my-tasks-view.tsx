import {
  AlertTriangle,
  Calendar,
  CircleDot,
  FolderKanban,
  Loader2,
  MoreHorizontal,
  Play,
} from "lucide-react";
import { useMemo, useState } from "react";

import { AgencyTaskCreateInlineView } from "@/components/agency/work/task-list/agency-task-create-inline-view";
import { AgencyWorkSurfacePaginationFooter } from "@/components/agency/work/work-surface/agency-work-surface-pagination-footer";
import { AgencyWorkSurfaceTableHeaderView } from "@/components/agency/work/work-surface/agency-work-surface-table-header-view";
import { AgencyWorkSurfaceTaskTableRowView } from "@/components/agency/work/work-surface/agency-work-surface-task-table-row-view";
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
import type { AgencyTaskClientDisplayGroup } from "@/lib/utils/agency-task-rail-grouping";
import { isTaskOverdue } from "@/lib/utils/agency-task-utils";
import {
  agencyWorkTableBodyScrollClass,
  agencyWorkTableListClass,
  agencyWorkTableStackClass,
} from "@/lib/utils/agency-ui";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useAgencyOpsStore } from "@/stores/agency-ops";

type AgencyWorkSurfaceMyTasksViewProps = {
  view: Extract<AgencyTaskListViewModel, { status: "ready" }>;
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

function flattenTasksFromClientGroups(groups: AgencyTaskClientDisplayGroup[]): AgencyProjectTask[] {
  const tasks: AgencyProjectTask[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const projectGroup of group.projectGroups) {
      for (const row of projectGroup.standaloneRows) {
        if (seen.has(row.task.id)) continue;
        seen.add(row.task.id);
        tasks.push(row.task);
      }
      if (projectGroup.journeyCluster) {
        const anchor = projectGroup.journeyCluster.anchorRow.task;
        if (!seen.has(anchor.id)) {
          seen.add(anchor.id);
          tasks.push(anchor);
        }
        for (const milestone of projectGroup.journeyCluster.milestoneRows) {
          if (seen.has(milestone.task.id)) continue;
          seen.add(milestone.task.id);
          tasks.push(milestone.task);
        }
      }
    }
  }

  return tasks;
}

export function AgencyWorkSurfaceMyTasksView({ view }: AgencyWorkSurfaceMyTasksViewProps) {
  const agencyOps = useAgencyOpsStore();
  const deletingTaskIds = useAgencyOpsStore((state) => state.deletingTaskIds);
  const [deleteTarget, setDeleteTarget] = useState<AgencyProjectTask | null>(null);
  const deleting = deleteTarget !== null && deletingTaskIds.includes(deleteTarget.id);

  const tasks = useMemo(
    () =>
      flattenTasksFromClientGroups(view.clientGroups).sort((left, right) => {
        const leftOverdue = isTaskOverdue(left.dueDate) ? 0 : 1;
        const rightOverdue = isTaskOverdue(right.dueDate) ? 0 : 1;
        if (leftOverdue !== rightOverdue) return leftOverdue - rightOverdue;
        return left.title.localeCompare(right.title);
      }),
    [view.clientGroups],
  );

  if (view.activeTasksQueryError) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <AlertTriangle className="size-5 text-warning" aria-hidden />
        <p className="text-sm text-muted">
          {getErrorMessage(view.activeTasksErrorMessage, "Could not load tasks.")}
        </p>
        <Button size="sm" variant="secondary" onClick={view.onRetryActiveTasks}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {view.create.quickAddFocused ? (
        <div className="shrink-0 border-b border-default px-4 py-3">
          <AgencyTaskCreateInlineView projects={view.projects} create={view.create} />
        </div>
      ) : null}

      <div className={agencyWorkTableBodyScrollClass}>
        {view.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No active tasks yet.</p>
        ) : (
          <div className={agencyWorkTableStackClass}>
            <div className={agencyWorkTableListClass}>
              <AgencyWorkSurfaceTableHeaderView
                meta={[
                  { icon: FolderKanban, label: "Project / Category" },
                  { icon: Calendar, label: "Due / Scheduled" },
                  { icon: CircleDot, label: "Status" },
                  { icon: Play, label: "Actions", secondaryIcon: MoreHorizontal },
                ]}
              />
              {tasks.map((task) => (
                <AgencyWorkSurfaceTaskTableRowView
                  key={task.id}
                  task={task}
                  projects={view.projects}
                  teamId={view.teamId}
                  variant="active"
                  selected={task.id === view.selectedTaskId}
                  highlight={task.id === view.recentlyCreatedTaskId}
                  isRowPending={view.isRowPending(task.id)}
                  onSelect={(taskId) => view.onSelect(taskId)}
                  onSelectProject={view.onSelectProject}
                  onStatusChange={view.onStatusChange}
                  onDueDateChange={view.onDueDateChange}
                  onDelete={setDeleteTarget}
                />
              ))}
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
        task={deleteTarget}
        teamId={view.teamId}
        deleting={deleting}
        onDismiss={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          void agencyOps
            .deleteProjectTask({
              teamId: view.teamId,
              taskId: deleteTarget.id,
              taskTitle: deleteTarget.title,
            })
            .then(() => {
              setDeleteTarget(null);
            });
        }}
      />
    </div>
  );
}
