import { useSearchParams } from "@/lib/navigation";

import { AgencyReportsSurface } from "@/features/reports/agency-reports-surface";
import {
  AgencySegmentFiltersRoot,
  useAgencySegmentSurfaceFilters,
} from "@/features/shared/agency-segment-filters";
import { useTeamStore } from "@/features/team/team-store";

function AgencyReportsBody({ teamId }: { teamId: string }) {
  const filters = useAgencySegmentSurfaceFilters();
  if (filters.kind !== "timeRange") return null;
  return <AgencyReportsSurface teamId={teamId} filters={filters.applied} />;
}

export function AgencyReportsPage() {
  const teamId = useTeamStore((s) => s.selectedTeamId);
  const [searchParams] = useSearchParams();

  return (
    <AgencySegmentFiltersRoot segment="reports" teamId={teamId} searchParams={searchParams}>
      <AgencyReportsBody teamId={teamId} />
    </AgencySegmentFiltersRoot>
  );
}
