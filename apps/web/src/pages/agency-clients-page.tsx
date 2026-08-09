import { useNavigate, useSearchParams } from "@/lib/navigation";

import { AgencyClientsTable } from "@/features/clients/agency-clients-table";
import {
  AgencySegmentFiltersRoot,
  useAgencySegmentSurfaceFilters,
} from "@/features/shared/agency-segment-filters";
import { agencyClientHref } from "@/features/shared/agency-segments";
import { useTeamStore } from "@/features/team/team-store";

function AgencyClientsBody({ teamId }: { teamId: string }) {
  const navigate = useNavigate();
  const filters = useAgencySegmentSurfaceFilters();
  if (filters.kind !== "list") return null;

  return (
    <AgencyClientsTable
      teamId={teamId}
      filters={filters.applied}
      onSelect={(clientId) => navigate(agencyClientHref(clientId))}
    />
  );
}

export function AgencyClientsPage() {
  const teamId = useTeamStore((s) => s.selectedTeamId);
  const [searchParams] = useSearchParams();

  return (
    <AgencySegmentFiltersRoot segment="clients" teamId={teamId} searchParams={searchParams}>
      <AgencyClientsBody teamId={teamId} />
    </AgencySegmentFiltersRoot>
  );
}
