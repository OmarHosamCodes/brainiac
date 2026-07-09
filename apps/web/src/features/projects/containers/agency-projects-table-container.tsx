import { useAgencyProjectsTable } from "../hooks/use-agency-projects-table";
import { AgencyProjectsTableView } from "../agency-projects-table-view";
import type { AgencyListFiltersApplied } from "@/features/shared/use-agency-list-filters";

type AgencyProjectsTableContainerProps = {
  teamId: string;
  filters: AgencyListFiltersApplied;
  onSelect: (projectId: string) => void;
};

export function AgencyProjectsTableContainer({
  teamId,
  filters,
  onSelect,
}: AgencyProjectsTableContainerProps) {
  const viewModel = useAgencyProjectsTable({ teamId, filters });
  return (
    <AgencyProjectsTableView
      viewModel={viewModel}
      searchQuery={filters.filterTerm}
      onSelect={onSelect}
    />
  );
}
