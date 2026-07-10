import { useAgencyWorkSurfaceTaskTableRow } from "@/features/task-management/work-surface/hooks/use-agency-work-surface-task-table-row";
import type { AgencyWorkSurfaceTaskTableRowProps } from "@/features/task-management/work-surface/agency-work-surface-task-table-row-model";
import { AgencyWorkSurfaceTaskTableRowView } from "@/features/task-management/work-surface/agency-work-surface-task-table-row-view";
import { AgencyMiniTimerContainer } from "@/features/time-tracking/containers/agency-mini-timer-container";

export function AgencyWorkSurfaceTaskTableRow(props: AgencyWorkSurfaceTaskTableRowProps) {
  const viewModel = useAgencyWorkSurfaceTaskTableRow(props);
  const project = viewModel.projects.find((entry) => entry.id === viewModel.task.projectId);
  const canTrack =
    viewModel.variant === "active" &&
    !viewModel.task.isWaste &&
    viewModel.task.status !== "archived" &&
    Boolean(project);
  const miniTimer = canTrack ? (
    <AgencyMiniTimerContainer
      variant="compact"
      teamId={viewModel.teamId}
      taskId={viewModel.task.id}
      projectId={viewModel.task.projectId}
      taskTitle={viewModel.task.title}
      projectName={project?.name ?? "Project"}
    />
  ) : null;
  return <AgencyWorkSurfaceTaskTableRowView viewModel={viewModel} miniTimer={miniTimer} />;
}
