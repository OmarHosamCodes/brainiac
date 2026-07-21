/** Resolve project + task to write on an active timer binding update. */
export function resolveAgencyActiveTimerTaskBinding(input: {
  taskId: string | null;
  /** Project id of the task when taskId is set (from DB lookup). */
  taskProjectId?: string | null;
  projectId?: string | null;
}): { projectId: string | null; taskId: string | null } {
  if (input.taskId) {
    return {
      projectId: input.taskProjectId ?? null,
      taskId: input.taskId,
    };
  }

  const projectId = input.projectId?.trim() || null;
  return { projectId, taskId: null };
}
