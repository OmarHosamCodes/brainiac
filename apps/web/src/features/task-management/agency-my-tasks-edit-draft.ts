export type MyTasksEditDraft = {
  title: string;
  assignedToTeam: boolean;
  assigneeUserIds: string[];
  estimateMinutes: number | null;
  billableRateDraft: string;
};

function sortedIds(ids: string[]): string[] {
  return [...ids].sort();
}

function billableRateDraftFromAmount(amount: number | null | undefined): string {
  if (amount == null) return "";
  return String(amount / 100);
}

export function myTasksEditDraftFromTask(task: {
  title: string;
  assignedToTeam: boolean;
  assignees: { userId: string }[];
  estimateMinutes?: number | null;
  billableRateAmount?: number | null;
}): MyTasksEditDraft {
  return {
    title: task.title,
    assignedToTeam: task.assignedToTeam,
    assigneeUserIds: sortedIds(task.assignees.map((a) => a.userId)),
    estimateMinutes: task.estimateMinutes ?? null,
    billableRateDraft: billableRateDraftFromAmount(task.billableRateAmount),
  };
}

export function isMyTasksEditDraftDirty(
  baseline: MyTasksEditDraft,
  draft: MyTasksEditDraft,
): boolean {
  if (baseline.title.trim() !== draft.title.trim()) return true;
  if (baseline.assignedToTeam !== draft.assignedToTeam) return true;
  if (baseline.estimateMinutes !== draft.estimateMinutes) return true;
  if (baseline.billableRateDraft.trim() !== draft.billableRateDraft.trim()) return true;
  const a = sortedIds(baseline.assigneeUserIds).join("\0");
  const b = sortedIds(draft.assigneeUserIds).join("\0");
  return a !== b;
}

export function canSaveMyTasksEdit(args: {
  draft: MyTasksEditDraft;
  baseline: MyTasksEditDraft;
  pending: boolean;
  billableRateAmountValid?: boolean;
}): boolean {
  if (args.pending) return false;
  if (!args.draft.title.trim()) return false;
  if (args.billableRateAmountValid === false) return false;
  return isMyTasksEditDraftDirty(args.baseline, args.draft);
}
