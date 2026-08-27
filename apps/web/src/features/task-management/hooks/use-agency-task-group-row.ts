import { useState } from "react";

import type {
  AgencyProjectTask,
  AgencyTaskProject,
  TaskStatus,
} from "@/features/task-management/agency-work";
import type { AgencyProjectTaskGroup } from "@/features/task-management/agency-task-utils";
import type { TaskTrackingState } from "@/features/time-tracking/task-tracking-state";

type MemberStatus = "open" | "in_progress" | "done";

export type AgencyTaskGroupRowProps = {
  group: AgencyProjectTaskGroup;
  mode: "work" | "project";
  projects?: AgencyTaskProject[];
  teamId?: string;
  currentUserId?: string;
  selectedTaskId?: string;
  isRowPending?: (taskId: string) => boolean;
  deletingTaskIds?: string[];
  onSelect?: (taskId: string) => void;
  onSelectProject?: (projectId: string) => void;
  onStatusChange?: (task: AgencyProjectTask, status: TaskStatus) => void;
  onDeleteInstance?: (task: AgencyProjectTask) => void;
  onDelete?: (task: AgencyProjectTask) => void;
  readOnly?: boolean;
  highlightTaskId?: string;
  getTaskTrackingState?: (taskId: string) => TaskTrackingState;
  /** Project page: owners can edit catalog task rates inline. */
  canEditTaskRate?: boolean;
};

function resolveViewerStatus(task: AgencyProjectTask): MemberStatus {
  return (
    task.viewerStatus ??
    (task.status === "done" || task.status === "archived" ? "done" : task.status)
  );
}

function countDoneStatuses(
  group: AgencyProjectTaskGroup,
  currentUserId?: string,
): { done: number; total: number } {
  let done = 0;
  let total = 0;

  for (const instance of group.instances) {
    if (currentUserId) {
      if (instance.assignedToTeam) {
        total += 1;
        if (resolveViewerStatus(instance) === "done") done += 1;
        continue;
      }
      const assignee = instance.assignees.find((entry) => entry.userId === currentUserId);
      if (!assignee) continue;
      total += 1;
      if (assignee.status === "done") done += 1;
      continue;
    }

    if (instance.assignees.length === 0) {
      total += 1;
      if (instance.status === "done" || instance.status === "archived") done += 1;
      continue;
    }

    for (const assignee of instance.assignees) {
      total += 1;
      if (assignee.status === "done") done += 1;
    }
  }

  return { done, total };
}

export function useAgencyTaskGroupRow(input: AgencyTaskGroupRowProps) {
  const {
    group,
    mode,
    projects = [],
    teamId = "",
    selectedTaskId = "",
    deletingTaskIds = [],
    readOnly = false,
    highlightTaskId = "",
  } = input;
  const [expanded, setExpanded] = useState(group.instanceCount === 1);
  const isRowPending = input.isRowPending ?? (() => false);
  const progress = countDoneStatuses(group, mode === "work" ? input.currentUserId : undefined);
  const singleInstance = group.instanceCount === 1 ? group.instances[0] : null;

  return {
    ...input,
    projects,
    teamId,
    selectedTaskId,
    deletingTaskIds,
    readOnly,
    highlightTaskId,
    expanded,
    progress,
    singleInstance,
    singleInstancePending: singleInstance ? isRowPending(singleInstance.id) : false,
    singleInstanceTrackingState: singleInstance
      ? input.getTaskTrackingState?.(singleInstance.id)
      : undefined,
    instanceRows: group.instances.map((instance) => ({
      instance,
      createdLabel: new Date(instance.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      viewerDone: resolveViewerStatus(instance) === "done",
      pending: isRowPending(instance.id),
      deleting: deletingTaskIds.includes(instance.id),
    })),
    onToggleExpanded: () => setExpanded((value) => !value),
  };
}

export type AgencyTaskGroupRowViewModel = ReturnType<typeof useAgencyTaskGroupRow>;
