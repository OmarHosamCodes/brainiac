import { useAgencyMiniTimer } from "@/features/time-tracking/hooks/use-agency-mini-timer";

import { AgencyMiniTimerView } from "@/features/time-tracking/agency-mini-timer-view";

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
