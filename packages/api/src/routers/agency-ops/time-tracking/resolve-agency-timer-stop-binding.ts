/** Resolve project + task for a timer stop (entry is logged to the returned project). */
export function resolveAgencyTimerStopBinding(input: {
  activeProjectId: string | null;
  activeTaskId: string | null;
  inputTaskId?: string;
  inputTaskProjectId?: string;
}):
  | { projectId: string; taskId: string }
  | { projectId: string; taskId: null }
  | { projectId: null; taskId: null } {
  // Honor the task chosen in the tracker (including mid-run changes and cross-project moves).
  if (input.inputTaskId && input.inputTaskProjectId) {
    return {
      projectId: input.inputTaskProjectId,
      taskId: input.inputTaskId,
    };
  }

  if (input.activeTaskId && input.activeProjectId) {
    return { projectId: input.activeProjectId, taskId: input.activeTaskId };
  }

  if (input.activeProjectId) {
    return { projectId: input.activeProjectId, taskId: null };
  }

  return { projectId: null, taskId: null };
}
