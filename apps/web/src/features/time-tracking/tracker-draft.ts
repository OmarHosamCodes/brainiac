export type AgencyTrackerDraft = {
  description: string;
  projectId: string;
  taskId: string;
  tagIds: string[];
  isBillable: boolean;
  syncedTimerId: string | null;
};

type RetainedDraftTimer = {
  projectId: string;
  taskId: string | null;
  tags: Array<{ id: string }>;
  isBillable: boolean;
};

type RetainedDraftInput = {
  activeTimer: RetainedDraftTimer;
  previousDraft: AgencyTrackerDraft | null;
  selectedTaskId?: string | null;
  description: string;
  tagIds?: string[];
  isBillable?: boolean;
};

export function createRetainedTrackerDraftAfterStop({
  activeTimer,
  previousDraft,
  selectedTaskId,
  description,
  tagIds,
  isBillable,
}: RetainedDraftInput): AgencyTrackerDraft {
  return {
    description,
    projectId: previousDraft?.projectId || activeTimer.projectId,
    taskId: selectedTaskId ?? previousDraft?.taskId ?? activeTimer.taskId ?? "",
    tagIds: [...(tagIds ?? previousDraft?.tagIds ?? activeTimer.tags.map((tag) => tag.id))],
    isBillable: isBillable ?? previousDraft?.isBillable ?? activeTimer.isBillable,
    syncedTimerId: null,
  };
}
