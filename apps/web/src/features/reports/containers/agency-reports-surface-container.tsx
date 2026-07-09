import type { AgencyTimeRangeFilters } from "@/features/shared/use-agency-time-range-filters";
import { useAgencyReportsSurface } from "../hooks/use-agency-reports-surface";
import { AgencyReportsSurfaceView } from "../agency-reports-surface-view";

export type AgencyReportsSurfaceContainerProps = {
  teamId: string;
  filters: AgencyTimeRangeFilters;
};

export function AgencyReportsSurfaceContainer({
  teamId,
  filters,
}: AgencyReportsSurfaceContainerProps) {
  const vm = useAgencyReportsSurface({ teamId, filters });
  return <AgencyReportsSurfaceView vm={vm} />;
}
