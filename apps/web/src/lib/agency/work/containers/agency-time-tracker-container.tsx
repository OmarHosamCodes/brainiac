import { useAgencyTimeTracker } from "@/lib/agency/work/hooks/use-agency-time-tracker";

import { AgencyTimeTrackerView } from "@/components/agency/work/time-entries/agency-time-tracker-view";

type AgencyTimeTrackerContainerProps = {
  teamId: string;
};

export function AgencyTimeTrackerContainer({ teamId }: AgencyTimeTrackerContainerProps) {
  const view = useAgencyTimeTracker({ teamId });
  return <AgencyTimeTrackerView view={view} />;
}
