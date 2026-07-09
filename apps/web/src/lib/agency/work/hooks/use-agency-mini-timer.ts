import { useCallback, useMemo } from "react";

import { useAgencyElapsedTimer } from "@/lib/agency/work/hooks/use-agency-elapsed-timer";
import {
  canStartAgencyTimer,
  canStopAgencyTimer,
  resolveAgencyTimerTaskRef,
} from "@/lib/agency/work/timer-validation";
import { useAgencyActiveTimerQuery } from "@/lib/queries/agency";
import {
  selectIsTimerMutationPending,
  useAgencyTimeTrackingStore,
  useTrackerDraft,
} from "@/stores/agency-time-tracking";

type UseAgencyMiniTimerOptions = {
  teamId: string;
  taskId: string;
  projectId?: string;
  taskTitle?: string;
  projectName?: string;
  variant?: "default" | "compact";
};

export type AgencyMiniTimerViewModel = {
  variant: "default" | "compact";
  isRunningForThisTask: boolean;
  elapsedLabel: string;
  disabled: boolean;
  isTimerMutationPending: boolean;
  onToggle: () => void;
};

export function useAgencyMiniTimer({
  teamId,
  taskId,
  projectId,
  taskTitle,
  projectName,
  variant = "default",
}: UseAgencyMiniTimerOptions): AgencyMiniTimerViewModel {
  const agencyTimeTrackingStore = useAgencyTimeTrackingStore();
  const isTimerMutationPending = useAgencyTimeTrackingStore(selectIsTimerMutationPending);

  const activeTimerQuery = useAgencyActiveTimerQuery(teamId);
  const activeTimer = activeTimerQuery.data?.timer ?? null;
  const activeTimerTeamId = activeTimer?.teamId ?? teamId;
  const trackerDraft = useTrackerDraft(activeTimerTeamId);
  const isRunningForThisTask = activeTimer?.taskId === taskId && activeTimer.teamId === teamId;

  const elapsedLabel =
    useAgencyElapsedTimer({
      startedAt: isRunningForThisTask ? activeTimer?.startedAt : null,
      enabled: isRunningForThisTask,
    }) ?? "0:00";

  const project = useMemo(
    () => (projectId ? { id: projectId, name: projectName ?? "" } : null),
    [projectId, projectName],
  );
  const task = useMemo(
    () => (taskId ? { id: taskId, title: taskTitle ?? "" } : null),
    [taskId, taskTitle],
  );

  const activeDescription = trackerDraft?.description ?? activeTimer?.description ?? "";
  const activeSelectedTaskId = trackerDraft?.taskId?.trim() || undefined;
  const activeDraftTask =
    !activeTimer?.taskId && activeSelectedTaskId ? { id: activeSelectedTaskId, title: "" } : null;

  const canStart = canStartAgencyTimer({
    activeTimer,
    project,
    description: activeDescription,
    selectedTask: activeDraftTask,
  });
  const canStop = canStopAgencyTimer({
    activeTimer,
    description: activeDescription,
    selectedTask:
      activeDraftTask ??
      resolveAgencyTimerTaskRef({
        activeTimer,
        selectedTaskTitle: isRunningForThisTask ? taskTitle : undefined,
        catalogTasks:
          activeTimer?.taskId && activeTimer.taskTitle
            ? [{ id: activeTimer.taskId, title: activeTimer.taskTitle }]
            : isRunningForThisTask && task
              ? [task]
              : [],
      }),
  });

  const disabled =
    !projectId ||
    !taskId ||
    isTimerMutationPending ||
    (isRunningForThisTask ? !canStop : !canStart);

  const onToggle = useCallback(() => {
    if (!teamId || !projectId || !taskId || disabled) return;

    if (isRunningForThisTask && activeTimer) {
      void agencyTimeTrackingStore.stopTimer({
        teamId,
        activeTimer,
        description: activeDescription,
        task:
          !activeTimer.taskId && activeSelectedTaskId
            ? { id: activeSelectedTaskId, title: taskTitle ?? "" }
            : null,
      });
      return;
    }

    void agencyTimeTrackingStore.startTimer({
      teamId,
      project: { id: projectId, name: projectName ?? "" },
      task: { id: taskId, title: taskTitle ?? "" },
      description: "",
      successDescription: "Timer started for this task.",
    });
  }, [
    activeDescription,
    activeSelectedTaskId,
    activeTimer,
    agencyTimeTrackingStore,
    disabled,
    isRunningForThisTask,
    projectId,
    projectName,
    taskId,
    taskTitle,
    teamId,
  ]);

  return {
    variant,
    isRunningForThisTask,
    elapsedLabel,
    disabled,
    isTimerMutationPending,
    onToggle,
  };
}
