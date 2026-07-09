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
  trackerDescription: string;
  hasDescription: boolean;
  needsDescription: boolean;
  canEditDescription: boolean;
};

export function resolveTaskTrackingState(input: {
  taskId: string;
  activeTimer: TaskTrackingTimerRef;
  trackerDraft: TaskTrackingDraftRef;
  blueprintDescription?: string;
}): TaskTrackingState {
  const draftTaskId = input.trackerDraft?.taskId ?? "";
  const isTrackingTask = draftTaskId === input.taskId || input.activeTimer?.taskId === input.taskId;

  const blueprintDescription = input.blueprintDescription ?? "";
  const trackerDescription = isTrackingTask ? (input.trackerDraft?.description ?? "") : "";
  const hasActiveTimer = Boolean(input.activeTimer);

  return {
    isTrackingTask,
    description: blueprintDescription,
    trackerDescription,
    hasDescription: blueprintDescription.trim().length > 0,
    needsDescription: isTrackingTask && hasActiveTimer && !trackerDescription.trim(),
    canEditDescription: false,
  };
}
