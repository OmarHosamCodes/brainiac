import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertTriangle, Building2, FolderKanban, Plus } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AgencyProjectsVirtualTable } from "@/components/agency/agency-projects-virtual-table";
import { useAgencyProjectsActions } from "@/lib/agency/agency-segment-filters";
import type { AgencyListFiltersApplied } from "@/lib/agency/use-agency-list-filters";
import {
  useAgencyClientsQuery,
  useAgencyProjectTasksQuery,
  useAgencyProjectsQuery,
  useAgencyTimeEntriesQuery,
} from "@/lib/queries/agency";
import { orpc } from "@/lib/orpc";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
} from "@/lib/utils/agency-ui";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { getTaskGroupKey } from "@/lib/utils/agency-task-utils";
import { agencyListSearchMatches } from "@/lib/utils/agency-list-search";

type AgencyProjectsTableProps = {
  teamId: string;
  filters: AgencyListFiltersApplied;
  onSelect: (projectId: string) => void;
};

function getWeekStartUtc(): Date {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

export function AgencyProjectsTable({ teamId, filters, onSelect }: AgencyProjectsTableProps) {
  const { openNewProject } = useAgencyProjectsActions();

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const clientsQuery = useAgencyClientsQuery(teamId);
  const entriesQuery = useAgencyTimeEntriesQuery(teamId, 1, 100);
  const tasksQuery = useAgencyProjectTasksQuery(teamId, {
    search: filters.filterTerm.trim() || undefined,
    pageSize: 100,
  });

  const budgetsQuery = useQuery({
    ...orpc.agencyOps.budgets.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  const budgetsByProject = useMemo(() => {
    const map = new Map<string, NonNullable<typeof budgetsQuery.data>["items"][number]>();
    for (const entry of budgetsQuery.data?.items ?? []) {
      map.set(entry.projectId, entry);
    }
    return map;
  }, [budgetsQuery.data?.items]);

  const projects = projectsQuery.data?.items ?? [];
  const clients = clientsQuery.data?.items ?? [];
  const entries = entriesQuery.data?.items ?? [];
  const tasks = tasksQuery.data?.items ?? [];

  const hoursThisWeekByProject = useMemo(() => {
    const weekStartMs = getWeekStartUtc().getTime();
    const totals = new Map<string, number>();
    for (const entry of entries) {
      const startedAtMs = new Date(entry.startedAt).getTime();
      if (startedAtMs < weekStartMs) continue;
      totals.set(entry.projectId, (totals.get(entry.projectId) ?? 0) + entry.durationSeconds);
    }
    return totals;
  }, [entries]);

  const filteredProjects = useMemo(() => {
    const term = filters.filterTerm;
    const { peopleSet, clientsSet, projectsSet, tasksSet } = filters;
    return projects.filter((project) => {
      if (term && !agencyListSearchMatches(term, project.name, project.clientName)) {
        return false;
      }
      if (clientsSet.size > 0 && !clientsSet.has(project.clientId)) return false;
      if (projectsSet.size > 0 && !projectsSet.has(project.id)) return false;
      if (
        peopleSet.size > 0 &&
        !entries.some(
          (entry) => entry.projectId === project.id && peopleSet.has(entry.userId),
        )
      ) {
        return false;
      }
      if (
        tasksSet.size > 0 &&
        !tasks.some(
          (task) => task.projectId === project.id && tasksSet.has(getTaskGroupKey(task)),
        )
      ) {
        return false;
      }
      return true;
    });
  }, [entries, filters, projects, tasks]);

  function budgetPctFor(projectId: string): number {
    const budget = budgetsByProject.get(projectId);
    if (!budget) return 0;
    if (budget.hoursBudget && budget.hoursBudget > 0) {
      return Math.min(100, Math.round((budget.hoursLogged / budget.hoursBudget) * 100));
    }
    if (budget.costBudgetCents && budget.costBudgetCents > 0) {
      return Math.min(100, Math.round((budget.costLoggedCents / budget.costBudgetCents) * 100));
    }
    return 0;
  }

  function budgetToneFor(projectId: string): string {
    const pct = budgetPctFor(projectId);
    if (pct >= 100) return "bg-error";
    if (pct >= 85) return "bg-warning";
    return "bg-primary";
  }

  const isLoading = projectsQuery.isPending || clientsQuery.isPending;
  const isError = projectsQuery.isError;

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
        <p className="mt-1 text-xs text-muted">
          {getErrorMessage(projectsQuery.error, "Try refreshing.")}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => void projectsQuery.refetch()}
        >
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
        searchQuery={filters.filterTerm}
        onSelect={onSelect}
      />
    </div>
  );
}
