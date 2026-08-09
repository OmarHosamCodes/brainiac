/** Build timer.updateTask input. Task id is enough — never send a stale draft projectId. */
export function buildActiveTimerTaskUpdateInput(input: {
  teamId: string;
  taskId: string | null;
  draftProjectId?: string;
}): { teamId: string; taskId: string | null; projectId?: string } {
  const taskId = input.taskId?.trim() || null;
  if (taskId) {
    return { teamId: input.teamId, taskId };
  }

  const projectId = input.draftProjectId?.trim();
  return projectId
    ? { teamId: input.teamId, taskId: null, projectId }
    : { teamId: input.teamId, taskId: null };
}
