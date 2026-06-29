import { useAgencyMiniTimer } from "@/lib/agency/work/hooks/use-agency-mini-timer";

import { AgencyMiniTimerView } from "@/components/agency/work/task-list/agency-mini-timer-view";

type AgencyMiniTimerContainerProps = {
  teamId: string;
  taskId: string;
  projectId?: string;
  taskTitle?: string;
  projectName?: string;
  variant?: "default" | "compact";
};

export function AgencyMiniTimerContainer(props: AgencyMiniTimerContainerProps) {
  const view = useAgencyMiniTimer(props);
  return <AgencyMiniTimerView view={view} />;
}
