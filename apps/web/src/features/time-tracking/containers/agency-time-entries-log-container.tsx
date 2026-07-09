import { useAgencyTimeEntriesLog } from "@/features/time-tracking/hooks/use-agency-time-entries-log";

import { AgencyTimeEntriesLogView } from "@/features/time-tracking/entries/agency-time-entries-log-view";

type AgencyTimeEntriesLogContainerProps = {
  teamId: string;
  className?: string;
};

export function AgencyTimeEntriesLogContainer({
  teamId,
  className,
}: AgencyTimeEntriesLogContainerProps) {
  const view = useAgencyTimeEntriesLog({ teamId, className });
  return <AgencyTimeEntriesLogView view={view} />;
}
