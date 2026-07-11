import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { AgencyNotifications } from "@/features/notifications/agency-notifications";
import { AgencyManagementSurface } from "@/features/settings/agency-management-surface";
import { AgencyPlaceholderSurface } from "@/features/shared/agency-placeholder-surface";
import { AgencyProUpsell } from "@/features/billing/agency-pro-upsell";
import { AgencyReportCreatorSurface } from "@/features/reports/creator/agency-report-creator-surface";
import { AgencySegmentBody } from "@/features/shared/segment/agency-segment-body";
import { AgencySubtitleBreadcrumb } from "@/features/shared/agency-subtitle-breadcrumb";
import { AgencyPresenceAvatars } from "@/features/shared/live/agency-presence-avatars";
import { AgencyTeamBreadcrumb } from "@/features/shared/agency-team-breadcrumb";
import { AgencyWorkSurface } from "@/features/task-management/agency-work-surface";
import { LogoLoader } from "@/features/app-shell/components/logo-loader";
import {
  AppShellTopbarActions,
  AppShellTopbarSubtitle,
  AppShellTopbarTrailing,
} from "@/features/app-shell/app-shell-topbar";
import { AppShellPage } from "@/features/app-shell/app-shell-page";
import { AgencySegmentFiltersRoot } from "@/features/shared/agency-segment-filters";
import { useAgencySyncStatus } from "@/features/shared/agency-sync";
import { useAgencyJourneyLiveSync } from "@/features/task-management/hooks/use-agency-journey-live-sync";
import { useAgencyBootGate } from "@/features/shared/use-agency-boot-gate";
import { useAgencyActiveTimerQuery } from "@/features/shared/agency-queries";
import { useBilling } from "@/features/billing/billing-queries";
import { useCurrentAgencyTeam } from "@/features/time-tracking/stores/agency-timer";
import {
  managementPaneForLegacySection,
  type AgencyManagementPaneId,
} from "@/features/shared/agency-management-sections";
import {
  AGENCY_SEGMENTS,
  LEGACY_AGENCY_SEGMENT_MAP,
  isLegacyAgencySegmentId,
  type AgencySegmentId,
} from "@/features/shared/agency-segments";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import {
  shellContentInClass,
  shellPageBodyClass,
  shellPageClass,
  shellPageNestClass,
} from "@/features/app-shell/app-shell-ui";
import { AGENCY_PAGE_SCROLL_ATTR, agencyWorkSurfaceShellClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { setAgencyTimeTrackingUserId } from "@/features/time-tracking/stores/agency-time-tracking";
import { useAgencyOptimisticStore } from "@/features/shared/stores/agency-optimistic";

function isAgencySegmentId(value: string | null): value is AgencySegmentId {
  return AGENCY_SEGMENTS.some((entry) => entry.id === value);
}

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
  useAgencyJourneyLiveSync({ teamId: agencySyncTeamId });
  const syncState = useAgencySyncStatus(agencySyncTeamId);

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

  function closeProject() {
    const next = new URLSearchParams(searchParams);
    next.set("section", "projects");
    next.delete("project");
    setSearchParams(next);
  }

  const isWorkSegment = segment === "work";

  return (
    <AppShellPage slots={["subtitle", "actions", "hideAgent"]}>
      <div
        className={cn(
          "flex h-full min-h-0 flex-col bg-background text-foreground",
          isWorkSegment ? "overflow-hidden" : "overflow-y-auto",
        )}
        {...{ [AGENCY_PAGE_SCROLL_ATTR]: "" }}
      >
        {!isBooting ? (
          <>
            <AppShellTopbarSubtitle>
              <AgencySubtitleBreadcrumb
                segment={segment}
                syncState={syncState}
                onSegmentChange={handleSegmentChange}
              />
            </AppShellTopbarSubtitle>

            <AppShellTopbarActions>
              <AgencyTeamBreadcrumb
                teamId={selectedTeamId}
                teams={teams}
                onTeamIdChange={setSelectedTeamId}
              />
              {selectedTeamId ? <AgencyPresenceAvatars teamId={selectedTeamId} /> : null}
            </AppShellTopbarActions>

            <AppShellTopbarTrailing>
              {selectedTeamId ? <AgencyNotifications teamId={selectedTeamId} /> : null}
            </AppShellTopbarTrailing>
          </>
        ) : null}

        <main className={isWorkSegment ? shellPageNestClass : shellPageClass}>
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
                hints={["Open Dashboard and create or join a team from the team panel."]}
              />
            </div>
          ) : (
            <div className={cn(shellPageBodyClass, isWorkSegment && "min-h-0 flex-1 pt-0")}>
              <div
                role="tabpanel"
                id={panelIdFor(segment)}
                aria-labelledby={`agency-tab-${segment}`}
                className={cn(isWorkSegment && "flex min-h-0 flex-1 flex-col")}
              >
                <AgencySegmentFiltersRoot
                  segment={segment}
                  teamId={selectedTeamId}
                  selectedProjectId={selectedProjectId}
                  reportMode={searchParams.get("report")}
                  searchParams={searchParams}
                >
                  {segment === "work" ? (
                    <div className={agencyWorkSurfaceShellClass}>
                      <AgencyWorkSurface
                        teamId={selectedTeamId}
                        onSelectProject={openProject}
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
                      onCloseProject={closeProject}
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
