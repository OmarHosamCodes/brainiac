import { AgencyTimeSummaryView } from "../agency-time-summary-view";
import { useAgencyTimeSummary } from "../hooks/use-agency-time-summary";
export function AgencyTimeSummaryContainer({ teamId }: { teamId: string }) {
  const viewModel = useAgencyTimeSummary({ teamId });
  return <AgencyTimeSummaryView {...viewModel} />;
}
