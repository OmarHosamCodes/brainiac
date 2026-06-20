import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, MoreVertical } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AgencyTimeEntryDayGroup } from "@/components/agency/agency-time-entry-day-group";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useAgencyProjectTasksQuery,
  useAgencyProjectsQuery,
  useAgencyTimeEntriesQuery,
  type AgencyProjectTaskStatus,
} from "@/lib/queries/agency";
import {
  agencyLabelClass,
  agencyTimeFooterMetricClass,
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

type AgencyTimeEntriesLogProps = {
  teamId: string;
  className?: string;
};

const OPEN_TASK_STATUSES: AgencyProjectTaskStatus[] = ["open", "in_progress", "done", "archived"];
const DEFAULT_PAGE_SIZE = 50;

export function AgencyTimeEntriesLog({ teamId, className }: AgencyTimeEntriesLogProps) {
  const agencyTimeTrackingStore = useAgencyTimeTrackingStore();
  const deletingEntryIds = useAgencyTimeTrackingStore((s) => s.deletingEntryIds);
  const updatingEntryIds = useAgencyTimeTrackingStore((s) => s.updatingEntryIds);
  const isTimerMutationPending = useAgencyTimeTrackingStore(selectIsTimerMutationPending);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

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
    setEditingEntryId(null);
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
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-default px-4 py-2">
          <span className="sr-only">Time totals</span>
          <div className="flex items-center gap-4">
            <div>
              <p className={agencyLabelClass}>Today</p>
              <p className={agencyTimeFooterMetricClass}>{formatDuration(todaySeconds, "short")}</p>
            </div>
            <div className="h-6 w-px bg-default" aria-hidden />
            <div>
              <p className={agencyLabelClass}>Week total</p>
              <p className={agencyTimeFooterMetricClass}>
                {formatDuration(weekSummary?.totalSeconds ?? 0, "clock")}
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {logRefreshing ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                Syncing
              </span>
            ) : null}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Log options">
                  <MoreVertical className="size-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 space-y-2 p-3">
                <p className="text-xs font-semibold text-muted">Page size</p>
                <div className="flex flex-wrap gap-1">
                  {[20, 50, 100].map((size) => (
                    <Button
                      key={size}
                      variant={pageSize === size ? "secondary" : "ghost"}
                      size="sm"
                      className="rounded-full font-mono tabular-nums"
                      onClick={() => {
                        setPageSize(size);
                        setPage(1);
                      }}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
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

      <div className="min-h-0 flex-1 overflow-y-auto">
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
              editingEntryId={editingEntryId}
              isTimerMutationPending={isTimerMutationPending}
              deletingEntryIds={deletingEntryIds}
              updatingEntryIds={updatingEntryIds}
              onToggleGroupExpand={toggleGroupExpand}
              onEditEntry={setEditingEntryId}
              onCancelEdit={() => setEditingEntryId(null)}
              onRestart={restartEntry}
              onDeleteGroup={deleteGroupEntries}
              onDeleteEntry={deleteEntry}
              onSaveEdit={saveEdit}
            />
          ))
        )}
      </div>

      {entries.length > 0 && maxPage > 1 ? (
        <div className={agencyTimeWeekFooterClass}>
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(Math.max(1, page - 1))}
          >
            <ChevronLeft />
            Previous
          </Button>
          <p className="font-mono text-xs font-semibold tabular-nums text-muted">
            Page {page} / {maxPage}
          </p>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= maxPage}
            onClick={() => setPage(Math.min(maxPage, page + 1))}
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
