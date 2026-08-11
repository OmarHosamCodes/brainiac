import type { ReactNode } from "react";

import type { AgencyProjectTask } from "@/features/task-management/agency-work";
import type { AgencyMyTasksRailViewModel } from "@/features/task-management/hooks/use-agency-my-tasks-rail";
import { AgencyMyTasksRailRowView } from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail-row-view";
import { AgencyMiniTimerContainer } from "@/features/time-tracking/containers/agency-mini-timer-container";

type AgencyMyTasksRailRowProps = {
  task: AgencyProjectTask;
  view: AgencyMyTasksRailViewModel;
  projectName: string;
  assignedByLabel: string;
};

export function AgencyMyTasksRailRow({
  task,
  view,
  projectName,
  assignedByLabel,
}: AgencyMyTasksRailRowProps) {
  const isDone = task.viewerStatus === "done";
  const isSelected = view.selectedTaskId === task.id;
  const isTracking = view.runningTaskId === task.id;
  const pending = view.pendingTaskIds.includes(task.id) || view.deletingTaskIds.includes(task.id);

  const miniTimer: ReactNode = (
    <AgencyMiniTimerContainer
      teamId={view.teamId}
      taskId={task.id}
      projectId={task.projectId}
      taskTitle={task.title}
      projectName={projectName}
      variant="compact"
    />
  );

  return (
    <AgencyMyTasksRailRowView
      taskId={task.id}
      title={task.title}
      projectName={projectName}
      assignedByLabel={assignedByLabel}
      isDone={isDone}
      isSelected={isSelected}
      isTracking={isTracking}
      playPulse={view.justPlayedTaskId === task.id}
      completeFlash={view.justCompletedTaskId === task.id}
      createFlash={view.justCreatedTaskId === task.id}
      pending={pending}
      miniTimer={miniTimer}
      onSelect={() => view.onSelectTask(task.id)}
      onToggleComplete={() => {
        if (isDone) void view.onReopenTask(task);
        else void view.onCompleteTask(task.id);
      }}
      onDelete={() => void view.onDeleteTask(task)}
      onPlayEnter={() => view.onPlaySelected(task.id)}
    />
  );
}
