import { useAgencyTaskThread } from "@/lib/agency/work/hooks/use-agency-task-thread";
import type { AgencyTaskProject } from "@/lib/schemas/agency-work";

import { AgencyTaskThreadView } from "@/components/agency/work/task-thread/agency-task-thread-view";

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
  return <AgencyTaskThreadView view={view} />;
}
