import {
  type AgencyTaskRowProps,
  useAgencyTaskRow,
} from "@/features/task-management/hooks/use-agency-task-row";
import { AgencyTaskRowView } from "@/features/task-management/task-list/agency-task-row-view";
import { AgencyMiniTimerContainer } from "@/features/time-tracking/containers/agency-mini-timer-container";

export function AgencyTaskRow(props: AgencyTaskRowProps) {
  const viewModel = useAgencyTaskRow(props);
  const miniTimer = viewModel.readOnly ? null : (
    <AgencyMiniTimerContainer
      variant="compact"
      teamId={viewModel.teamId}
      taskId={viewModel.task.id}
      projectId={viewModel.task.projectId}
      taskTitle={viewModel.task.title}
      projectName={viewModel.projectName}
    />
  );
  return <AgencyTaskRowView viewModel={viewModel} miniTimer={miniTimer} />;
}
