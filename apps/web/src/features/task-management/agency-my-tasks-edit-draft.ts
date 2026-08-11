export type MyTasksEditDraft = {
  title: string;
  assignedToTeam: boolean;
  assigneeUserIds: string[];
  estimateMinutes: number | null;
};

function sortedIds(ids: string[]): string[] {
  return [...ids].sort();
}

export function myTasksEditDraftFromTask(task: {
  title: string;
  assignedToTeam: boolean;
  assignees: { userId: string }[];
  estimateMinutes?: number | null;
}): MyTasksEditDraft {
  return {
    title: task.title,
    assignedToTeam: task.assignedToTeam,
    assigneeUserIds: sortedIds(task.assignees.map((a) => a.userId)),
    estimateMinutes: task.estimateMinutes ?? null,
  };
}

export function isMyTasksEditDraftDirty(
  baseline: MyTasksEditDraft,
  draft: MyTasksEditDraft,
): boolean {
  if (baseline.title.trim() !== draft.title.trim()) return true;
  if (baseline.assignedToTeam !== draft.assignedToTeam) return true;
  if (baseline.estimateMinutes !== draft.estimateMinutes) return true;
  const a = sortedIds(baseline.assigneeUserIds).join("\0");
  const b = sortedIds(draft.assigneeUserIds).join("\0");
  return a !== b;
}

export function canSaveMyTasksEdit(args: {
  draft: MyTasksEditDraft;
  baseline: MyTasksEditDraft;
  pending: boolean;
}): boolean {
  if (args.pending) return false;
  if (!args.draft.title.trim()) return false;
  return isMyTasksEditDraftDirty(args.baseline, args.draft);
}
