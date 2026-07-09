import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useState } from "react";

import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";
import { canStartAgencyTimer } from "@/features/time-tracking/timer-validation";
import { useAgencyActiveTimerQuery } from "@/features/shared/agency-queries";
import {
  draftToIsoRange,
  validateTimeEntryDraft,
  type TimeEntryDraft,
} from "@/features/time-tracking/agency-time-entry";
import {
  applyDurationToDraft,
  applyEndTimeToDraft,
  applyStartTimeToDraft,
  entryToDraft,
} from "@/features/time-tracking/time-entry-draft";
import { formatDuration } from "@/lib/utils/format-duration";
import type { CollapsedEntryGroup } from "@/features/time-tracking/group-time-entries";
import { useTrackerDraft } from "@/features/time-tracking/stores/agency-time-tracking";

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeLabel(date: Date): string {
  return date
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .replace(/\sAM/g, " am")
    .replace(/\sPM/g, " pm");
}

function formatTimeRange(startedAt: string, endedAt: string) {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const overnight = localDateKey(start) !== localDateKey(end);
  const range = `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`;
  return overnight ? `${range} +1` : range;
}

function formatGroupTimeRange(group: CollapsedEntryGroup) {
  if (group.entries.length === 0) return "";

  let earliestStart = Number.POSITIVE_INFINITY;
  let latestEnd = Number.NEGATIVE_INFINITY;

  for (const entry of group.entries) {
    const startMs = new Date(entry.startedAt).getTime();
    const endMs = new Date(entry.endedAt).getTime();
    if (!Number.isNaN(startMs)) earliestStart = Math.min(earliestStart, startMs);
    if (!Number.isNaN(endMs)) latestEnd = Math.max(latestEnd, endMs);
  }

  if (!Number.isFinite(earliestStart) || !Number.isFinite(latestEnd)) return "";
  return formatTimeRange(new Date(earliestStart).toISOString(), new Date(latestEnd).toISOString());
}

function displayTitle(group: CollapsedEntryGroup) {
  if (group.description.trim()) return group.description;
  return group.taskTitle;
}

type UseAgencyTimeEntryRowOptions = {
  group: CollapsedEntryGroup;
  teamId: string;
  projects: AgencyProject[];
  tasks: AgencyProjectTask[];
  expanded: boolean;
  isTimerMutationPending: boolean;
  deletingEntryIds: string[];
  updatingEntryIds: string[];
  duplicatingEntryIds: string[];
  onToggleExpand: () => void;
  onRestart: (group: CollapsedEntryGroup) => void;
  onDeleteGroup: (entryIds: string[]) => void;
  onDeleteEntry: (entryId: string) => void;
  onDuplicate: (entryId: string) => void;
  onSaveEdit: (entryId: string, draft: TimeEntryDraft) => Promise<void>;
  onToggleWaste: (entryId: string) => Promise<void>;
  togglingWasteEntryIds: string[];
  highlighted?: boolean;
};

export type AgencyTimeEntryRowViewModel = {
  group: CollapsedEntryGroup;
  teamId: string;
  projects: AgencyProject[];
  tasks: AgencyProjectTask[];
  expanded: boolean;
  isTimerMutationPending: boolean;
  highlighted: boolean;
  isMulti: boolean;
  canRestart: boolean;
  primaryEntryId: string;
  descriptionDraft: string;
  editDraft: TimeEntryDraft;
  editError: string | null;
  editSaving: boolean;
  rowDeleting: boolean;
  rowUpdating: boolean;
  rowDuplicating: boolean;
  rowWastePending: boolean;
  isWaste: boolean;
  timeRange: string;
  durationLabel: string;
  displayTitle: string;
  onToggleExpand: () => void;
  onRestart: () => void;
  onDeleteGroup: () => void;
  onDeleteEntry: (entryId: string) => void;
  onDuplicate: () => void;
  onToggleWaste: () => void;
  onDescriptionChange: (value: string) => void;
  onDescriptionBlur: () => void;
  onDescriptionKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onTaskChange: (taskId: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onInlineBlur: () => void;
  onInlineKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

export function useAgencyTimeEntryRow({
  group,
  teamId,
  projects,
  tasks,
  expanded,
  isTimerMutationPending,
  deletingEntryIds,
  updatingEntryIds,
  duplicatingEntryIds,
  onToggleExpand,
  onRestart,
  onDeleteGroup,
  onDeleteEntry,
  onDuplicate,
  onSaveEdit,
  onToggleWaste,
  togglingWasteEntryIds,
  highlighted = false,
}: UseAgencyTimeEntryRowOptions): AgencyTimeEntryRowViewModel {
  const activeTimer = useAgencyActiveTimerQuery(teamId).data?.timer ?? null;
  const activeTimerTeamId = activeTimer?.teamId ?? teamId;
  const trackerDraft = useTrackerDraft(activeTimerTeamId);
  const isMulti = group.entries.length > 1;
  const primaryEntry = group.entries[0]!;

  const [editDraft, setEditDraft] = useState<TimeEntryDraft>(() => entryToDraft(primaryEntry));
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const groupDescription = group.description;
  const groupTaskTitle = group.taskTitle;
  const resolvedTitle = groupDescription.trim().length > 0 ? groupDescription : groupTaskTitle;

  const [descriptionDraft, setDescriptionDraft] = useState(() => resolvedTitle);

  useEffect(() => {
    setDescriptionDraft(resolvedTitle);
  }, [groupDescription, groupTaskTitle]);

  useEffect(() => {
    setEditDraft(entryToDraft(primaryEntry));
    setEditError(null);
  }, [primaryEntry]);

  const resetEditDraft = useCallback(() => {
    setEditDraft(entryToDraft(primaryEntry));
    setEditError(null);
  }, [primaryEntry]);

  const saveDraft = useCallback(
    async (nextDraft: TimeEntryDraft): Promise<boolean> => {
      const validationError = validateTimeEntryDraft(nextDraft);
      if (validationError) {
        setEditError(validationError);
        return false;
      }

      const range = draftToIsoRange(nextDraft);
      if ("error" in range) {
        setEditError(range.error);
        return false;
      }

      setEditSaving(true);
      setEditError(null);
      try {
        await onSaveEdit(primaryEntry.id, nextDraft);
        return true;
      } finally {
        setEditSaving(false);
      }
    },
    [onSaveEdit, primaryEntry.id],
  );

  const saveDescriptionEdit = useCallback(async () => {
    const trimmed = descriptionDraft.trim();
    if (trimmed === resolvedTitle) return;

    const draft = entryToDraft(primaryEntry);
    draft.description = trimmed;
    await saveDraft(draft);
  }, [descriptionDraft, primaryEntry, resolvedTitle, saveDraft]);

  const cancelDescriptionEdit = useCallback(() => {
    setDescriptionDraft(resolvedTitle);
  }, [resolvedTitle]);

  const updateInlineDraft = useCallback((nextDraft: TimeEntryDraft) => {
    setEditDraft(nextDraft);
    setEditError(null);
  }, []);

  const saveInlineDraft = useCallback(
    async (nextDraft = editDraft) => {
      if (isMulti) return;
      await saveDraft(nextDraft);
    },
    [editDraft, isMulti, saveDraft],
  );

  const onInlineKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void saveInlineDraft();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        resetEditDraft();
        cancelDescriptionEdit();
      }
    },
    [cancelDescriptionEdit, resetEditDraft, saveInlineDraft],
  );

  const rowDeleting = group.entries.some((entry) => deletingEntryIds.includes(entry.id));
  const rowUpdating = group.entries.some((entry) => updatingEntryIds.includes(entry.id));
  const rowDuplicating = group.entries.some((entry) => duplicatingEntryIds.includes(entry.id));
  const rowWastePending = group.entries.some((entry) => togglingWasteEntryIds.includes(entry.id));
  const isWaste = primaryEntry.taskIsWaste === true;
  const timeRange = isMulti
    ? formatGroupTimeRange(group)
    : formatTimeRange(primaryEntry.startedAt, primaryEntry.endedAt);
  const durationLabel = formatDuration(group.totalSeconds, "clock");
  const project = projects.find((projectEntry) => projectEntry.id === group.projectId) ?? null;
  const canRestart = Boolean(
    teamId &&
    group.taskId &&
    project &&
    !isTimerMutationPending &&
    canStartAgencyTimer({
      activeTimer,
      project,
      description: trackerDraft?.description ?? activeTimer?.description,
      selectedTask:
        !activeTimer?.taskId && trackerDraft?.taskId?.trim()
          ? { id: trackerDraft.taskId.trim(), title: "" }
          : null,
    }),
  );

  return {
    group,
    teamId,
    projects,
    tasks,
    expanded,
    isTimerMutationPending,
    highlighted,
    isMulti,
    canRestart,
    primaryEntryId: primaryEntry.id,
    descriptionDraft,
    editDraft,
    editError,
    editSaving,
    rowDeleting,
    rowUpdating,
    rowDuplicating,
    rowWastePending,
    isWaste,
    timeRange,
    durationLabel,
    displayTitle: displayTitle(group),
    onToggleExpand,
    onRestart: () => onRestart(group),
    onDeleteGroup: () => onDeleteGroup(group.entries.map((entry) => entry.id)),
    onDeleteEntry,
    onDuplicate: () => onDuplicate(primaryEntry.id),
    onToggleWaste: () => void onToggleWaste(primaryEntry.id),
    onDescriptionChange: setDescriptionDraft,
    onDescriptionBlur: () => void saveDescriptionEdit(),
    onDescriptionKeyDown: (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void saveDescriptionEdit();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        cancelDescriptionEdit();
      }
    },
    onTaskChange: (taskId) => {
      const nextDraft = { ...editDraft, taskId };
      updateInlineDraft(nextDraft);
      void saveInlineDraft(nextDraft);
    },
    onStartTimeChange: (value) => updateInlineDraft(applyStartTimeToDraft(editDraft, value)),
    onEndTimeChange: (value) => updateInlineDraft(applyEndTimeToDraft(editDraft, value)),
    onStartDateChange: (value) => {
      const nextDraft = { ...editDraft, date: value };
      updateInlineDraft(nextDraft);
      void saveInlineDraft(nextDraft);
    },
    onDurationChange: (value) => updateInlineDraft(applyDurationToDraft(editDraft, value)),
    onInlineBlur: () => void saveInlineDraft(),
    onInlineKeyDown,
  };
}
