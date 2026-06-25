import { MoreVertical, Trash2, Zap } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";

import { AgencyTaskChooser } from "@/components/agency/agency-task-chooser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useAgencyActiveTimerQuery,
  useAgencyProjectTasksQuery,
  useAgencyProjectsQuery,
  useAgencyTimeEntriesQuery,
  type AgencyProjectTaskStatus,
} from "@/lib/queries/agency";
import {
  agencyFocusRingClass,
  agencyLabelClass,
  agencyMetricClass,
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
  const setTrackerDescription = useAgencyTimeTrackingStore((s) => s.setTrackerDescription);
  const setTrackerTaskId = useAgencyTimeTrackingStore((s) => s.setTrackerTaskId);
  const ensureTrackerDraft = useAgencyTimeTrackingStore((s) => s.ensureTrackerDraft);
  const syncDraftFromActiveTimer = useAgencyTimeTrackingStore((s) => s.syncDraftFromActiveTimer);
  const startTimerAction = useAgencyTimeTrackingStore((s) => s.startTimer);
  const stopTimerAction = useAgencyTimeTrackingStore((s) => s.stopTimer);
  const isTimerMutationPending = useAgencyTimeTrackingStore(selectIsTimerMutationPending);

  const [taskChooserOpen, setTaskChooserOpen] = useState(false);

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const tasksQuery = useAgencyProjectTasksQuery(teamId, { statuses: OPEN_TASK_STATUSES });
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
    ? (projects.find((project) => project.id === selectedTask.projectId) ?? null)
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

  const canStartTimer = Boolean(teamId && !activeTimer);
  const canStopTimer = Boolean(
    activeTimer && descriptionTrimmed && (activeTimerHasTask || selectedTask),
  );
  const startedAtReference = activeTimer ? formatStartedAtReference(activeTimer.startedAt) : "";
  const descriptionSuggestions = useMemo(() => {
    const entries = recentEntriesQuery.data?.items ?? [];
    const normalizedQuery = normalizeSuggestionText(timerDescription);
    const seen = new Set<string>();

    return entries
      .map((entry) => {
        const description = entry.description.trim();
        const taskId = entry.taskId ?? "";
        const taskTitle = entry.taskTitle ?? "";
        const searchable = normalizeSuggestionText(`${description} ${taskTitle}`);
        const startsWithQuery = normalizedQuery ? searchable.startsWith(normalizedQuery) : false;
        const includesQuery = normalizedQuery ? searchable.includes(normalizedQuery) : false;
        return {
          description,
          taskId,
          taskTitle,
          projectName: entry.projectName,
          score: startsWithQuery ? 3 : includesQuery ? 2 : normalizedQuery ? 0 : 1,
        };
      })
      .filter((entry) => {
        if (!entry.description || !entry.taskId || entry.score <= 0) return false;
        const key = `${normalizeSuggestionText(entry.description)}||${entry.taskId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, TRACKER_SUGGESTION_LIMIT);
  }, [recentEntriesQuery.data?.items, timerDescription]);

  const timerValidationHint = useMemo(() => {
    if (activeTimer) {
      if (!descriptionTrimmed) return "Add a description before stopping this timer.";
      if (!activeTimerHasTask && !selectedTask) return "Choose a task before stopping this timer.";
    }
    if (!taskChooserOpen) return "";
    if (!activeTimer && !selectedTask) return "Choose a task before starting this timer.";
    return "";
  }, [activeTimer, activeTimerHasTask, descriptionTrimmed, selectedTask, taskChooserOpen]);

  useEffect(() => {
    if (selectedTaskId || activeTimerHasTask) {
      setTaskChooserOpen(false);
    }
  }, [activeTimerHasTask, selectedTaskId]);

  useEffect(() => {
    setTaskChooserOpen(false);
  }, [teamId]);

  function revealTaskChooser() {
    setTaskChooserOpen(true);
  }

  async function startTimer() {
    if (!teamId || activeTimer) return;
    if (!selectedProject || !selectedTask) {
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
      if (descriptionTrimmed && !activeTimerHasTask && !selectedTask) revealTaskChooser();
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

  const taskChooserLabel = activeTimer?.taskTitle ?? selectedTask?.title ?? "Choose task";

  return (
    <div className={agencyTimeTrackerBarClass}>
      <div className="flex min-w-0 items-center gap-3 overflow-x-auto">
        <div className="min-w-56 flex-1">
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
            className="h-9 min-w-0 border-0 bg-transparent px-0 text-sm shadow-none placeholder:text-muted focus-visible:ring-0"
            disabled={isTimerMutationPending || !teamId}
          />
          {descriptionSuggestions.length > 0 ? (
            <div
              className="mt-1 flex max-w-full gap-1.5 overflow-x-auto pb-0.5"
              aria-label="Description matches"
            >
              {descriptionSuggestions.map((suggestion) => (
                <button
                  key={`${suggestion.taskId}-${suggestion.description}`}
                  type="button"
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary",
                    "transition-colors hover:bg-primary/15",
                    agencyFocusRingClass,
                  )}
                  onClick={() => {
                    setTrackerDescription(teamId, suggestion.description);
                    setTrackerTaskId(teamId, suggestion.taskId);
                  }}
                >
                  <Zap className="size-3" aria-hidden />
                  <span className="max-w-40 truncate">{suggestion.description}</span>
                  <span className="text-primary/70">
                    {suggestion.taskTitle || suggestion.projectName}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
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
              !activeTimerHasTask && !selectedTask && taskChooserOpen && "text-warning",
            )}
            loading={projectsQuery.isPending || tasksQuery.isPending}
            disabled={!teamId || projectsQuery.isPending || tasksQuery.isPending}
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

        {activeTimer ? <TrackerElapsedTimer startedAt={activeTimer.startedAt} /> : null}

        {!activeTimer ? (
          <span className={cn("shrink-0 text-sm font-semibold", agencyMetricClass)}>00:00:00</span>
        ) : null}

        {activeTimer ? (
          <Button
            variant="destructive"
            size="sm"
            className={cn(
              "h-9 min-w-24 shrink-0 rounded-none px-5 font-bold uppercase tracking-normal",
              !canStopTimer && "ring-2 ring-warning/30 ring-offset-1 ring-offset-background",
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
            className="h-9 min-w-24 shrink-0 rounded-none px-5 font-bold uppercase tracking-normal"
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

      {startedAtReference ? (
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
          <span className={agencyLabelClass}>Start time</span>
          <span className={cn(agencyMetricClass, "text-[11px]")}>{startedAtReference}</span>
        </div>
      ) : null}

      {timerValidationHint ? (
        <p className="mt-1 text-xs text-warning">{timerValidationHint}</p>
      ) : null}
    </div>
  );
}
