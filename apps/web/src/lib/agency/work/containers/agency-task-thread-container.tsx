import { useAgencyTaskThread } from "@/lib/agency/work/hooks/use-agency-task-thread";
import type { AgencyTaskProject } from "@/lib/schemas/agency-work";

import { TaskThreadView } from "@/components/agency/work/task-thread/task-thread-view";

type AgencyTaskThreadContainerProps = {
  teamId: string;
  taskId: string;
  projects: AgencyTaskProject[];
  onBack: () => void;
};

export function AgencyTaskThreadContainer({
  teamId,
  taskId,
  projects,
  onBack,
}: AgencyTaskThreadContainerProps) {
  const view = useAgencyTaskThread({ teamId, taskId, projects, onBack });
  return <TaskThreadView view={view} />;
}
