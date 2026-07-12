import type { AgencyTaskProject } from "@/features/task-management/agency-work";
import { useAgencyWorkSurfaceTasksBoard } from "@/features/task-management/work-surface/hooks/use-agency-work-surface-tasks-board";
import { AgencyWorkSurfaceTasksBoardView } from "@/features/task-management/work-surface/agency-work-surface-tasks-board-view";
import { AgencyMiniTimerContainer } from "@/features/time-tracking/containers/agency-mini-timer-container";

type AgencyWorkSurfaceTasksBoardContainerProps = {
  teamId: string;
  projects: AgencyTaskProject[];
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  onSelectProject: (projectId: string) => void;
};

export function AgencyWorkSurfaceTasksBoardContainer({
  teamId,
  projects,
  selectedTaskId,
  onSelectTask,
  onSelectProject,
}: AgencyWorkSurfaceTasksBoardContainerProps) {
  const view = useAgencyWorkSurfaceTasksBoard({
    teamId,
    projects,
    selectedTaskId,
    onSelectTask,
    onSelectProject,
  });

  return (
    <AgencyWorkSurfaceTasksBoardView
      view={view}
      renderCardTimer={(card) =>
        card.canTrack && view.status === "ready" ? (
          <AgencyMiniTimerContainer
            variant="compact"
            teamId={view.teamId}
            taskId={card.taskId}
            projectId={card.projectId}
            taskTitle={card.title}
            projectName={card.projectName}
          />
        ) : null
      }
    />
  );
}
