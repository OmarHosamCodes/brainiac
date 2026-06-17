import { MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AgencyTaskChooser } from "@/components/agency/agency-task-chooser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useAgencyActiveTimerQuery,
  useAgencyProjectTasksQuery,
  useAgencyProjectsQuery,
  type AgencyProjectTaskStatus,
} from "@/hooks/use-agency-queries";
import { agencyFocusRingClass, agencyMetricClass, agencyTimeTrackerBarClass } from "@/lib/utils/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";
import {
  selectIsTimerMutationPending,
  useAgencyTimeTrackingStore,
} from "@/stores/agency-time-tracking";

type AgencyTimeTrackerProps = {
  teamId: string;
};

const OPEN_TASK_STATUSES: AgencyProjectTaskStatus[] = ["open", "in_progress"];

export function AgencyTimeTracker({ teamId }: AgencyTimeTrackerProps) {
  const agencyTimeTrackingStore = useAgencyTimeTrackingStore();
  const isTimerMutationPending = useAgencyTimeTrackingStore(selectIsTimerMutationPending);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const tickerHandle = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(tickerHandle);
  }, []);

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const tasksQuery = useAgencyProjectTasksQuery(teamId, { statuses: OPEN_TASK_STATUSES });
  const activeTimerQuery = useAgencyActiveTimerQuery(teamId);

  const projects = projectsQuery.data?.items ?? [];
  const tasks = tasksQuery.data?.items ?? [];
  const activeTimer = activeTimerQuery.data?.timer ?? null;
  const trackerDraft = teamId ? agencyTimeTrackingStore.getDraft(teamId) : null;

  const selectedTaskId = trackerDraft?.taskId ?? "";
  const timerDescription = trackerDraft?.description ?? "";

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const selectedProject = selectedTask
    ? (projects.find((project) => project.id === selectedTask.projectId) ?? null)
    : null;

  useEffect(() => {
    if (!teamId) return;
    agencyTimeTrackingStore.ensureTrackerDraft(teamId);
  }, [teamId, agencyTimeTrackingStore]);

  useEffect(() => {
    if (!teamId) return;
    agencyTimeTrackingStore.syncDraftFromActiveTimer(teamId, activeTimer);
  }, [teamId, activeTimer, agencyTimeTrackingStore]);

  const elapsedSeconds = useMemo(() => {
    if (!activeTimer) return 0;
    const startedAt = new Date(activeTimer.startedAt).getTime();
    if (Number.isNaN(startedAt)) return 0;
    return Math.max(0, Math.floor((now - startedAt) / 1_000));
  }, [activeTimer, now]);

  const canStartTimer = Boolean(teamId && selectedTask && selectedProject && !activeTimer);
  const canStopTimer = Boolean(activeTimer);

  const timerValidationHint = useMemo(() => {
    if (activeTimer ? canStopTimer : canStartTimer) return "";
    if (!activeTimer && !selectedTask) return "Select a task to start this timer.";
    return "";
  }, [activeTimer, canStartTimer, canStopTimer, selectedTask]);

  async function startTimer() {
    if (!teamId || !selectedProject || !selectedTask) return;

    await agencyTimeTrackingStore.startTimer({
      teamId,
      project: selectedProject,
      task: selectedTask,
      description: timerDescription,
    });
  }

  async function stopTimer(discard = false) {
    if (!teamId || !activeTimer || (!discard && !canStopTimer)) return;

    await agencyTimeTrackingStore.stopTimer({
      teamId,
      activeTimer,
      description: timerDescription,
      discard,
    });
  }

  return (
    <div className={agencyTimeTrackerBarClass}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={timerDescription}
            onChange={(e) =>
              teamId && agencyTimeTrackingStore.setTrackerDescription(teamId, e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && canStartTimer) {
                e.preventDefault();
                void startTimer();
              }
            }}
            placeholder="What are you working on?"
            className="min-w-0 w-full flex-1 basis-full sm:basis-48 sm:w-auto"
            disabled={isTimerMutationPending || !teamId}
          />

          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-0 sm:w-auto sm:flex-nowrap">
            <AgencyTaskChooser
              value={selectedTaskId}
              onValueChange={(value) =>
                teamId && agencyTimeTrackingStore.setTrackerTaskId(teamId, value || "")
              }
              projects={projects}
              tasks={tasks}
              placeholder="+ Task"
              className="w-auto max-w-44 shrink-0"
              loading={projectsQuery.isPending || tasksQuery.isPending}
              disabled={
                !teamId ||
                projectsQuery.isPending ||
                tasksQuery.isPending ||
                Boolean(activeTimer)
              }
            />

            {activeTimer ? (
              <span
                className={cn(
                  "shrink-0 rounded-md bg-primary/10 px-3 py-1.5 text-base font-bold",
                  agencyMetricClass,
                  "text-primary",
                )}
                aria-live="polite"
                aria-atomic="true"
              >
                {formatDuration(elapsedSeconds)}
              </span>
            ) : null}

            {activeTimer ? (
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0 rounded-md font-bold"
                disabled={!canStopTimer || isTimerMutationPending}
                onClick={() => void stopTimer()}
              >
                {isTimerMutationPending ? "…" : "Stop"}
              </Button>
            ) : (
              <Button
                size="sm"
                className="shrink-0 font-bold"
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
                    className={cn("max-sm:min-h-11 max-sm:min-w-11", agencyFocusRingClass)}
                    aria-label="Timer options"
                  >
                    <MoreVertical />
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
        </div>

        {timerValidationHint ? (
          <p className="text-xs text-warning">{timerValidationHint}</p>
        ) : null}
      </div>
    </div>
  );
}
