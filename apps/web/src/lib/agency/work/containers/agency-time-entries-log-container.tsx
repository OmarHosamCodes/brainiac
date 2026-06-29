import { useAgencyTimeEntriesLog } from "@/lib/agency/work/hooks/use-agency-time-entries-log";

import { AgencyTimeEntriesLogView } from "@/components/agency/work/time-entries/agency-time-entries-log-view";

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
