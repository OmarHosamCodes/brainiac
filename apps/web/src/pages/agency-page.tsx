import { useQuery } from "@tanstack/react-query";
import { Download, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { AgencyBillingSurface } from "@/components/agency/agency-billing-surface";
import { AgencyClientsSurface } from "@/components/agency/agency-clients-surface";
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
import { AgencyResourcingSurface } from "@/components/agency/agency-resourcing-surface";
import { AgencySegmentBar } from "@/components/agency/agency-segment-bar";
import { AgencySettingsSurface } from "@/components/agency/agency-settings-surface";
import { AgencyTopBarNav } from "@/components/agency/agency-top-bar-nav";
import { AgencyWorkSurface } from "@/components/agency/agency-work-surface";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAppShellActionsSlot,
  useAppShellContextSlot,
  useAppShellPageTitle,
} from "@/hooks/use-app-shell";
import { useAgencyLiveSync } from "@/hooks/use-agency-live-sync";
import { useBilling } from "@/hooks/use-billing";
import { useCurrentAgencyTeam } from "@/hooks/use-persistent-timer";
import { AGENCY_SEGMENTS, type AgencySegmentId } from "@/lib/agency-segments";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import {
  shellActionsSlotClass,
  shellContextSlotClass,
  shellPageBodyClass,
  shellPageClass,
  shellPageIntroClass,
} from "@/lib/utils/app-shell-ui";

function isAgencySegmentId(value: string | null): value is AgencySegmentId {
  return AGENCY_SEGMENTS.some((entry) => entry.id === value);
}

function panelIdFor(segmentId: AgencySegmentId) {
  return `agency-panel-${segmentId}`;
}

const panelClass = "min-h-0 flex-1 overflow-y-auto overscroll-contain";

export function AgencyPage() {
  useAppShellContextSlot();
  useAppShellActionsSlot();

  const session = authClient.useSession();
  const authEnabled = Boolean(session.data?.user);

  const { limits, billingQuery } = useBilling();
  const agencyEnabled = Boolean(limits.agencyOps);

  const teamsQuery = useQuery({
    ...orpc.team.list.queryOptions(),
    enabled: authEnabled,
  } as Parameters<typeof useQuery>[0]);

  const teams = (teamsQuery.data as { items: Array<{ id: string; name: string }> } | undefined)?.items ?? [];

  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const sectionParam = searchParams.get("section");
  const segment: AgencySegmentId = isAgencySegmentId(sectionParam) ? sectionParam : "work";

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

  function handleSegmentChange(nextSegment: AgencySegmentId) {
    const next = new URLSearchParams(searchParams);
    next.set("section", nextSegment);
    if (nextSegment !== "projects") {
      next.delete("project");
    }
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

  const agencyLiveTeamId = agencyEnabled && selectedTeamId ? selectedTeamId : "";
  const { connectionState } = useAgencyLiveSync(agencyLiveTeamId);

  const isInitialLoading = billingQuery.isPending || teamsQuery.isPending;

  function openProject(projectId: string) {
    const next = new URLSearchParams(searchParams);
    next.set("section", "projects");
    next.set("project", projectId);
    setSearchParams(next);
  }

  function closeProject() {
    const next = new URLSearchParams(searchParams);
    next.delete("project");
    setSearchParams(next);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-default text-default">
      <div className={shellContextSlotClass}>
        <AgencyTopBarNav
          segment={segment}
          teamId={selectedTeamId}
          teams={teams}
          connectionState={connectionState}
          onSegmentChange={handleSegmentChange}
          onTeamIdChange={setSelectedTeamId}
        />
      </div>

      <div className={shellActionsSlotClass}>
        {segment === "projects" && !selectedProjectId ? (
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
      </div>

      <main className={shellPageClass}>
        {isInitialLoading ? (
          <div className="space-y-4 pt-4">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-6 w-2/3 rounded-lg" />
            <Skeleton className="h-64 w-full rounded-[32px]" />
          </div>
        ) : !agencyEnabled ? (
          <AgencyProUpsell />
        ) : teams.length === 0 ? (
          <AgencyPlaceholderSurface
            icon="i-lucide-users"
            title="No team yet"
            body="Create a team in your workspace to start using agency tools."
            hints={["Open Dashboard and create or join a team from the team panel."]}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <AgencySegmentBar segment={segment} onSegmentChange={handleSegmentChange} />

            <div className={shellPageBodyClass}>
              {segment !== "settings" ? (
                <p className={shellPageIntroClass}>{currentSegment.subtitle}</p>
              ) : null}

              <div
                id={panelIdFor(segment)}
                className={panelClass}
                role="tabpanel"
                aria-labelledby={`agency-tab-${segment}`}
              >
                {segment === "work" ? (
                  <AgencyWorkSurface teamId={selectedTeamId} onSelectProject={openProject} />
                ) : null}

                {segment === "projects" ? (
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
                ) : null}

                {segment === "clients" ? (
                  <AgencyClientsSurface teamId={selectedTeamId} />
                ) : null}

                {segment === "reports" ? (
                  <AgencyReportsSurface
                    ref={reportsSurfaceRef}
                    teamId={selectedTeamId}
                    hideToolbarExport
                    onExportStateChange={setReportsExportState}
                  />
                ) : null}

                {segment === "resourcing" ? (
                  <AgencyResourcingSurface
                    teamId={selectedTeamId}
                    onSegmentChange={(next) => handleSegmentChange(next as AgencySegmentId)}
                  />
                ) : null}

                {segment === "billing" ? (
                  <AgencyBillingSurface teamId={selectedTeamId} />
                ) : null}

                {segment === "settings" ? (
                  <AgencySettingsSurface teamId={selectedTeamId} />
                ) : null}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
