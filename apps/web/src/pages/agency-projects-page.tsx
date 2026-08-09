import { useNavigate, useSearchParams } from "@/lib/navigation";

import { AgencyProjectsTable } from "@/features/projects/agency-projects-table";
import {
  AgencySegmentFiltersRoot,
  useAgencySegmentSurfaceFilters,
} from "@/features/shared/agency-segment-filters";
import { agencyProjectHref } from "@/features/shared/agency-segments";
import { useTeamStore } from "@/features/team/team-store";

function AgencyProjectsBody({ teamId }: { teamId: string }) {
  const navigate = useNavigate();
  const filters = useAgencySegmentSurfaceFilters();
  if (filters.kind !== "list") return null;

  return (
    <AgencyProjectsTable
      teamId={teamId}
      filters={filters.applied}
      onSelect={(projectId) => navigate(agencyProjectHref(projectId))}
    />
  );
}

export function AgencyProjectsPage() {
  const teamId = useTeamStore((s) => s.selectedTeamId);
  const [searchParams] = useSearchParams();

  return (
    <AgencySegmentFiltersRoot segment="projects" teamId={teamId} searchParams={searchParams}>
      <AgencyProjectsBody teamId={teamId} />
    </AgencySegmentFiltersRoot>
  );
}
