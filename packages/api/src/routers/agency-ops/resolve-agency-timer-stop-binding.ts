/** Resolve project + task for a timer stop (entry is logged to the returned project). */
export function resolveAgencyTimerStopBinding(input: {
  activeProjectId: string;
  activeTaskId: string | null;
  inputTaskId?: string;
  inputTaskProjectId?: string;
}):
  | { projectId: string; taskId: string }
  | { projectId: string; taskId: null }
  | { error: "task_project_mismatch" } {
  if (input.inputTaskId && input.inputTaskProjectId) {
    if (input.activeTaskId) {
      if (input.inputTaskProjectId !== input.activeProjectId) {
        return { error: "task_project_mismatch" };
      }
      return { projectId: input.activeProjectId, taskId: input.activeTaskId };
    }

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
