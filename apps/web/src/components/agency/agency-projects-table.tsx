import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Building2, FolderKanban, Plus, Search } from "lucide-react";
import { useImperativeHandle, useMemo, useState, forwardRef, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { AgencyMultiSelectFilter } from "@/components/agency/agency-multi-select-filter";
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
  agencyLabelClass,
} from "@/lib/utils/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { projectHueStyle } from "@/lib/utils/project-palette";
import { selectIsProjectMutationPending, useAgencyOpsStore } from "@/stores/agency-ops";

export type AgencyProjectsTableHandle = {
  openNewProject: () => void;
};

type AgencyProjectsTableProps = {
  teamId: string;
  hideToolbarActions?: boolean;
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

export const AgencyProjectsTable = forwardRef<AgencyProjectsTableHandle, AgencyProjectsTableProps>(
  function AgencyProjectsTable({ teamId, hideToolbarActions = false, onSelect }, ref) {
    const agencyOps = useAgencyOpsStore();
    const isProjectMutationPending = useAgencyOpsStore(selectIsProjectMutationPending);
    const [filterTerm, setFilterTerm] = useState("");
    const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>([]);
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [newProjectOpen, setNewProjectOpen] = useState(false);

    useImperativeHandle(ref, () => ({
      openNewProject: () => setNewProjectOpen(true),
    }));
    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectClientId, setNewProjectClientId] = useState("");

    const projectsQuery = useAgencyProjectsQuery(teamId);
    const clientsQuery = useAgencyClientsQuery(teamId);
    const entriesQuery = useAgencyTimeEntriesQuery(teamId, 1, 100);
    const tasksQuery = useAgencyProjectTasksQuery(teamId);

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

    const peopleOptions = useMemo(() => {
      const people = new Map<string, string>();
      for (const task of tasks) {
        if (task.assigneeUserId && task.assigneeName) {
          people.set(task.assigneeUserId, task.assigneeName);
        }
      }
      return Array.from(people, ([value, label]) => ({ value, label })).sort((a, b) =>
        a.label.localeCompare(b.label),
      );
    }, [tasks]);

    const clientOptions = useMemo(
      () => clients.map((client) => ({ value: client.id, label: client.name })),
      [clients],
    );
    const projectOptions = useMemo(
      () => projects.map((project) => ({ value: project.id, label: project.name })),
      [projects],
    );
    const taskOptions = useMemo(
      () => tasks.map((task) => ({ value: task.id, label: task.title })),
      [tasks],
    );

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
      const term = filterTerm.trim().toLowerCase();
      const peopleSet = new Set(selectedPeopleIds);
      const clientsSet = new Set(selectedClientIds);
      const projectsSet = new Set(selectedProjectIds);
      const tasksSet = new Set(selectedTaskIds);
      return projects.filter((project) => {
        if (term && !`${project.name} ${project.clientName}`.toLowerCase().includes(term)) {
          return false;
        }
        if (clientsSet.size > 0 && !clientsSet.has(project.clientId)) return false;
        if (projectsSet.size > 0 && !projectsSet.has(project.id)) return false;
        if (
          peopleSet.size > 0 &&
          !tasks.some(
            (task) =>
              task.projectId === project.id &&
              task.assigneeUserId &&
              peopleSet.has(task.assigneeUserId),
          )
        ) {
          return false;
        }
        if (
          tasksSet.size > 0 &&
          !tasks.some((task) => task.projectId === project.id && tasksSet.has(task.id))
        ) {
          return false;
        }
        return true;
      });
    }, [
      filterTerm,
      projects,
      selectedClientIds,
      selectedPeopleIds,
      selectedProjectIds,
      selectedTaskIds,
      tasks,
    ]);

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

    useEffect(() => {
      if (newProjectOpen && !newProjectClientId && clients[0]) {
        setNewProjectClientId(clients[0].id);
      }
    }, [newProjectOpen, newProjectClientId, clients]);

    async function createProject() {
      const name = newProjectName.trim();
      if (!name || !newProjectClientId || !teamId) return;
      const client = clients.find((c) => c.id === newProjectClientId);
      setNewProjectName("");
      setNewProjectOpen(false);
      await agencyOps.createProject({
        teamId,
        clientId: newProjectClientId,
        clientName: client?.name ?? "",
        name,
      });
    }

    const isLoading = projectsQuery.isPending || clientsQuery.isPending;
    const isError = projectsQuery.isError;

    return (
      <div className="agency-projects space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-default bg-elevated p-2">
          <div className="relative min-w-64 flex-1 md:max-w-72">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
              placeholder="Search projects"
              className="h-9 rounded-xl bg-default pl-9 text-sm"
            />
          </div>

          <AgencyMultiSelectFilter
            label="All People"
            values={selectedPeopleIds}
            options={peopleOptions}
            onValuesChange={setSelectedPeopleIds}
            disabled={tasksQuery.isPending}
          />
          <AgencyMultiSelectFilter
            label="All Clients"
            values={selectedClientIds}
            options={clientOptions}
            onValuesChange={setSelectedClientIds}
            disabled={clientsQuery.isPending}
          />
          <AgencyMultiSelectFilter
            label="All Projects"
            values={selectedProjectIds}
            options={projectOptions}
            onValuesChange={setSelectedProjectIds}
            disabled={projectsQuery.isPending}
          />
          <AgencyMultiSelectFilter
            label="All Tasks"
            values={selectedTaskIds}
            options={taskOptions}
            onValuesChange={setSelectedTaskIds}
            disabled={tasksQuery.isPending}
          />

          {!hideToolbarActions ? (
            <div className="ml-auto">
              <Popover open={newProjectOpen} onOpenChange={setNewProjectOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" disabled={!teamId || clients.length === 0}>
                    <Plus />
                    New project
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 space-y-2 p-3">
                  <form
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void createProject();
                    }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                      New project
                    </p>
                    <div>
                      <label className="text-[11px] font-bold text-muted">Client</label>
                      <select
                        value={newProjectClientId}
                        onChange={(e) => setNewProjectClientId(e.target.value)}
                        className="mt-1 h-9 w-full rounded-md border border-default bg-background px-2 text-sm"
                      >
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-muted">Name</label>
                      <Input
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Project name"
                        className="mt-1"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      className="w-full"
                      disabled={
                        !newProjectName.trim() || !newProjectClientId || isProjectMutationPending
                      }
                    >
                      Create project
                    </Button>
                  </form>
                </PopoverContent>
              </Popover>
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div className="overflow-hidden rounded-2xl border border-default bg-default">
            {[1, 2, 3, 4, 5, 6].map((rowIndex) => (
              <div key={rowIndex} className="border-b border-default px-4 py-4 last:border-b-0">
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
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
        ) : clients.length === 0 ? (
          <div className={agencyEmptyPanelClass}>
            <Building2 className="mx-auto size-6 text-muted" />
            <p className="mt-3 text-sm font-bold text-highlighted">No clients yet.</p>
            <p className="mt-1 text-xs text-muted">
              Add a client first, then their projects show up here.
            </p>
          </div>
        ) : projects.length === 0 ? (
          <div className={agencyEmptyPanelClass}>
            <FolderKanban className="mx-auto size-6 text-muted" />
            <p className="mt-3 text-sm font-bold text-highlighted">No projects yet.</p>
            <p className="mt-1 text-xs text-muted">
              Create your first project to start tracking time and budgets.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => setNewProjectOpen(true)}
            >
              <Plus />
              New project
            </Button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-default bg-default p-8 text-center">
            <p className="text-sm font-bold text-highlighted">No projects match.</p>
            <p className="mt-1 text-xs text-muted">Try a different search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-default bg-default">
            <table className="w-full min-w-[40rem] text-xs">
              <thead className="border-b border-default bg-muted">
                <tr className={agencyLabelClass}>
                  <th scope="col" className="px-4 py-2.5 font-bold">
                    Project
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-bold">
                    Client
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-bold">
                    Budget
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-bold">
                    Hours · this week
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="cursor-pointer border-b border-default last:border-b-0 transition-colors hover:bg-elevated/40"
                    tabIndex={0}
                    onClick={() => onSelect(project.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(project.id);
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="agency-projects__dot inline-block size-2 shrink-0 rounded-full"
                          aria-hidden="true"
                          style={projectHueStyle(project.id)}
                        />
                        <span className="truncate font-bold text-highlighted">{project.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted">
                      <span className="truncate">{project.clientName}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-elevated">
                          <div
                            className={[
                              "h-full rounded-full transition-[width] duration-200 ease-out",
                              budgetsByProject.get(project.id)
                                ? budgetToneFor(project.id)
                                : "bg-muted",
                            ].join(" ")}
                            style={{
                              width: budgetsByProject.get(project.id)
                                ? `${budgetPctFor(project.id)}%`
                                : "0%",
                            }}
                          />
                        </div>
                        <span
                          className={[
                            "text-[11px]",
                            budgetsByProject.get(project.id)
                              ? "font-mono tabular-nums text-muted"
                              : "text-dimmed",
                          ].join(" ")}
                        >
                          {budgetsByProject.get(project.id)
                            ? `${budgetPctFor(project.id)}%`
                            : "Not set"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={[
                          "font-mono font-bold tabular-nums",
                          (hoursThisWeekByProject.get(project.id) ?? 0) > 0
                            ? "text-highlighted"
                            : "text-dimmed",
                        ].join(" ")}
                      >
                        {formatDuration(hoursThisWeekByProject.get(project.id) ?? 0, "short")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  },
);
