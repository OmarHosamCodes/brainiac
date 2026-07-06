import { History, Plus } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { AgencyDashboardCommandBar } from "@/components/agency/agency-dashboard-command-bar";
import { AgencyListFilterCommandBar } from "@/components/agency/agency-list-filter-command-bar";
import { AgencyProjectCreateDialog } from "@/components/agency/agency-project-create-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgencyListFiltersApplied } from "@/lib/agency/use-agency-list-filters";
import { useAgencyListFilters } from "@/lib/agency/use-agency-list-filters";
import type { AgencyTimeRangeFilters } from "@/lib/agency/use-agency-time-range-filters";
import { useAgencyTimeRangeFilters } from "@/lib/agency/use-agency-time-range-filters";
import type { AgencySegmentId } from "@/lib/agency-segments";
import {
  selectIsClientMutationPending,
  useAgencyOpsStore,
} from "@/stores/agency-ops";

export type AgencySegmentSurfaceFilters =
  | { kind: "timeRange"; applied: AgencyTimeRangeFilters }
  | { kind: "list"; applied: AgencyListFiltersApplied }
  | { kind: "none"; applied: null };

const AgencySegmentFiltersContext = createContext<AgencySegmentSurfaceFilters>({
  kind: "none",
  applied: null,
});

export function useAgencySegmentSurfaceFilters() {
  return useContext(AgencySegmentFiltersContext);
}

type AgencySegmentFiltersRootProps = {
  segment: AgencySegmentId;
  teamId: string;
  selectedProjectId: string;
  reportMode: string | null;
  searchParams: URLSearchParams;
  children: ReactNode;
};

function commandBarVisible(
  segment: AgencySegmentId,
  selectedProjectId: string,
  reportMode: string | null,
): boolean {
  if (segment === "work" || segment === "management") return false;
  if (segment === "projects" && selectedProjectId) return false;
  if (segment === "reports" && reportMode === "create") return false;
  return segment === "dashboard" || segment === "reports" || segment === "clients" || segment === "projects";
}

function CommandBarSkeleton() {
  return <Skeleton className="h-[4.25rem] w-full rounded-2xl" />;
}

function DashboardFiltersRoot({
  teamId,
  showBar,
  children,
}: {
  teamId: string;
  showBar: boolean;
  children: ReactNode;
}) {
  const timeRange = useAgencyTimeRangeFilters({ teamId, includeClientFilter: true });

  return (
    <AgencySegmentFiltersContext.Provider
      value={{ kind: "timeRange", applied: timeRange.applied }}
    >
      <div className="space-y-4">
        {showBar ? (
          timeRange.isLoading ? (
            <CommandBarSkeleton />
          ) : (
            <AgencyDashboardCommandBar {...timeRange.barProps} />
          )
        ) : null}
        {children}
      </div>
    </AgencySegmentFiltersContext.Provider>
  );
}

function ReportsFiltersRoot({
  teamId,
  showBar,
  searchParams,
  children,
}: {
  teamId: string;
  showBar: boolean;
  searchParams: URLSearchParams;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const timeRange = useAgencyTimeRangeFilters({
    teamId,
    includeClientFilter: true,
    fetchEntries: true,
  });

  function openReportCreator() {
    const next = new URLSearchParams(searchParams);
    next.set("section", "reports");
    next.set("report", "create");
    next.set("from", timeRange.applied.range.from);
    next.set("to", timeRange.applied.range.to);
    if (timeRange.applied.clientId) next.set("client", timeRange.applied.clientId);
    else next.delete("client");
    if (timeRange.applied.projectId) next.set("project", timeRange.applied.projectId);
    else next.delete("project");
    if (timeRange.applied.memberUserId) next.set("member", timeRange.applied.memberUserId);
    else next.delete("member");
    navigate(`/agency?${next.toString()}`);
  }

  return (
    <AgencySegmentFiltersContext.Provider
      value={{ kind: "timeRange", applied: timeRange.applied }}
    >
      <div className="space-y-4">
        {showBar ? (
          timeRange.isLoading ? (
            <CommandBarSkeleton />
          ) : (
            <AgencyDashboardCommandBar
              {...timeRange.barProps}
              trailingActions={
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={timeRange.entriesCount === 0 || timeRange.entriesFetching}
                    onClick={openReportCreator}
                  >
                    Create report
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="px-2.5"
                    aria-label="Report history"
                    title="Report history"
                  >
                    <History />
                  </Button>
                </>
              }
            />
          )
        ) : null}
        {children}
      </div>
    </AgencySegmentFiltersContext.Provider>
  );
}

const AgencyClientsActionsContext = createContext<{ openNewClient: () => void }>({
  openNewClient: () => {},
});

export function useAgencyClientsActions() {
  return useContext(AgencyClientsActionsContext);
}

function ClientsFiltersRoot({
  teamId,
  showBar,
  children,
}: {
  teamId: string;
  showBar: boolean;
  children: ReactNode;
}) {
  const agencyOps = useAgencyOpsStore();
  const isClientMutationPending = useAgencyOpsStore(selectIsClientMutationPending);
  const listFilters = useAgencyListFilters({ teamId });
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");

  async function createClient() {
    const name = newClientName.trim();
    if (!name || !teamId) return;
    setNewClientName("");
    setNewClientOpen(false);
    await agencyOps.createClient({ teamId, name });
  }

  return (
    <AgencySegmentFiltersContext.Provider
      value={{ kind: "list", applied: listFilters.applied }}
    >
      <AgencyClientsActionsContext.Provider value={{ openNewClient: () => setNewClientOpen(true) }}>
        <div className="space-y-4">
          {showBar ? (
            listFilters.isLoading ? (
              <CommandBarSkeleton />
            ) : (
              <AgencyListFilterCommandBar
                {...listFilters.barProps}
                searchPlaceholder="Filter clients"
                trailingActions={
                  <Popover open={newClientOpen} onOpenChange={setNewClientOpen}>
                    <PopoverTrigger asChild>
                      <Button size="sm" disabled={!teamId}>
                        <Plus />
                        New client
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 space-y-2 p-3">
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          void createClient();
                        }}
                      >
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                          New client
                        </p>
                        <Input
                          value={newClientName}
                          onChange={(event) => setNewClientName(event.target.value)}
                          placeholder="Client name"
                          className="mt-2"
                          autoFocus
                        />
                        <Button
                          type="submit"
                          size="sm"
                          className="mt-2 w-full"
                          disabled={!newClientName.trim() || isClientMutationPending}
                        >
                          Create
                        </Button>
                      </form>
                    </PopoverContent>
                  </Popover>
                }
              />
            )
          ) : null}
          {children}
        </div>
      </AgencyClientsActionsContext.Provider>
    </AgencySegmentFiltersContext.Provider>
  );
}

const AgencyProjectsActionsContext = createContext<{ openNewProject: () => void }>({
  openNewProject: () => {},
});

export function useAgencyProjectsActions() {
  return useContext(AgencyProjectsActionsContext);
}

function ProjectsFiltersRoot({
  teamId,
  showBar,
  children,
}: {
  teamId: string;
  showBar: boolean;
  children: ReactNode;
}) {
  const listFilters = useAgencyListFilters({ teamId });
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  return (
    <AgencySegmentFiltersContext.Provider
      value={{ kind: "list", applied: listFilters.applied }}
    >
      <AgencyProjectsActionsContext.Provider value={{ openNewProject: () => setNewProjectOpen(true) }}>
        <div className="space-y-4">
          {showBar ? (
            listFilters.isLoading ? (
              <CommandBarSkeleton />
            ) : (
              <AgencyListFilterCommandBar
                {...listFilters.barProps}
                searchPlaceholder="Search projects"
                trailingActions={
                  <Button
                    size="sm"
                    disabled={!teamId || listFilters.clients.length === 0}
                    onClick={() => setNewProjectOpen(true)}
                  >
                    <Plus />
                    New project
                  </Button>
                }
              />
            )
          ) : null}
          <AgencyProjectCreateDialog
            open={newProjectOpen}
            onOpenChange={setNewProjectOpen}
            teamId={teamId}
            clients={listFilters.clients}
          />
          {children}
        </div>
      </AgencyProjectsActionsContext.Provider>
    </AgencySegmentFiltersContext.Provider>
  );
}

function NoFiltersRoot({ children }: { children: ReactNode }) {
  return (
    <AgencySegmentFiltersContext.Provider value={{ kind: "none", applied: null }}>
      {children}
    </AgencySegmentFiltersContext.Provider>
  );
}

export function AgencySegmentFiltersRoot({
  segment,
  teamId,
  selectedProjectId,
  reportMode,
  searchParams,
  children,
}: AgencySegmentFiltersRootProps) {
  const showBar = commandBarVisible(segment, selectedProjectId, reportMode);

  switch (segment) {
    case "dashboard":
      return (
        <DashboardFiltersRoot teamId={teamId} showBar={showBar}>
          {children}
        </DashboardFiltersRoot>
      );
    case "reports":
      return (
        <ReportsFiltersRoot teamId={teamId} showBar={showBar} searchParams={searchParams}>
          {children}
        </ReportsFiltersRoot>
      );
    case "clients":
      return (
        <ClientsFiltersRoot teamId={teamId} showBar={showBar}>
          {children}
        </ClientsFiltersRoot>
      );
    case "projects":
      return (
        <ProjectsFiltersRoot teamId={teamId} showBar={showBar}>
          {children}
        </ProjectsFiltersRoot>
      );
    default:
      return <NoFiltersRoot>{children}</NoFiltersRoot>;
  }
}
