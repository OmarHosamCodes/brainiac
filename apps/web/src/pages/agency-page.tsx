import { useQuery } from "@tanstack/react-query";
import { Download, FolderKanban, ListChecks, Plus, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { AgencyClientsSurface } from "@/components/agency/agency-clients-surface";
import { AgencyManagementSurface } from "@/components/agency/agency-management-surface";
import { AgencyPlaceholderSurface } from "@/components/agency/agency-placeholder-surface";
import { AgencyProUpsell } from "@/components/agency/agency-pro-upsell";
import { AgencyProjectDetail } from "@/components/agency/agency-project-detail";
import {
  AgencyProjectsTable,
  type AgencyProjectsTableHandle,
} from "@/components/agency/agency-projects-table";
import {
  AgencyReportsSurface,
  type AgencyReportsSurfaceHandle,
} from "@/components/agency/agency-reports-surface";
import { AgencySegmentBar } from "@/components/agency/agency-segment-bar";
import { AgencySettingsSurface } from "@/components/agency/agency-settings-surface";
import { AgencyTopBarNav } from "@/components/agency/agency-top-bar-nav";
import { AgencyWorkSurface } from "@/components/agency/agency-work-surface";
import { AppShellHeaderActions, AppShellHeaderContext } from "@/components/app-shell-header-slots";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAppShellActionsSlot,
  useAppShellContextSlot,
  useAppShellPageTitle,
} from "@/hooks/use-app-shell";
import { useAgencySyncStatus } from "@/hooks/use-agency-sync-status";
import { prefetchAgencyWorkQueries, useAgencyActiveTimerQuery } from "@/hooks/use-agency-queries";
import { useBilling } from "@/hooks/use-billing";
import { useCurrentAgencyTeam } from "@/hooks/use-persistent-timer";
import {
  managementPaneForLegacySection,
  type AgencyManagementPaneId,
} from "@/lib/agency-management-sections";
import {
  AGENCY_SEGMENTS,
  LEGACY_AGENCY_SEGMENT_MAP,
  isLegacyAgencySegmentId,
  type AgencySegmentId,
} from "@/lib/agency-segments";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import {
  shellContentInClass,
  shellPageBodyClass,
  shellPageClass,
  shellPageIntroClass,
  shellPanelActiveClass,
  shellPanelClass,
  shellPanelStackClass,
} from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";
import { setAgencyTimeTrackingUserId } from "@/stores/agency-time-tracking";
import { useAgencyOptimisticStore } from "@/stores/agency-optimistic";

function isAgencySegmentId(value: string | null): value is AgencySegmentId {
  return AGENCY_SEGMENTS.some((entry) => entry.id === value);
}

function panelIdFor(segmentId: AgencySegmentId) {
  return `agency-panel-${segmentId}`;
}

function animatedPanelClass(segmentId: AgencySegmentId, activeSegment: AgencySegmentId) {
  return cn(shellPanelClass, segmentId === activeSegment && shellPanelActiveClass);
}

type WorkView = "tasks" | "projects";

function AgencyWorkViewBar({
  view,
  onViewChange,
}: {
  view: WorkView;
  onViewChange: (view: WorkView) => void;
}) {
  const items = [
    { id: "tasks", label: "Tasks", icon: ListChecks },
    { id: "projects", label: "Projects", icon: FolderKanban },
  ] satisfies Array<{ id: WorkView; label: string; icon: LucideIcon }>;

  return (
    <div className="flex shrink-0 items-center gap-1 self-start rounded-full border border-default bg-elevated p-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors hover:text-highlighted",
              view === item.id ? "bg-default text-highlighted" : "text-muted",
            )}
            aria-pressed={view === item.id}
            onClick={() => onViewChange(item.id)}
          >
            <Icon className="size-3.5" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function AgencyPage() {
  useAppShellContextSlot();
  useAppShellActionsSlot();

  const session = authClient.useSession();
  const authEnabled = Boolean(session.data?.user);
  const currentUserId = session.data?.user?.id ?? "";

  const { limits, billingQuery } = useBilling();
  const agencyEnabled = Boolean(limits.agencyOps);
  const billingGatePending = billingQuery.isPending;
  const showAgencyUpsell = !billingGatePending && !agencyEnabled;

  const teamsQuery = useQuery({
    ...orpc.team.list.queryOptions(),
    enabled: authEnabled,
  } as Parameters<typeof useQuery>[0]);

  const teams =
    (teamsQuery.data as { items: Array<{ id: string; name: string }> } | undefined)?.items ?? [];

  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const sectionParam = searchParams.get("section");
  const segment: AgencySegmentId = isAgencySegmentId(sectionParam)
    ? sectionParam
    : isLegacyAgencySegmentId(sectionParam)
      ? LEGACY_AGENCY_SEGMENT_MAP[sectionParam]
      : "work";

  const currentSegment = useMemo(
    () => AGENCY_SEGMENTS.find((entry) => entry.id === segment) ?? AGENCY_SEGMENTS[0]!,
    [segment],
  );

  useAppShellPageTitle(currentSegment.label);

  const projectsTableRef = useRef<AgencyProjectsTableHandle | null>(null);
  const reportsSurfaceRef = useRef<AgencyReportsSurfaceHandle | null>(null);
  const [reportsExportState, setReportsExportState] = useState({
    canExport: false,
    isExporting: false,
  });

  const selectedProjectId =
    typeof searchParams.get("project") === "string" ? searchParams.get("project")! : "";
  const workView: WorkView =
    selectedProjectId || searchParams.get("view") === "projects" ? "projects" : "tasks";

  useEffect(() => {
    if (!isLegacyAgencySegmentId(sectionParam)) return;
    const next = new URLSearchParams(searchParams);
    next.set("section", LEGACY_AGENCY_SEGMENT_MAP[sectionParam]);
    if (sectionParam === "projects") {
      next.set("view", "projects");
    }
    const managementPane: AgencyManagementPaneId | null =
      managementPaneForLegacySection(sectionParam);
    if (managementPane) {
      next.set("manage", managementPane);
    }
    setSearchParams(next, { replace: true });
  }, [sectionParam, searchParams, setSearchParams]);

  function handleSegmentChange(nextSegment: AgencySegmentId) {
    const next = new URLSearchParams(searchParams);
    next.set("section", nextSegment);
    next.delete("pane");
    if (nextSegment !== "work") {
      next.delete("project");
      next.delete("view");
    }
    if (nextSegment !== "management") {
      next.delete("manage");
    }
    setSearchParams(next, { replace: true });
  }

  function handleWorkViewChange(nextView: WorkView) {
    const next = new URLSearchParams(searchParams);
    next.set("section", "work");
    if (nextView === "projects") {
      next.set("view", "projects");
    } else {
      next.delete("view");
      next.delete("project");
    }
    next.delete("manage");
    next.delete("pane");
    setSearchParams(next, { replace: true });
  }

  useEffect(() => {
    if (teams.length === 0) {
      setSelectedTeamId("");
      return;
    }
    const stillExists = teams.some((team) => team.id === selectedTeamId);
    if (!stillExists) {
      setSelectedTeamId(teams[0]?.id ?? "");
    }
  }, [teams, selectedTeamId]);

  const { setCurrentAgencyTeamId } = useCurrentAgencyTeam();

  useEffect(() => {
    setCurrentAgencyTeamId(selectedTeamId || null);
  }, [selectedTeamId, setCurrentAgencyTeamId]);

  useEffect(() => {
    setAgencyTimeTrackingUserId(currentUserId || null);
  }, [currentUserId]);

  const previousTeamIdRef = useRef<string | null>(null);
  useEffect(() => {
    const previousTeamId = previousTeamIdRef.current;
    if (previousTeamId && previousTeamId !== selectedTeamId) {
      useAgencyOptimisticStore.getState().resetTeam(previousTeamId);
    }
    previousTeamIdRef.current = selectedTeamId || null;
  }, [selectedTeamId]);

  const agencySyncTeamId = agencyEnabled && selectedTeamId ? selectedTeamId : "";
  useAgencyActiveTimerQuery(agencySyncTeamId);
  const syncState = useAgencySyncStatus(agencySyncTeamId);

  useEffect(() => {
    if (!agencyEnabled || !selectedTeamId || !currentUserId) return;
    prefetchAgencyWorkQueries(selectedTeamId, currentUserId);
  }, [agencyEnabled, selectedTeamId, currentUserId]);

  const isInitialLoading = teamsQuery.isPending;

  function openProject(projectId: string) {
    const next = new URLSearchParams(searchParams);
    next.set("section", "work");
    next.set("view", "projects");
    next.set("project", projectId);
    next.delete("manage");
    next.delete("pane");
    setSearchParams(next);
  }

  function closeProject() {
    const next = new URLSearchParams(searchParams);
    next.set("section", "work");
    next.set("view", "projects");
    next.delete("project");
    setSearchParams(next);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-default text-default">
      <AppShellHeaderContext>
        <AgencyTopBarNav
          segment={segment}
          teamId={selectedTeamId}
          teams={teams}
          syncState={syncState}
          onSegmentChange={handleSegmentChange}
          onTeamIdChange={setSelectedTeamId}
        />
      </AppShellHeaderContext>

      <AppShellHeaderActions>
        {segment === "work" && workView === "projects" && !selectedProjectId ? (
          <Button size="sm" onClick={() => projectsTableRef.current?.openNewProject()}>
            <Plus className="size-4" />
            New project
          </Button>
        ) : null}
        {segment === "reports" ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={!reportsExportState.canExport || reportsExportState.isExporting}
            onClick={() => void reportsSurfaceRef.current?.downloadCsv()}
          >
            <Download className="size-4" />
            {reportsExportState.isExporting ? "Exporting…" : "Export CSV"}
          </Button>
        ) : null}
      </AppShellHeaderActions>

      <main className={shellPageClass}>
        {isInitialLoading ? (
          <div className="space-y-4 pt-4">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-6 w-2/3 rounded-lg" />
            <Skeleton className="h-64 w-full rounded-[32px]" />
          </div>
        ) : billingGatePending ? (
          <div className="space-y-4 pt-4">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-6 w-2/3 rounded-lg" />
            <Skeleton className="h-64 w-full rounded-[32px]" />
          </div>
        ) : showAgencyUpsell ? (
          <div className={shellContentInClass}>
            <AgencyProUpsell />
          </div>
        ) : teams.length === 0 ? (
          <div className={shellContentInClass}>
            <AgencyPlaceholderSurface
              icon="i-lucide-users"
              title="No team yet"
              body="Create a team in your workspace to start using agency tools."
              hints={["Open Dashboard and create or join a team from the team panel."]}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <AgencySegmentBar segment={segment} onSegmentChange={handleSegmentChange} />

            <div className={shellPageBodyClass}>
              {segment !== "settings" ? (
                <p key={segment} className={cn(shellPageIntroClass, shellContentInClass)}>
                  {currentSegment.subtitle}
                </p>
              ) : null}

              <div
                className={shellPanelStackClass}
                role="tabpanel"
                id={panelIdFor(segment)}
                aria-labelledby={`agency-tab-${segment}`}
              >
                <div
                  className={animatedPanelClass("work", segment)}
                  aria-hidden={segment !== "work"}
                >
                  <div className="flex min-h-0 flex-1 flex-col gap-3">
                    <AgencyWorkViewBar view={workView} onViewChange={handleWorkViewChange} />
                    <div className="min-h-0 flex-1">
                      {workView === "projects" ? (
                        selectedProjectId ? (
                          <AgencyProjectDetail
                            teamId={selectedTeamId}
                            projectId={selectedProjectId}
                            onBack={closeProject}
                          />
                        ) : (
                          <AgencyProjectsTable
                            ref={projectsTableRef}
                            teamId={selectedTeamId}
                            hideToolbarActions
                            onSelect={openProject}
                          />
                        )
                      ) : (
                        <AgencyWorkSurface teamId={selectedTeamId} onSelectProject={openProject} />
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={animatedPanelClass("clients", segment)}
                  aria-hidden={segment !== "clients"}
                >
                  <AgencyClientsSurface teamId={selectedTeamId} />
                </div>

                <div
                  className={animatedPanelClass("reports", segment)}
                  aria-hidden={segment !== "reports"}
                >
                  <AgencyReportsSurface
                    ref={reportsSurfaceRef}
                    teamId={selectedTeamId}
                    hideToolbarExport
                    onExportStateChange={setReportsExportState}
                  />
                </div>

                <div
                  className={animatedPanelClass("management", segment)}
                  aria-hidden={segment !== "management"}
                >
                  <AgencyManagementSurface
                    teamId={selectedTeamId}
                    onSegmentChange={handleSegmentChange}
                  />
                </div>

                <div
                  className={animatedPanelClass("settings", segment)}
                  aria-hidden={segment !== "settings"}
                >
                  <AgencySettingsSurface teamId={selectedTeamId} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
