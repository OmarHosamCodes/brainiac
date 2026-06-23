import { MoreVertical, Trash2 } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";

import { AgencyTaskChooser } from "@/components/agency/agency-task-chooser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useAgencyActiveTimerQuery,
  useAgencyProjectTasksQuery,
  useAgencyProjectsQuery,
  type AgencyProjectTaskStatus,
} from "@/lib/queries/agency";
import {
  agencyFocusRingClass,
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
  const canStopTimer = Boolean(activeTimer && (activeTimerHasTask || selectedTask));

  const timerValidationHint = useMemo(() => {
    if (!taskChooserOpen) return "";
    if (!activeTimer && !selectedTask) return "Choose a task before starting this timer.";
    if (activeTimer && !activeTimerHasTask && !selectedTask) {
      return "Choose a task before stopping this timer.";
    }
    return "";
  }, [activeTimer, activeTimerHasTask, selectedTask, taskChooserOpen]);

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

  const taskChooserLabel = activeTimer?.taskTitle ?? selectedTask?.title ?? "Choose task";

  return (
    <div className={agencyTimeTrackerBarClass}>
      <div className="flex min-w-0 items-center gap-3 overflow-x-auto">
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
          className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm shadow-none placeholder:text-muted focus-visible:ring-0"
          disabled={isTimerMutationPending || !teamId}
        />

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
            disabled={isTimerMutationPending || !teamId}
            onClick={() => void stopTimer()}
          >
            {isTimerMutationPending ? "…" : canStopTimer ? "Stop" : "Choose task"}
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

      {timerValidationHint ? (
        <p className="mt-1 text-xs text-warning">{timerValidationHint}</p>
      ) : null}
    </div>
  );
}
