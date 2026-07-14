/** Resolve project + task for a timer stop (entry is logged to the returned project). */
export function resolveAgencyTimerStopBinding(input: {
  activeProjectId: string;
  activeTaskId: string | null;
  inputTaskId?: string;
  inputTaskProjectId?: string;
}): { projectId: string; taskId: string } | { projectId: string; taskId: null } {
  // Honor the task chosen in the tracker (including mid-run changes and cross-project moves).
  if (input.inputTaskId && input.inputTaskProjectId) {
    return {
      projectId: input.inputTaskProjectId,
      taskId: input.inputTaskId,
    };
  }

  if (input.activeTaskId) {
    return { projectId: input.activeProjectId, taskId: input.activeTaskId };
  }

  return { projectId: input.activeProjectId, taskId: null };
}
