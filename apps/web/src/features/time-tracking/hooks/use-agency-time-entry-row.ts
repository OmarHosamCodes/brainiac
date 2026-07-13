import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useState } from "react";

import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";
import type { AgencyTagOption } from "@/features/time-tracking/choosers/agency-tag-chooser";
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
  formatClockTimeLabel,
  parseClockTimeLabel,
} from "@/features/time-tracking/time-entry-draft";
import { formatDuration } from "@/lib/utils/format-duration";
import type {
  CollapsedEntryGroup,
  TimeEntryRecord,
} from "@/features/time-tracking/group-time-entries";
import { useTrackerDraft } from "@/features/time-tracking/stores/agency-time-tracking";
import { useTheme } from "@/stores/theme";

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeLabel(date: Date): string {
  return formatClockTimeLabel(
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  );
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

function singleEntryGroup(group: CollapsedEntryGroup, entry: TimeEntryRecord): CollapsedEntryGroup {
  return {
    collapseKey: group.collapseKey,
    projectId: entry.projectId,
    taskId: entry.taskId,
    taskTitle: entry.taskTitle ?? "",
    projectName: entry.projectName,
    clientName: entry.clientName,
    description: entry.description,
    totalSeconds: entry.durationSeconds,
    entries: [entry],
  };
}

type UseAgencyTimeEntryRowOptions = {
  group: CollapsedEntryGroup;
  teamId: string;
  projects: AgencyProject[];
  tasks: AgencyProjectTask[];
  tags: AgencyTagOption[];
  tagCreatePending: boolean;
  onCreateTag: (name: string) => void;
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
  onBulkPatch: (
    entryIds: string[],
    patch: {
      projectId?: string;
      taskId?: string | null;
      description?: string;
      tagIds?: string[];
      isBillable?: boolean;
    },
  ) => Promise<void>;
  highlighted?: boolean;
};

export type AgencyTimeEntryRowViewModel = {
  group: CollapsedEntryGroup;
  teamId: string;
  projects: AgencyProject[];
  tasks: AgencyProjectTask[];
  tags: AgencyTagOption[];
  tagCreatePending: boolean;
  onCreateTag: (name: string) => void;
  expanded: boolean;
  isTimerMutationPending: boolean;
  highlighted: boolean;
  isDark: boolean;
  isMulti: boolean;
  expandedChildGroups: CollapsedEntryGroup[];
  canRestart: boolean;
  primaryEntryId: string;
  descriptionDraft: string;
  editDraft: TimeEntryDraft;
  startTimeInput: string;
  endTimeInput: string;
  editError: string | null;
  editSaving: boolean;
  rowDeleting: boolean;
  rowUpdating: boolean;
  rowDuplicating: boolean;
  timeRange: string;
  durationLabel: string;
  displayTitle: string;
  editingDescription: boolean;
  timeEditorOpen: boolean;
  editingDuration: boolean;
  onToggleExpand: () => void;
  onRestart: () => void;
  onDeleteGroup: () => void;
  onDeleteEntry: (entryId: string) => void;
  onDuplicate: () => void;
  onDescriptionChange: (value: string) => void;
  onDescriptionBlur: () => void;
  onDescriptionKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onTaskChange: (taskId: string) => void;
  onProjectChange: (projectId: string) => void;
  onTagIdsChange: (tagIds: string[]) => void;
  onIsBillableChange: (isBillable: boolean) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onStartTimeBlur: () => void;
  onEndTimeBlur: () => void;
  onStartDateChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onInlineBlur: () => void;
  onInlineKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onEditingDescriptionChange: (editing: boolean) => void;
  onTimeEditorOpenChange: (open: boolean) => void;
  onEditingDurationChange: (editing: boolean) => void;
};

export function useAgencyTimeEntryRow({
  group,
  teamId,
  projects,
  tasks,
  tags,
  tagCreatePending,
  onCreateTag,
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
  onBulkPatch,
  highlighted = false,
}: UseAgencyTimeEntryRowOptions): AgencyTimeEntryRowViewModel {
  const { isDark } = useTheme();
  const activeTimer = useAgencyActiveTimerQuery(teamId).data?.timer ?? null;
  const activeTimerTeamId = activeTimer?.teamId ?? teamId;
  const trackerDraft = useTrackerDraft(activeTimerTeamId);
  const isMulti = group.entries.length > 1;
  const expandedChildGroups = expanded
    ? group.entries.map((entry) => singleEntryGroup(group, entry))
    : [];
  const primaryEntry = group.entries[0]!;

  const [editDraft, setEditDraft] = useState<TimeEntryDraft>(() => entryToDraft(primaryEntry));
  const [startTimeInput, setStartTimeInput] = useState(() =>
    formatClockTimeLabel(entryToDraft(primaryEntry).startTime),
  );
  const [endTimeInput, setEndTimeInput] = useState(() =>
    formatClockTimeLabel(entryToDraft(primaryEntry).endTime),
  );
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [timeEditorOpen, setTimeEditorOpen] = useState(false);
  const [editingDuration, setEditingDuration] = useState(false);
  const groupDescription = group.description;
  const groupTaskTitle = group.taskTitle;
  const resolvedTitle = groupDescription.trim().length > 0 ? groupDescription : groupTaskTitle;

  const [descriptionDraft, setDescriptionDraft] = useState(() => resolvedTitle);

  useEffect(() => {
    setDescriptionDraft(resolvedTitle);
  }, [groupDescription, groupTaskTitle]);

  useEffect(() => {
    const nextDraft = entryToDraft(primaryEntry);
    setEditDraft(nextDraft);
    setStartTimeInput(formatClockTimeLabel(nextDraft.startTime));
    setEndTimeInput(formatClockTimeLabel(nextDraft.endTime));
    setEditError(null);
  }, [primaryEntry]);

  const resetEditDraft = useCallback(() => {
    const nextDraft = entryToDraft(primaryEntry);
    setEditDraft(nextDraft);
    setStartTimeInput(formatClockTimeLabel(nextDraft.startTime));
    setEndTimeInput(formatClockTimeLabel(nextDraft.endTime));
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

  const saveBulkFieldPatch = useCallback(
    async (patch: {
      projectId?: string;
      taskId?: string | null;
      tagIds?: string[];
      isBillable?: boolean;
    }) => {
      if (!isMulti) return;
      setEditSaving(true);
      setEditError(null);
      try {
        await onBulkPatch(
          group.entries.map((entry) => entry.id),
          patch,
        );
      } finally {
        setEditSaving(false);
      }
    },
    [group.entries, isMulti, onBulkPatch],
  );

  const saveMultiDateChange = useCallback(
    async (date: string) => {
      if (!isMulti) return;
      setEditSaving(true);
      setEditError(null);
      try {
        // Sequential: updateEntry restores updatingEntryIds from a snapshot and races if parallel.
        for (const entry of group.entries) {
          await onSaveEdit(entry.id, { ...entryToDraft(entry), date });
        }
      } finally {
        setEditSaving(false);
      }
    },
    [group.entries, isMulti, onSaveEdit],
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

  const commitStartTimeInput = useCallback(async () => {
    if (isMulti) return;
    const parsed = parseClockTimeLabel(startTimeInput);
    if (!parsed) {
      setStartTimeInput(formatClockTimeLabel(editDraft.startTime));
      setEditError("Invalid start time.");
      return;
    }
    const nextDraft = applyStartTimeToDraft(editDraft, parsed);
    setStartTimeInput(formatClockTimeLabel(nextDraft.startTime));
    setEndTimeInput(formatClockTimeLabel(nextDraft.endTime));
    updateInlineDraft(nextDraft);
    await saveInlineDraft(nextDraft);
  }, [editDraft, isMulti, saveInlineDraft, startTimeInput, updateInlineDraft]);

  const commitEndTimeInput = useCallback(async () => {
    if (isMulti) return;
    const parsed = parseClockTimeLabel(endTimeInput);
    if (!parsed) {
      setEndTimeInput(formatClockTimeLabel(editDraft.endTime));
      setEditError("Invalid end time.");
      return;
    }
    const nextDraft = applyEndTimeToDraft(editDraft, parsed);
    setStartTimeInput(formatClockTimeLabel(nextDraft.startTime));
    setEndTimeInput(formatClockTimeLabel(nextDraft.endTime));
    updateInlineDraft(nextDraft);
    await saveInlineDraft(nextDraft);
  }, [editDraft, endTimeInput, isMulti, saveInlineDraft, updateInlineDraft]);

  const onInlineKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        setEditingDuration(false);
        const field = event.currentTarget.dataset.timeField;
        if (field === "start") {
          void commitStartTimeInput();
          return;
        }
        if (field === "end") {
          void commitEndTimeInput();
          return;
        }
        void saveInlineDraft();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        resetEditDraft();
        cancelDescriptionEdit();
        setEditingDuration(false);
      }
    },
    [
      cancelDescriptionEdit,
      commitEndTimeInput,
      commitStartTimeInput,
      resetEditDraft,
      saveInlineDraft,
    ],
  );

  const rowDeleting = group.entries.some((entry) => deletingEntryIds.includes(entry.id));
  const rowUpdating = group.entries.some((entry) => updatingEntryIds.includes(entry.id));
  const rowDuplicating = group.entries.some((entry) => duplicatingEntryIds.includes(entry.id));
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
      selectedTask: activeTimer
        ? !activeTimer.taskId && trackerDraft?.taskId?.trim()
          ? { id: trackerDraft.taskId.trim(), title: "" }
          : null
        : { id: group.taskId, title: group.taskTitle ?? "" },
    }),
  );

  return {
    group,
    teamId,
    projects,
    tasks,
    tags,
    tagCreatePending,
    onCreateTag,
    expanded,
    isTimerMutationPending,
    highlighted,
    isDark,
    isMulti,
    expandedChildGroups,
    canRestart,
    primaryEntryId: primaryEntry.id,
    descriptionDraft,
    editDraft,
    startTimeInput,
    endTimeInput,
    editError,
    editSaving,
    rowDeleting,
    rowUpdating,
    rowDuplicating,
    timeRange,
    durationLabel,
    displayTitle: displayTitle(group),
    editingDescription,
    timeEditorOpen,
    editingDuration,
    onToggleExpand,
    onRestart: () => onRestart(group),
    onDeleteGroup: () => onDeleteGroup(group.entries.map((entry) => entry.id)),
    onDeleteEntry,
    onDuplicate: () => onDuplicate(primaryEntry.id),
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
      const task = tasks.find((entry) => entry.id === taskId);
      const nextDraft = {
        ...editDraft,
        taskId,
        projectId: task?.projectId ?? editDraft.projectId,
      };
      updateInlineDraft(nextDraft);
      if (isMulti) {
        void saveBulkFieldPatch({
          projectId: nextDraft.projectId,
          taskId: nextDraft.taskId,
        });
        return;
      }
      void saveInlineDraft(nextDraft);
    },
    onProjectChange: (projectId) => {
      const nextDraft = {
        ...editDraft,
        projectId,
        taskId: editDraft.projectId === projectId ? editDraft.taskId : "",
      };
      updateInlineDraft(nextDraft);
      if (isMulti) {
        void saveBulkFieldPatch({
          projectId: nextDraft.projectId,
          taskId: nextDraft.taskId || null,
        });
        return;
      }
      void saveInlineDraft(nextDraft);
    },
    onTagIdsChange: (tagIds) => {
      const nextDraft = { ...editDraft, tagIds };
      updateInlineDraft(nextDraft);
      if (isMulti) {
        void saveBulkFieldPatch({ tagIds });
        return;
      }
      void saveInlineDraft(nextDraft);
    },
    onIsBillableChange: (nextBillable) => {
      const nextDraft = { ...editDraft, isBillable: nextBillable };
      updateInlineDraft(nextDraft);
      if (isMulti) {
        void saveBulkFieldPatch({ isBillable: nextBillable });
        return;
      }
      void saveInlineDraft(nextDraft);
    },
    onStartTimeChange: setStartTimeInput,
    onEndTimeChange: setEndTimeInput,
    onStartTimeBlur: () => void commitStartTimeInput(),
    onEndTimeBlur: () => void commitEndTimeInput(),
    onStartDateChange: (value) => {
      const nextDraft = { ...editDraft, date: value };
      updateInlineDraft(nextDraft);
      if (isMulti) {
        void saveMultiDateChange(value);
        return;
      }
      void saveInlineDraft(nextDraft);
    },
    onDurationChange: (value) => updateInlineDraft(applyDurationToDraft(editDraft, value)),
    onInlineBlur: () => void saveInlineDraft(),
    onInlineKeyDown,
    onEditingDescriptionChange: setEditingDescription,
    onTimeEditorOpenChange: setTimeEditorOpen,
    onEditingDurationChange: setEditingDuration,
  };
}
