import { AlertTriangle, Building2, FolderKanban, Plus } from "lucide-react";

import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import { AgencyProjectsVirtualTable } from "@/features/projects/agency-projects-virtual-table";
import { agencyEmptyPanelClass, agencyErrorPanelClass } from "@/features/shared/agency-ui";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { type AgencyProjectsTableViewModel } from "./hooks/use-agency-projects-table";

type AgencyProjectsTableViewProps = {
  viewModel: AgencyProjectsTableViewModel;
  searchQuery: string;
  onSelect: (projectId: string) => void;
};

export function AgencyProjectsTableView({
  viewModel,
  searchQuery,
  onSelect,
}: AgencyProjectsTableViewProps) {
  const {
    openNewProject,
    filteredProjects,
    hoursThisWeekByProject,
    budgetsByProject,
    budgetPctFor,
    budgetToneFor,
    isLoading,
    isError,
    error,
    clients,
    projects,
    refetchProjects,
  } = viewModel;

  if (isLoading) {
    return (
      <div className="agency-projects overflow-hidden rounded-2xl border border-default bg-default">
        {[1, 2, 3, 4, 5, 6].map((rowIndex) => (
          <div key={rowIndex} className="border-b border-default px-4 py-4 last:border-b-0">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className={agencyErrorPanelClass} role="alert">
        <AlertTriangle className="mx-auto size-5 text-error" />
        <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load projects.</p>
        <p className="mt-1 text-xs text-muted">{getErrorMessage(error, "Try refreshing.")}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={refetchProjects}>
          Retry
        </Button>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className={agencyEmptyPanelClass}>
        <Building2 className="mx-auto size-6 text-muted" />
        <p className="mt-3 text-sm font-bold text-highlighted">No clients yet.</p>
        <p className="mt-1 text-xs text-muted">
          Add a client first, then their projects show up here.
        </p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className={agencyEmptyPanelClass}>
        <FolderKanban className="mx-auto size-6 text-muted" />
        <p className="mt-3 text-sm font-bold text-highlighted">No projects yet.</p>
        <p className="mt-1 text-xs text-muted">
          Create your first project to start tracking time and budgets.
        </p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={openNewProject}>
          <Plus />
          New project
        </Button>
      </div>
    );
  }

  if (filteredProjects.length === 0) {
    return (
      <div className="rounded-2xl border border-default bg-default p-8 text-center">
        <p className="text-sm font-bold text-highlighted">No projects match.</p>
        <p className="mt-1 text-xs text-muted">Try a different search.</p>
      </div>
    );
  }

  return (
    <div className="agency-projects">
      <AgencyProjectsVirtualTable
        projects={filteredProjects}
        hoursThisWeekByProject={hoursThisWeekByProject}
        budgetsByProject={budgetsByProject}
        budgetPctFor={budgetPctFor}
        budgetToneFor={budgetToneFor}
        searchQuery={searchQuery}
        onSelect={onSelect}
      />
    </div>
  );
}
