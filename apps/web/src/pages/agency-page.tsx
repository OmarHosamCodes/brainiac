import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { LogoLoader } from "@/features/app-shell/components/logo-loader";
import { AppShellPage } from "@/features/app-shell/app-shell-page";
import {
  shellContentInClass,
  shellPageBodyClass,
  shellPageClass,
  shellPageNestClass,
} from "@/features/app-shell/app-shell-ui";
import { AgencyProUpsell } from "@/features/billing/agency-pro-upsell";
import { useBilling } from "@/features/billing/billing-queries";
import { AgencyReportCreatorSurface } from "@/features/reports/creator/agency-report-creator-surface";
import { AgencyManagementSurface } from "@/features/settings/agency-management-surface";
import {
  managementPaneForLegacySection,
  type AgencyManagementPaneId,
} from "@/features/shared/agency-management-sections";
import { useAgencyActiveTimerQuery } from "@/features/shared/agency-queries";
import { AgencyPlaceholderSurface } from "@/features/shared/agency-placeholder-surface";
import { AgencySegmentFiltersRoot } from "@/features/shared/agency-segment-filters";
import {
  LEGACY_AGENCY_SEGMENT_MAP,
  agencySegmentFromSearch,
  agencySegmentLabel,
  isLegacyAgencySegmentId,
  type AgencySegmentId,
} from "@/features/shared/agency-segments";
import { AgencySegmentBody } from "@/features/shared/segment/agency-segment-body";
import { AGENCY_PAGE_SCROLL_ATTR, agencyWorkSurfaceShellClass } from "@/features/shared/agency-ui";
import { useAgencyOptimisticStore } from "@/features/shared/stores/agency-optimistic";
import { useAgencyBootGate } from "@/features/shared/use-agency-boot-gate";
import { AgencyWorkSurface } from "@/features/task-management/agency-work-surface";
import { useAgencyJourneyLiveSync } from "@/features/task-management/hooks/use-agency-journey-live-sync";
import { teamListQueryOptions } from "@/features/team/team-queries";
import { useTeamStore } from "@/features/team/team-store";
import { setAgencyTimeTrackingUserId } from "@/features/time-tracking/stores/agency-time-tracking";
import { useCurrentAgencyTeam } from "@/features/time-tracking/stores/agency-timer";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

function panelIdFor(segmentId: AgencySegmentId) {
  return `agency-panel-${segmentId}`;
}

export function AgencyPage() {
  const session = authClient.useSession();
  const authEnabled = Boolean(session.data?.user);
  const currentUserId = session.data?.user?.id ?? "";

  const { limits, billingQuery } = useBilling();
  const agencyEnabled = Boolean(limits.agencyOps);
  const billingGatePending = billingQuery.isPending;
  const showAgencyUpsell = !billingGatePending && !agencyEnabled;

  const teamsQuery = useQuery({
    ...teamListQueryOptions(),
    enabled: authEnabled,
  });

  const teams = teamsQuery.data?.items ?? [];

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const syncSelectedTeam = useTeamStore((s) => s.syncSelectedTeam);
  const sectionParam = searchParams.get("section");
  const segment: AgencySegmentId = agencySegmentFromSearch(searchParams.toString());

  const selectedProjectId =
    typeof searchParams.get("project") === "string" ? searchParams.get("project")! : "";
  const selectedClientId =
    typeof searchParams.get("client") === "string" ? searchParams.get("client")! : "";
  useEffect(() => {
    if (sectionParam === "settings") {
      const next = new URLSearchParams(searchParams);
      next.set("section", "management");
      next.set("manage", "resourcing");
      setSearchParams(next, { replace: true });
      return;
    }
    if (!isLegacyAgencySegmentId(sectionParam)) return;
    const next = new URLSearchParams(searchParams);
    next.set("section", LEGACY_AGENCY_SEGMENT_MAP[sectionParam]);
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
    if (nextSegment !== "projects") {
      next.delete("project");
    }
    if (nextSegment !== "clients") {
      next.delete("client");
    }
    if (nextSegment !== "management") {
      next.delete("manage");
    }
    if (nextSegment !== "reports") {
      next.delete("report");
    }
    setSearchParams(next, { replace: true });
  }

  useEffect(() => {
    syncSelectedTeam(teams);
  }, [teams, syncSelectedTeam]);

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
  useAgencyJourneyLiveSync({ teamId: agencySyncTeamId });

  const { isBooting } = useAgencyBootGate({
    segment,
    teamId: selectedTeamId,
    userId: currentUserId,
    agencyEnabled,
    teamsCount: teams.length,
    showAgencyUpsell,
    teamsQuery,
    billingQuery,
    searchParams,
  });

  function openProject(projectId: string) {
    const next = new URLSearchParams(searchParams);
    next.set("section", "projects");
    next.set("project", projectId);
    next.delete("client");
    next.delete("manage");
    next.delete("pane");
    setSearchParams(next);
  }

  function openClient(clientId: string) {
    const next = new URLSearchParams(searchParams);
    next.set("section", "clients");
    next.set("client", clientId);
    next.delete("project");
    next.delete("manage");
    next.delete("pane");
    setSearchParams(next);
  }

  function openMember(userId: string) {
    navigate(`/agency/members/${userId}`);
  }

  function closeProject() {
    const next = new URLSearchParams(searchParams);
    next.set("section", "projects");
    next.delete("project");
    setSearchParams(next);
  }

  function closeClient() {
    const next = new URLSearchParams(searchParams);
    next.set("section", "clients");
    next.delete("client");
    setSearchParams(next);
  }

  const isFullHeightSegment = segment === "work" || segment === "management";

  return (
    <AppShellPage>
      <div
        className={cn(
          "flex h-full min-h-0 flex-col bg-background text-foreground",
          isFullHeightSegment ? "overflow-hidden" : "overflow-y-auto",
        )}
        {...{ [AGENCY_PAGE_SCROLL_ATTR]: "" }}
      >
        <main className={isFullHeightSegment ? shellPageNestClass : shellPageClass}>
          {isBooting ? (
            <LogoLoader label="Loading agency" />
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
                hints={["Use the team control in the top bar to create or join a team."]}
              />
            </div>
          ) : (
            <div className={cn(shellPageBodyClass, isFullHeightSegment && "min-h-0 flex-1 pt-0")}>
              <div
                role="tabpanel"
                id={panelIdFor(segment)}
                aria-label={agencySegmentLabel(segment)}
                className={cn(isFullHeightSegment && "flex min-h-0 flex-1 flex-col")}
              >
                <AgencySegmentFiltersRoot
                  segment={segment}
                  teamId={selectedTeamId}
                  selectedProjectId={selectedProjectId}
                  selectedClientId={selectedClientId}
                  reportMode={searchParams.get("report")}
                  searchParams={searchParams}
                >
                  {segment === "work" ? (
                    <div className={agencyWorkSurfaceShellClass}>
                      <AgencyWorkSurface
                        teamId={selectedTeamId}
                        onSegmentChange={handleSegmentChange}
                      />
                    </div>
                  ) : null}
                  {segment === "reports" && searchParams.get("report") ? (
                    <AgencyReportCreatorSurface teamId={selectedTeamId} />
                  ) : null}
                  {segment === "management" ? (
                    <AgencyManagementSurface teamId={selectedTeamId} />
                  ) : null}
                  {segment === "dashboard" ||
                  segment === "clients" ||
                  segment === "projects" ||
                  (segment === "reports" && !searchParams.get("report")) ? (
                    <AgencySegmentBody
                      segment={segment}
                      teamId={selectedTeamId}
                      selectedProjectId={selectedProjectId}
                      selectedClientId={selectedClientId}
                      onSelectProject={openProject}
                      onSelectClient={openClient}
                      onSelectMember={openMember}
                      onCloseProject={closeProject}
                      onCloseClient={closeClient}
                    />
                  ) : null}
                </AgencySegmentFiltersRoot>
              </div>
            </div>
          )}
        </main>
      </div>
    </AppShellPage>
  );
}
