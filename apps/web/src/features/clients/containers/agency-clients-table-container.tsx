import type { AgencyListFiltersApplied } from "@/features/shared/use-agency-list-filters";

import { AgencyClientsTableView } from "../agency-clients-table-view";
import { useAgencyClientsTable } from "../hooks/use-agency-clients-table";

type AgencyClientsTableContainerProps = {
  teamId: string;
  filters: AgencyListFiltersApplied;
  onSelect: (clientId: string) => void;
};

export function AgencyClientsTableContainer({
  teamId,
  filters,
  onSelect,
}: AgencyClientsTableContainerProps) {
  const viewModel = useAgencyClientsTable({ teamId, filters });
  return (
    <AgencyClientsTableView
      viewModel={viewModel}
      searchQuery={filters.filterTerm}
      teamId={teamId}
      onSelect={onSelect}
    />
  );
}
