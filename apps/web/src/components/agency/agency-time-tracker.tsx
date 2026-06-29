import { History, MoreVertical, Trash2 } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";

import { AgencyTaskChooser } from "@/components/agency/agency-task-chooser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useAgencyActiveTimerQuery,
  useAgencyProjectTasksQuery,
  useAgencyProjectsQuery,
  useAgencyTimeEntriesQuery,
  type AgencyProjectTaskStatus,
} from "@/lib/queries/agency";
import {
  agencyFocusRingClass,
  agencyInputPlaceholderClass,
  agencyLabelClass,
  agencyMetricClass,
  agencyTimeSuggestionChipClass,
  agencyTimeTrackerBarClass,
} from "@/lib/utils/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";
import {
  selectIsTimerMutationPending,
  useAgencyTimeTrackingStore,
  useTrackerDraft,
} from "@/stores/agency-time-tracking";

type AgencyTimeTrackerProps = {
  teamId: string;
};

type TrackerElapsedTimerProps = {
  startedAt: string;
};

const OPEN_TASK_STATUSES: AgencyProjectTaskStatus[] = ["open", "in_progress"];
const TRACKER_SUGGESTION_LIMIT = 4;

function normalizeSuggestionText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatStartedAtReference(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  return `${date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })} ${isToday ? "Today" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

const TrackerElapsedTimer = memo(function TrackerElapsedTimer({
  startedAt,
}: TrackerElapsedTimerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const tickerHandle = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(tickerHandle);
  }, []);

  const elapsedSeconds = useMemo(() => {
    const startMs = new Date(startedAt).getTime();
    if (Number.isNaN(startMs)) return 0;
    return Math.max(0, Math.floor((now - startMs) / 1_000));
  }, [now, startedAt]);

  return (
    <span
      className={cn(
        "shrink-0 font-mono text-sm font-semibold tabular-nums text-highlighted",
        agencyMetricClass,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {formatDuration(elapsedSeconds, "clock")}
    </span>
  );
});

export function AgencyTimeTracker({ teamId }: AgencyTimeTrackerProps) {
  const setTrackerDescription = useAgencyTimeTrackingStore(
    (s) => s.setTrackerDescription,
  );
  const setTrackerTaskId = useAgencyTimeTrackingStore(
    (s) => s.setTrackerTaskId,
  );
  const ensureTrackerDraft = useAgencyTimeTrackingStore(
    (s) => s.ensureTrackerDraft,
  );
  const syncDraftFromActiveTimer = useAgencyTimeTrackingStore(
    (s) => s.syncDraftFromActiveTimer,
  );
  const startTimerAction = useAgencyTimeTrackingStore((s) => s.startTimer);
  const stopTimerAction = useAgencyTimeTrackingStore((s) => s.stopTimer);
  const isTimerMutationPending = useAgencyTimeTrackingStore(
    selectIsTimerMutationPending,
  );
  const taskChooserOpenRequest = useAgencyTimeTrackingStore(
    (s) => s.taskChooserOpenRequest,
  );

  const [taskChooserOpen, setTaskChooserOpen] = useState(false);
  const [startTaskHintVisible, setStartTaskHintVisible] = useState(false);

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const tasksQuery = useAgencyProjectTasksQuery(teamId, {
    statuses: OPEN_TASK_STATUSES,
  });
  const recentEntriesQuery = useAgencyTimeEntriesQuery(teamId, 1, 50);
  const activeTimerQuery = useAgencyActiveTimerQuery(teamId);

  const projects = projectsQuery.data?.items ?? [];
  const tasks = tasksQuery.data?.items ?? [];
  const activeTimer = activeTimerQuery.data?.timer ?? null;
  const trackerDraft = useTrackerDraft(teamId);

  const selectedTaskId = trackerDraft?.taskId ?? "";
  const timerDescription = trackerDraft?.description ?? "";

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const selectedProject = selectedTask
    ? (projects.find((project) => project.id === selectedTask.projectId) ??
      null)
    : null;
  const activeTimerHasTask = Boolean(activeTimer?.taskId);
  const descriptionTrimmed = timerDescription.trim();
  const tasksForChooser =
    activeTimer && !activeTimer.taskId
      ? tasks.filter((task) => task.projectId === activeTimer.projectId)
      : tasks;

  useEffect(() => {
    if (!teamId) return;
    ensureTrackerDraft(teamId);
  }, [teamId, ensureTrackerDraft]);

  useEffect(() => {
    if (!teamId) return;
    syncDraftFromActiveTimer(teamId, activeTimer);
  }, [teamId, activeTimer, syncDraftFromActiveTimer]);

  useEffect(() => {
    if (taskChooserOpenRequest === 0) return;
    setTaskChooserOpen(true);
  }, [taskChooserOpenRequest]);

  const canStartTimer = Boolean(teamId && !activeTimer);
  const canStopTimer = Boolean(
    activeTimer && descriptionTrimmed && (activeTimerHasTask || selectedTask),
  );

  const descriptionSuggestions = useMemo(() => {
    const entries = recentEntriesQuery.data?.items ?? [];
    const normalizedQuery = normalizeSuggestionText(timerDescription);
    const seen = new Set<string>();

    return entries
      .map((entry) => {
        const description = entry.description.trim();
        const taskId = entry.taskId ?? "";
        const taskTitle = entry.taskTitle ?? "";
        const searchable = normalizeSuggestionText(
          `${description} ${taskTitle}`,
        );
        const startsWithQuery = normalizedQuery
          ? searchable.startsWith(normalizedQuery)
          : false;
        const includesQuery = normalizedQuery
          ? searchable.includes(normalizedQuery)
          : false;
        return {
          description,
          taskId,
          taskTitle,
          projectName: entry.projectName,
          score: startsWithQuery
            ? 3
            : includesQuery
              ? 2
              : normalizedQuery
                ? 0
                : 1,
        };
      })
      .filter((entry) => {
        if (!entry.description || !entry.taskId || entry.score <= 0)
          return false;
        const key = `${normalizeSuggestionText(entry.description)}||${entry.taskId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, TRACKER_SUGGESTION_LIMIT);
  }, [recentEntriesQuery.data?.items, timerDescription]);

  useEffect(() => {
    if (selectedTaskId || activeTimerHasTask) {
      setTaskChooserOpen(false);
    }
  }, [activeTimerHasTask, selectedTaskId]);

  function revealTaskChooser() {
    setTaskChooserOpen(true);
  }

  async function startTimer() {
    if (!teamId || activeTimer) return;
    if (!selectedProject || !selectedTask) {
      setStartTaskHintVisible(true);
      revealTaskChooser();
      return;
    }

    await startTimerAction({
      teamId,
      project: selectedProject,
      task: selectedTask,
      description: timerDescription,
    });
  }

  async function stopTimer(discard = false) {
    if (!teamId || !activeTimer) return;
    if (!discard && !canStopTimer) {
      if (descriptionTrimmed && !activeTimerHasTask && !selectedTask)
        revealTaskChooser();
      return;
    }

    await stopTimerAction({
      teamId,
      activeTimer,
      description: timerDescription,
      discard,
      task:
        !activeTimerHasTask && selectedTask
          ? { id: selectedTask.id, title: selectedTask.title }
          : null,
    });
  }

  const taskChooserLabel =
    activeTimer?.taskTitle ?? selectedTask?.title ?? "Choose task";

  return (
    <div className={agencyTimeTrackerBarClass}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 flex-1">
            <Input
              value={timerDescription}
              onChange={(e) => setTrackerDescription(teamId, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canStartTimer) {
                  e.preventDefault();
                  void startTimer();
                }
              }}
              placeholder="What are you working on?"
              className={cn(
                "h-9 min-w-0 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0",
                agencyInputPlaceholderClass,
              )}
              disabled={isTimerMutationPending || !teamId}
            />
          </div>

          <span
            className="hidden h-6 w-px shrink-0 border-l border-dashed border-default lg:block"
            aria-hidden
          />

          <div className="shrink-0">
            <AgencyTaskChooser
              value={selectedTaskId}
              onValueChange={(value) => setTrackerTaskId(teamId, value || "")}
              projects={projects}
              tasks={tasksForChooser}
              placeholder={taskChooserLabel}
              className={cn(
                "h-9 w-auto max-w-44 shrink-0 border-0 bg-transparent px-2 font-normal text-secondary shadow-none hover:bg-transparent hover:text-secondary",
                !activeTimerHasTask &&
                  !selectedTask &&
                  taskChooserOpen &&
                  "text-warning",
              )}
              loading={projectsQuery.isPending || tasksQuery.isPending}
              disabled={
                !teamId || projectsQuery.isPending || tasksQuery.isPending
              }
              open={taskChooserOpen}
              contentAlign="end"
              onOpenChange={(open) => {
                setTaskChooserOpen(open);
              }}
            />
          </div>

          <span
            className="hidden h-6 w-px shrink-0 border-l border-dashed border-default md:block"
            aria-hidden
          />

          {activeTimer ? (
            <TrackerElapsedTimer startedAt={activeTimer.startedAt} />
          ) : null}

          {activeTimer ? (
            <Button
              variant="destructive"
              size="sm"
              className={cn(
                "h-9 min-w-24 shrink-0",
                !canStopTimer &&
                  "ring-2 ring-warning/30 ring-offset-1 ring-offset-background",
              )}
              disabled={isTimerMutationPending || !teamId || !canStopTimer}
              onClick={() => void stopTimer()}
            >
              {isTimerMutationPending
                ? "…"
                : canStopTimer
                  ? "Stop"
                  : descriptionTrimmed
                    ? "Choose task"
                    : "Add details"}
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-9 min-w-24 shrink-0"
              disabled={!canStartTimer || isTimerMutationPending}
              onClick={() => void startTimer()}
            >
              {isTimerMutationPending ? "…" : "Start"}
            </Button>
          )}

          {activeTimer ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("shrink-0", agencyFocusRingClass)}
                  aria-label="Timer options"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-40 p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-error"
                  onClick={() => void stopTimer(true)}
                >
                  <Trash2 />
                  Discard timer
                </Button>
              </PopoverContent>
            </Popover>
          ) : null}
        </div>

        {descriptionSuggestions.length > 0 ? (
          <div
            className="flex max-w-full flex-wrap gap-1.5"
            aria-label="Recent descriptions"
          >
            {descriptionSuggestions.map((suggestion) => (
              <button
                key={`${suggestion.taskId}-${suggestion.description}`}
                type="button"
                className={cn(
                  agencyTimeSuggestionChipClass,
                  agencyFocusRingClass,
                )}
                onClick={() => {
                  setTrackerDescription(teamId, suggestion.description);
                  setTrackerTaskId(teamId, suggestion.taskId);
                }}
              >
                <History className="size-3 shrink-0" aria-hidden />
                <span className="max-w-40 truncate">
                  {suggestion.description}
                </span>
                <span className="text-muted">
                  {suggestion.taskTitle || suggestion.projectName}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
