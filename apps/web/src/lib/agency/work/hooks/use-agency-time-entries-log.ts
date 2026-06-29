import { useEffect, useMemo, useRef } from "react";

import {
  useAgencyTimeEntriesLogStore,
} from "@/stores/agency-time-entries-log";
import type { AgencyProject, AgencyProjectTask } from "@/lib/schemas/agency-work";
import {
  useAgencyProjectTasksQuery,
  useAgencyProjectsQuery,
  useAgencyTimeEntriesQuery,
  type AgencyProjectTaskStatus,
} from "@/lib/queries/agency";
import { getLocalWeekStartKey, todayLocalDateKey } from "@/lib/utils/format-agency-day-label";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { groupEntriesByWeek, type CollapsedEntryGroup } from "@/lib/utils/group-time-entries";
import {
  draftToIsoRange,
  validateTimeEntryDraft,
  type TimeEntryDraft,
} from "@/lib/schemas/agency-time-entry";
import {
  selectIsTimerMutationPending,
  useAgencyTimeTrackingStore,
} from "@/stores/agency-time-tracking";

const OPEN_TASK_STATUSES: AgencyProjectTaskStatus[] = ["open", "in_progress", "done", "archived"];
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const HIGHLIGHT_CLEAR_MS = 2_500;

type UseAgencyTimeEntriesLogOptions = {
  teamId: string;
  className?: string;
};

export type AgencyTimeEntriesLogViewModel = {
  teamId: string;
  className?: string;
  logQueryError: string | null;
  onRetry: () => void;
  isLoading: boolean;
  entriesEmpty: boolean;
  weekGroups: ReturnType<typeof groupEntriesByWeek>;
  projects: AgencyProject[];
  tasks: AgencyProjectTask[];
  expandedGroupKeys: Set<string>;
  isTimerMutationPending: boolean;
  deletingEntryIds: string[];
  updatingEntryIds: string[];
  highlightedEntryId: string | null;
  onToggleGroupExpand: (collapseKey: string) => void;
  onRestart: (group: CollapsedEntryGroup) => void;
  onDeleteGroup: (entryIds: string[]) => void;
  onDeleteEntry: (entryId: string) => void;
  onSaveEdit: (entryId: string, draft: TimeEntryDraft) => Promise<void>;
  onRequestOpenTaskChooser: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  showPagination: boolean;
  page: number;
  maxPage: number;
  rangeStart: number;
  rangeEnd: number;
  totalEntries: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPageSizeChange: (size: number) => void;
};

export function useAgencyTimeEntriesLog({
  teamId,
  className,
}: UseAgencyTimeEntriesLogOptions): AgencyTimeEntriesLogViewModel {
  const agencyTimeTrackingStore = useAgencyTimeTrackingStore();
  const deletingEntryIds = useAgencyTimeTrackingStore((s) => s.deletingEntryIds);
  const updatingEntryIds = useAgencyTimeTrackingStore((s) => s.updatingEntryIds);
  const isTimerMutationPending = useAgencyTimeTrackingStore(selectIsTimerMutationPending);
  const lastHighlightedEntryId = useAgencyTimeTrackingStore((s) => s.lastHighlightedEntryId);
  const clearHighlightedEntry = useAgencyTimeTrackingStore((s) => s.clearHighlightedEntry);
  const requestOpenTaskChooser = useAgencyTimeTrackingStore((s) => s.requestOpenTaskChooser);

  const page = useAgencyTimeEntriesLogStore((s) => s.page);
  const pageSize = useAgencyTimeEntriesLogStore((s) => s.pageSize);
  const expandedGroupKeys = useAgencyTimeEntriesLogStore((s) => s.expandedGroupKeys);
  const setPage = useAgencyTimeEntriesLogStore((s) => s.setPage);
  const setPageSize = useAgencyTimeEntriesLogStore((s) => s.setPageSize);
  const toggleGroupExpand = useAgencyTimeEntriesLogStore((s) => s.toggleGroupExpand);
  const resetForTeam = useAgencyTimeEntriesLogStore((s) => s.resetForTeam);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const entriesQuery = useAgencyTimeEntriesQuery(teamId, page, pageSize);
  const projectsQuery = useAgencyProjectsQuery(teamId);
  const tasksQuery = useAgencyProjectTasksQuery(teamId, { statuses: OPEN_TASK_STATUSES });
  const entries = entriesQuery.data?.items ?? [];
  const totalEntries = entriesQuery.data?.total ?? 0;
  const projects = projectsQuery.data?.items ?? [];
  const tasks = tasksQuery.data?.items ?? [];
  const weekSummary = entriesQuery.data?.weekSummary ?? null;

  const weekGroups = useMemo(() => {
    const groups = groupEntriesByWeek(entries);
    const currentWeekStart = getLocalWeekStartKey(todayLocalDateKey());
    const apiWeekTotal = weekSummary?.totalSeconds;

    if (apiWeekTotal === undefined) return groups;

    return groups.map((week) =>
      week.weekStartKey === currentWeekStart
        ? { ...week, totalSeconds: apiWeekTotal }
        : week,
    );
  }, [entries, weekSummary?.totalSeconds]);

  const maxPage = useMemo(() => {
    if (pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(totalEntries / pageSize));
  }, [pageSize, totalEntries]);

  const rangeStart = totalEntries === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalEntries);

  useEffect(() => {
    if (page > maxPage) setPage(maxPage);
  }, [maxPage, page, setPage]);

  useEffect(() => {
    resetForTeam();
  }, [teamId, resetForTeam]);

  useEffect(() => {
    if (!lastHighlightedEntryId) return;

    const row = scrollContainerRef.current?.querySelector(
      `[data-entry-id="${lastHighlightedEntryId}"]`,
    );
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    const clearHandle = setTimeout(() => {
      clearHighlightedEntry();
    }, HIGHLIGHT_CLEAR_MS);

    return () => clearTimeout(clearHandle);
  }, [lastHighlightedEntryId, clearHighlightedEntry, entries]);

  const logQueryError = entriesQuery.error ?? projectsQuery.error ?? null;

  async function deleteEntry(entryId: string) {
    const entry = entries.find((item) => item.id === entryId);
    if (!teamId || !entry) return;
    await agencyTimeTrackingStore.deleteEntries({ teamId, entries: [entry] });
  }

  async function deleteGroupEntries(entryIds: string[]) {
    const selectedEntries = entries.filter((entry) => entryIds.includes(entry.id));
    if (!teamId || selectedEntries.length === 0) return;
    await agencyTimeTrackingStore.deleteEntries({ teamId, entries: selectedEntries });
  }

  async function restartEntry(group: CollapsedEntryGroup) {
    const project = projects.find((projectEntry) => projectEntry.id === group.projectId);
    if (!teamId || !project || !group.taskId) return;

    await agencyTimeTrackingStore.restartEntry({
      teamId,
      project,
      task: { id: group.taskId, title: group.taskTitle },
      description: group.description,
    });
  }

  async function saveEdit(entryId: string, draft: TimeEntryDraft) {
    const validationError = validateTimeEntryDraft(draft);
    if (validationError) return;

    const range = draftToIsoRange(draft);
    if ("error" in range) return;

    const entry = entries.find((item) => item.id === entryId);
    const task = tasks.find((item) => item.id === draft.taskId);
    const project = task ? projects.find((item) => item.id === task.projectId) : null;

    if (!teamId || !entry || !task || !project) return;

    await agencyTimeTrackingStore.updateEntry({
      teamId,
      entryId,
      projectId: project.id,
      taskId: task.id,
      task,
      project,
      description: draft.description,
      startAt: range.startAt,
      endAt: range.endAt,
      durationSeconds: range.durationSeconds,
    });
  }

  return {
    teamId,
    className,
    logQueryError: logQueryError ? getErrorMessage(logQueryError, "Refresh and try again.") : null,
    onRetry: () => void entriesQuery.refetch(),
    isLoading: entriesQuery.isPending && entries.length === 0,
    entriesEmpty: entries.length === 0,
    weekGroups,
    projects,
    tasks,
    expandedGroupKeys,
    isTimerMutationPending,
    deletingEntryIds,
    updatingEntryIds,
    highlightedEntryId: lastHighlightedEntryId,
    onToggleGroupExpand: toggleGroupExpand,
    onRestart: (group) => void restartEntry(group),
    onDeleteGroup: (entryIds) => void deleteGroupEntries(entryIds),
    onDeleteEntry: (entryId) => void deleteEntry(entryId),
    onSaveEdit: saveEdit,
    onRequestOpenTaskChooser: requestOpenTaskChooser,
    scrollContainerRef,
    showPagination: totalEntries > pageSize,
    page,
    maxPage,
    rangeStart,
    rangeEnd,
    totalEntries,
    pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    onPreviousPage: () => setPage(Math.max(1, page - 1)),
    onNextPage: () => setPage(Math.min(maxPage, page + 1)),
    onPageSizeChange: setPageSize,
  };
}
