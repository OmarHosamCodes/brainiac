export type TaskTrackingTimerRef = {
  taskId: string | null;
  projectId: string;
} | null;

export type TaskTrackingDraftRef = {
  taskId: string;
  description: string;
} | null;

export type TaskTrackingState = {
  isTrackingTask: boolean;
  description: string;
  hasDescription: boolean;
  needsDescription: boolean;
  canEditDescription: boolean;
};

export function resolveTaskTrackingState(input: {
  taskId: string;
  activeTimer: TaskTrackingTimerRef;
  trackerDraft: TaskTrackingDraftRef;
}): TaskTrackingState {
  const draftTaskId = input.trackerDraft?.taskId ?? "";
  const isTrackingTask =
    draftTaskId === input.taskId ||
    input.activeTimer?.taskId === input.taskId;

  const description = isTrackingTask ? (input.trackerDraft?.description ?? "") : "";
  const hasDescription = description.trim().length > 0;
  const hasActiveTimer = Boolean(input.activeTimer);

  return {
    isTrackingTask,
    description,
    hasDescription,
    needsDescription: isTrackingTask && hasActiveTimer && !hasDescription,
    canEditDescription: isTrackingTask && hasActiveTimer,
  };
}
