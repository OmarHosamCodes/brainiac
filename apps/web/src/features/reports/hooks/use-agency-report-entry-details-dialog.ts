import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { AgencyReportEntry } from "@/features/reports/agency-report-grouping";
import {
  reportRowAggregationKey,
  type ReportRowAggregationOptions,
} from "@/features/reports/agency-report-grouping";
import {
  invalidateAgencyDashboardQueries,
  invalidateAgencyEntriesQueries,
  invalidateAgencyReportsQueries,
  useAgencyProjectTasksForChooserQuery,
  useAgencyProjectsQuery,
} from "@/features/shared/agency-queries";
import { findProjectTaskInCache } from "@/features/shared/agency-query-cache";
import {
  draftToIsoRange,
  validateTimeEntryDraft,
  type TimeEntryDraft,
} from "@/features/time-tracking/agency-time-entry";
import type { AgencyDayBulkDraft } from "@/features/time-tracking/entries/agency-time-entry-day-group-view";
import { useTeamWorkSchedule } from "@/features/shared/use-team-work-schedule";
import {
  groupEntriesByWeek,
  type CollapsedEntryGroup,
  type TimeEntryWeekGroup,
} from "@/features/time-tracking/group-time-entries";
import {
  createAgencyTag,
  useAgencyTagsQuery,
} from "@/features/time-tracking/hooks/use-agency-tags";
import type { AgencyTagOption } from "@/features/time-tracking/choosers/agency-tag-chooser";
import {
  selectIsTimerMutationPending,
  useAgencyTimeTrackingStore,
} from "@/features/time-tracking/stores/agency-time-tracking";
import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { getErrorMessage } from "@/lib/utils/get-error-message";

export function selectEntriesForDetailsRow(
  entries: AgencyReportEntry[],
  rowKey: string | null,
  options: ReportRowAggregationOptions = {},
): AgencyReportEntry[] {
  if (!rowKey) return [];
  return entries.filter((entry) => reportRowAggregationKey(entry, options) === rowKey);
}

export function reportEntryDetailsDialogCopy(label: string, entryCount: number) {
  return {
    title: label,
    description: entryCount === 1 ? "1 time entry" : `${entryCount} time entries`,
  };
}

export type UseAgencyReportEntryDetailsDialogOptions = {
  teamId: string;
  entries: AgencyReportEntry[];
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type AgencyReportEntryDetailsDialogViewModel = {
  teamId: string;
  title: string;
  description: string;
  entriesEmpty: boolean;
  weekGroups: TimeEntryWeekGroup[];
  projects: AgencyProject[];
  tasks: AgencyProjectTask[];
  tags: AgencyTagOption[];
  tagCreatePending: boolean;
  expandedGroupKeys: Set<string>;
  isTimerMutationPending: boolean;
  deletingEntryIds: string[];
  updatingEntryIds: string[];
  duplicatingEntryIds: string[];
  selectedEntryIds: Set<string>;
  bulkEditDayKey: string | null;
  bulkFieldEditOpen: boolean;
  bulkDraft: AgencyDayBulkDraft;
  wastePending: boolean;
  prefersReducedMotion: boolean;
  onToggleGroupExpand: (collapseKey: string) => void;
  onRestart: (group: CollapsedEntryGroup) => void;
  onDeleteGroup: (entryIds: string[]) => void;
  onDeleteEntry: (entryId: string) => void;
  onDuplicate: (entryId: string) => void;
  onToggleWaste: (entryId: string) => void;
  onSaveEdit: (entryId: string, draft: TimeEntryDraft) => Promise<void>;
  onBulkPatch: (
    entryIds: string[],
    patch: {
      projectId?: string;
      taskId?: string | null;
      description?: string;
      tagIds?: string[];
      isBillable?: boolean;
      isWaste?: boolean;
    },
  ) => Promise<void>;
  onBulkDraftChange: (patch: Partial<AgencyDayBulkDraft>) => void;
  onToggleEntrySelected: (entryIds: string[]) => void;
  onToggleDayBulkEdit: (dateKey: string) => void;
  onToggleBulkFieldEdit: () => void;
  onDeleteSelected: (entryIds: string[]) => void;
  onMarkSelectedAsWaste: (entryIds: string[]) => void;
  onApplyBulk: () => void;
  onCreateTag: (name: string) => void;
  onClose: () => void;
};

function invalidateReportsEntries(teamId: string) {
  void Promise.all([
    invalidateAgencyEntriesQueries(teamId),
    invalidateAgencyReportsQueries(teamId),
    invalidateAgencyDashboardQueries(teamId),
  ]);
}

export function useAgencyReportEntryDetailsDialog({
  teamId,
  entries,
  title,
  open,
  onOpenChange,
}: UseAgencyReportEntryDetailsDialogOptions): AgencyReportEntryDetailsDialogViewModel {
  const prefersReducedMotion = usePrefersReducedMotion();
  const agencyTimeTrackingStore = useAgencyTimeTrackingStore();
  const deletingEntryIds = useAgencyTimeTrackingStore((state) => state.deletingEntryIds);
  const updatingEntryIds = useAgencyTimeTrackingStore((state) => state.updatingEntryIds);
  const duplicatingEntryIds = useAgencyTimeTrackingStore((state) => state.duplicatingEntryIds);
  const isTimerMutationPending = useAgencyTimeTrackingStore(selectIsTimerMutationPending);

  const [expandedGroupKeys, setExpandedGroupKeys] = useState(() => new Set<string>());
  const [selectedEntryIds, setSelectedEntryIds] = useState(() => new Set<string>());
  const [bulkEditDayKey, setBulkEditDayKey] = useState<string | null>(null);
  const [bulkFieldEditOpen, setBulkFieldEditOpen] = useState(false);
  const [wastePending, setWastePending] = useState(false);
  const [bulkDraft, setBulkDraft] = useState<AgencyDayBulkDraft>({
    projectId: "",
    taskId: "",
    description: "",
    tagIds: [],
    isBillable: null,
  });
  const [tagCreatePending, setTagCreatePending] = useState(false);

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const tasksQuery = useAgencyProjectTasksForChooserQuery(teamId);
  const tagsQuery = useAgencyTagsQuery(teamId);
  const projects = projectsQuery.data?.items ?? [];
  const tasks = tasksQuery.items ?? [];
  const tags = (tagsQuery.data?.items ?? []) as AgencyTagOption[];

  const workSchedule = useTeamWorkSchedule(teamId);
  const weekGroups = useMemo(
    () => groupEntriesByWeek(entries, new Date(), workSchedule.weekStartsOn),
    [entries, workSchedule.weekStartsOn],
  );
  const copy = reportEntryDetailsDialogCopy(title, entries.length);

  useEffect(() => {
    if (!open) {
      setExpandedGroupKeys(new Set());
      setSelectedEntryIds(new Set());
      setBulkEditDayKey(null);
      setBulkFieldEditOpen(false);
      setBulkDraft({
        projectId: "",
        taskId: "",
        description: "",
        tagIds: [],
        isBillable: null,
      });
    }
  }, [open]);

  useEffect(() => {
    if (open && entries.length === 0) {
      onOpenChange(false);
    }
  }, [open, entries.length, onOpenChange]);

  async function deleteEntry(entryId: string) {
    const entry = entries.find((item) => item.id === entryId);
    if (!teamId || !entry) return;
    await agencyTimeTrackingStore.deleteEntries({ teamId, entries: [entry] });
    invalidateReportsEntries(teamId);
  }

  async function deleteGroupEntries(entryIds: string[]) {
    const selectedEntries = entries.filter((entry) => entryIds.includes(entry.id));
    if (!teamId || selectedEntries.length === 0) return;
    await agencyTimeTrackingStore.deleteEntries({ teamId, entries: selectedEntries });
    invalidateReportsEntries(teamId);
  }

  async function restartEntry(group: CollapsedEntryGroup) {
    const project = projects.find((projectEntry) => projectEntry.id === group.projectId);
    const sourceEntry = group.entries[0];
    if (!teamId || !project) return;

    await agencyTimeTrackingStore.restartEntry({
      teamId,
      project,
      task: group.taskId ? { id: group.taskId, title: group.taskTitle } : null,
      description: group.description,
      tagIds: sourceEntry?.tags?.map((tag) => tag.id) ?? [],
      isBillable: sourceEntry?.isBillable ?? true,
    });
  }

  async function saveEdit(entryId: string, draft: TimeEntryDraft) {
    const validationError = validateTimeEntryDraft(draft, { requireTask: false });
    if (validationError) return;

    const range = draftToIsoRange(draft);
    if ("error" in range) return;

    const entry = entries.find((item) => item.id === entryId);
    const catalogTask = tasks.find((item) => item.id === draft.taskId);
    const cachedTask =
      catalogTask ?? (teamId ? findProjectTaskInCache(teamId, draft.taskId) : null);
    const task =
      catalogTask ??
      cachedTask ??
      (entry?.taskId === draft.taskId && draft.taskId
        ? {
            id: draft.taskId,
            teamId: entry.teamId,
            projectId: entry.projectId,
            title: entry.taskTitle ?? entry.description,
            status: "open" as const,
            taskKind: "standard" as const,
            assignedToTeam: false,
            assignees: [],
            dueDate: null,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
          }
        : null);
    const project =
      projects.find((item) => item.id === draft.projectId) ??
      (task ? projects.find((item) => item.id === task.projectId) : null) ??
      (entry ? projects.find((item) => item.id === entry.projectId) : null) ??
      null;

    if (!teamId || !entry || !project) return;
    if (draft.taskId && !task) return;

    await agencyTimeTrackingStore.updateEntry({
      teamId,
      entryId: entry.id,
      previousEntry: entry,
      projectId: project.id,
      taskId: task?.id ?? null,
      task,
      project,
      description: draft.description,
      startAt: range.startAt,
      endAt: range.endAt,
      durationSeconds: range.durationSeconds,
      tagIds: draft.tagIds,
      isBillable: draft.isBillable,
    });
    invalidateReportsEntries(teamId);
  }

  async function duplicateEntry(entryId: string) {
    const entry = entries.find((item) => item.id === entryId);
    if (!teamId || !entry) return;
    await agencyTimeTrackingStore.duplicateEntry({ teamId, entry });
    invalidateReportsEntries(teamId);
  }

  function toggleGroupExpand(collapseKey: string) {
    setExpandedGroupKeys((current) => {
      const next = new Set(current);
      if (next.has(collapseKey)) next.delete(collapseKey);
      else next.add(collapseKey);
      return next;
    });
  }

  function toggleEntrySelected(entryIds: string[]) {
    setSelectedEntryIds((current) => {
      const next = new Set(current);
      const allSelected = entryIds.every((entryId) => current.has(entryId));
      for (const entryId of entryIds) {
        if (allSelected) next.delete(entryId);
        else next.add(entryId);
      }
      return next;
    });
  }

  function toggleDayBulkEdit(dateKey: string) {
    setBulkEditDayKey((current) => {
      if (current === dateKey) {
        setSelectedEntryIds(new Set());
        setBulkFieldEditOpen(false);
        return null;
      }
      setSelectedEntryIds(new Set());
      setBulkFieldEditOpen(false);
      setBulkDraft({
        projectId: "",
        taskId: "",
        description: "",
        tagIds: [],
        isBillable: null,
      });
      return dateKey;
    });
  }

  async function deleteSelected(entryIds: string[]) {
    if (entryIds.length === 0) return;
    await deleteGroupEntries(entryIds);
    setSelectedEntryIds((current) => {
      const next = new Set(current);
      for (const entryId of entryIds) next.delete(entryId);
      return next;
    });
    setBulkFieldEditOpen(false);
  }

  async function markSelectedAsWaste(entryIds: string[]) {
    if (!teamId || entryIds.length === 0 || wastePending) return;

    setWastePending(true);
    try {
      await saveBulkPatch(entryIds, { isWaste: true });
      toast.success(
        entryIds.length === 1 ? "Marked as waste" : `Marked ${entryIds.length} entries as waste`,
      );
    } catch (error) {
      toast.error("Couldn't mark as waste", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setWastePending(false);
    }
  }

  async function toggleEntryWaste(entryId: string) {
    if (!teamId || wastePending) return;
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;
    const nextIsWaste = entry.isWaste !== true;
    await saveBulkPatch([entryId], { isWaste: nextIsWaste });
    toast.success(nextIsWaste ? "Marked as waste" : "Unmarked as waste");
  }

  async function saveBulkPatch(
    entryIds: string[],
    patch: {
      projectId?: string;
      taskId?: string | null;
      description?: string;
      tagIds?: string[];
      isBillable?: boolean;
      isWaste?: boolean;
    },
  ) {
    if (!teamId || entryIds.length === 0 || Object.keys(patch).length === 0) return;
    await agencyTimeTrackingStore.updateEntriesBulk({
      teamId,
      entryIds,
      previousEntries: entries.filter((entry) => entryIds.includes(entry.id)),
      patch,
    });
    invalidateReportsEntries(teamId);
  }

  async function applyBulkPatch() {
    if (selectedEntryIds.size === 0) return;
    const patch: {
      projectId?: string;
      taskId?: string | null;
      description?: string;
      tagIds?: string[];
      isBillable?: boolean;
    } = {};
    if (bulkDraft.projectId) patch.projectId = bulkDraft.projectId;
    if (bulkDraft.taskId) patch.taskId = bulkDraft.taskId;
    if (bulkDraft.description.trim()) patch.description = bulkDraft.description.trim();
    if (bulkDraft.tagIds.length > 0) patch.tagIds = bulkDraft.tagIds;
    if (bulkDraft.isBillable !== null) patch.isBillable = bulkDraft.isBillable;
    if (Object.keys(patch).length === 0) return;
    await saveBulkPatch([...selectedEntryIds], patch);
    setSelectedEntryIds(new Set());
    setBulkFieldEditOpen(false);
    setBulkEditDayKey(null);
  }

  function createTag(name: string) {
    if (!teamId || tagCreatePending) return;
    setTagCreatePending(true);
    void createAgencyTag(teamId, name)
      .then((created) => {
        setBulkDraft((current) => ({
          ...current,
          tagIds: [...new Set([...current.tagIds, created.id])],
        }));
      })
      .finally(() => setTagCreatePending(false));
  }

  return {
    teamId,
    title: copy.title,
    description: copy.description,
    entriesEmpty: entries.length === 0,
    weekGroups,
    projects,
    tasks,
    tags,
    tagCreatePending,
    expandedGroupKeys,
    isTimerMutationPending,
    deletingEntryIds,
    updatingEntryIds,
    duplicatingEntryIds,
    selectedEntryIds,
    bulkEditDayKey,
    bulkFieldEditOpen,
    bulkDraft,
    wastePending,
    prefersReducedMotion,
    onToggleGroupExpand: toggleGroupExpand,
    onRestart: (group) => void restartEntry(group),
    onDeleteGroup: (entryIds) => void deleteGroupEntries(entryIds),
    onDeleteEntry: (entryId) => void deleteEntry(entryId),
    onDuplicate: (entryId) => void duplicateEntry(entryId),
    onToggleWaste: (entryId) => void toggleEntryWaste(entryId),
    onSaveEdit: saveEdit,
    onBulkPatch: saveBulkPatch,
    onBulkDraftChange: (patch) => setBulkDraft((current) => ({ ...current, ...patch })),
    onToggleEntrySelected: toggleEntrySelected,
    onToggleDayBulkEdit: toggleDayBulkEdit,
    onToggleBulkFieldEdit: () => setBulkFieldEditOpen((current) => !current),
    onDeleteSelected: (entryIds) => void deleteSelected(entryIds),
    onMarkSelectedAsWaste: (entryIds) => void markSelectedAsWaste(entryIds),
    onApplyBulk: () => void applyBulkPatch(),
    onCreateTag: createTag,
    onClose: () => onOpenChange(false),
  };
}
