import { useAgencyTaskThread } from "@/features/task-management/hooks/use-agency-task-thread";
import { AgencyTaskThreadView } from "@/features/task-management/task-thread/agency-task-thread-view";
import type { AgencyTaskThreadHeaderAssignee } from "@/features/task-management/task-thread/agency-task-thread-header-view";

type AgencyTaskThreadContainerProps = {
  teamId: string;
  taskId: string;
  title: string;
  projectId: string;
  projectName: string | null;
  assignedToTeam: boolean;
  assignees: AgencyTaskThreadHeaderAssignee[];
  onBack: () => void;
};

export function AgencyTaskThreadContainer({
  teamId,
  taskId,
  title,
  projectId,
  projectName,
  assignedToTeam,
  assignees,
  onBack,
}: AgencyTaskThreadContainerProps) {
  const view = useAgencyTaskThread({
    teamId,
    taskId,
    title,
    projectId,
    projectName,
    assignedToTeam,
    assignees,
    onBack,
  });
  return <AgencyTaskThreadView {...view} />;
}
