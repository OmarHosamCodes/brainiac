import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AgencyTimeEntryDayGroup } from "@/components/agency/agency-time-entry-day-group";
import { Button } from "@/components/ui/button";
import {
  useAgencyProjectTasksQuery,
  useAgencyProjectsQuery,
  useAgencyTimeEntriesQuery,
  type AgencyProjectTaskStatus,
} from "@/lib/queries/agency";
import {
  agencyLabelClass,
  agencyMetricClass,
  agencyTimeLogSkeletonClass,
  agencyTimeWeekFooterClass,
} from "@/lib/utils/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { todayLocalDateKey } from "@/lib/utils/format-agency-day-label";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { groupEntriesByDay, type CollapsedEntryGroup } from "@/lib/utils/group-time-entries";
import {
  draftToIsoRange,
  type TimeEntryDraft,
  validateTimeEntryDraft,
} from "@/lib/utils/time-entry-draft";
import {
  selectIsTimerMutationPending,
  useAgencyTimeTrackingStore,
} from "@/stores/agency-time-tracking";
import { cn } from "@/lib/utils";

type AgencyTimeEntriesLogProps = {
  teamId: string;
  className?: string;
};

const OPEN_TASK_STATUSES: AgencyProjectTaskStatus[] = ["open", "in_progress", "done", "archived"];
const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

export function AgencyTimeEntriesLog({ teamId, className }: AgencyTimeEntriesLogProps) {
  const agencyTimeTrackingStore = useAgencyTimeTrackingStore();
  const deletingEntryIds = useAgencyTimeTrackingStore((s) => s.deletingEntryIds);
  const updatingEntryIds = useAgencyTimeTrackingStore((s) => s.updatingEntryIds);
  const isTimerMutationPending = useAgencyTimeTrackingStore(selectIsTimerMutationPending);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());

  const entriesQuery = useAgencyTimeEntriesQuery(teamId, page, pageSize);
  const projectsQuery = useAgencyProjectsQuery(teamId);
  const tasksQuery = useAgencyProjectTasksQuery(teamId, { statuses: OPEN_TASK_STATUSES });
  const entries = entriesQuery.data?.items ?? [];
  const totalEntries = entriesQuery.data?.total ?? 0;
  const projects = projectsQuery.data?.items ?? [];
  const tasks = tasksQuery.data?.items ?? [];
  const weekSummary = entriesQuery.data?.weekSummary ?? null;

  const dayGroups = useMemo(() => groupEntriesByDay(entries), [entries]);

  const maxPage = useMemo(() => {
    if (pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(totalEntries / pageSize));
  }, [pageSize, totalEntries]);

  const rangeStart = totalEntries === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalEntries);

  const todaySeconds = useMemo(() => {
    const daily = weekSummary?.daily;
    if (!daily) return 0;
    const todayDate = todayLocalDateKey();
    return daily.find((d) => d.date === todayDate)?.totalSeconds ?? 0;
  }, [weekSummary]);

  useEffect(() => {
    if (page > maxPage) setPage(maxPage);
  }, [maxPage, page]);

  useEffect(() => {
    setPage(1);
    setExpandedGroupKeys(new Set());
  }, [teamId]);

  const logRefreshing = entriesQuery.isFetching || projectsQuery.isFetching;
  const logQueryError = entriesQuery.error ?? projectsQuery.error ?? null;

  const toggleGroupExpand = useCallback((collapseKey: string) => {
    setExpandedGroupKeys((current) => {
      const next = new Set(current);
      if (next.has(collapseKey)) next.delete(collapseKey);
      else next.add(collapseKey);
      return next;
    });
  }, []);

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

  return (
    <div className={["flex min-h-0 flex-1 flex-col", className].filter(Boolean).join(" ")}>
      {logRefreshing || entries.length > 0 || weekSummary ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-default bg-muted/55 px-4 py-3">
          <div className="text-sm font-medium text-highlighted">This week</div>

          <div className="flex items-center gap-4 text-xs text-muted">
            <span className="hidden sm:inline-flex sm:items-baseline sm:gap-1.5">
              <span className={agencyLabelClass}>Today</span>
              <span className={cn(agencyMetricClass, "text-xs")}>
                {formatDuration(todaySeconds, "short")}
              </span>
            </span>
            <span className="hidden h-4 w-px bg-default sm:block" aria-hidden />
            <span className="inline-flex items-baseline gap-1.5">
              <span className={agencyLabelClass}>Week total</span>
              <span className={cn(agencyMetricClass, "text-base font-semibold")}>
                {formatDuration(weekSummary?.totalSeconds ?? 0, "clock")}
              </span>
            </span>
          </div>
        </div>
      ) : null}

      {logQueryError ? (
        <div
          className="mx-4 mt-4 rounded-xl border border-error/30 bg-error/5 p-4 text-sm"
          role="alert"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-error" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-highlighted">Couldn't load entries</p>
              <p className="mt-1 text-muted">
                {getErrorMessage(logQueryError, "Refresh and try again.")}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => void entriesQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto">
        {entriesQuery.isPending && entries.length === 0 ? (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((rowIndex) => (
              <div key={rowIndex} className={agencyTimeLogSkeletonClass} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted">
            No entries yet. Start the timer above.
          </div>
        ) : (
          dayGroups.map((day) => (
            <AgencyTimeEntryDayGroup
              key={day.dateKey}
              day={day}
              teamId={teamId}
              projects={projects}
              tasks={tasks}
              expandedGroupKeys={expandedGroupKeys}
              isTimerMutationPending={isTimerMutationPending}
              deletingEntryIds={deletingEntryIds}
              updatingEntryIds={updatingEntryIds}
              onToggleGroupExpand={toggleGroupExpand}
              onRestart={restartEntry}
              onDeleteGroup={deleteGroupEntries}
              onDeleteEntry={deleteEntry}
              onSaveEdit={saveEdit}
            />
          ))
        )}
      </div>

      {totalEntries > pageSize ? (
        <div className={agencyTimeWeekFooterClass}>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page <= 1}
              aria-label="Previous page"
              onClick={() => setPage(Math.max(1, page - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <p className="font-mono text-xs tabular-nums text-muted">
              {rangeStart}-{rangeEnd} of {totalEntries}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page >= maxPage}
              aria-label="Next page"
              onClick={() => setPage(Math.min(maxPage, page + 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-md border border-default bg-default px-2 py-1 font-mono text-xs tabular-nums text-highlighted"
              aria-label="Entries per page"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
}
