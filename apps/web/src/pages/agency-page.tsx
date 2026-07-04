import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { AgencyClientsSurface } from "@/components/agency/agency-clients-surface";
import { AgencyDashboardSurface } from "@/components/agency/agency-dashboard-surface";
import { AgencyManagementSurface } from "@/components/agency/agency-management-surface";
import { AgencyPlaceholderSurface } from "@/components/agency/agency-placeholder-surface";
import { AgencyProUpsell } from "@/components/agency/agency-pro-upsell";
import { AgencyProjectDetail } from "@/components/agency/agency-project-detail";
import { AgencyProjectsTable } from "@/components/agency/agency-projects-table";
import { AgencyReportsSurface } from "@/components/agency/agency-reports-surface";
import { AgencySubtitleBreadcrumb } from "@/components/agency/agency-subtitle-breadcrumb";
import { AgencyNotificationsBell } from "@/components/agency/agency-notifications-bell";
import { AgencyPresenceAvatars } from "@/components/agency/agency-presence-avatars";
import { AgencyTeamBreadcrumb } from "@/components/agency/agency-team-breadcrumb";
import { AgencyWorkSurface } from "@/components/agency/agency-work-surface";
import { AppShellTopbarActions, AppShellTopbarSubtitle } from "@/components/app-shell-topbar";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShellPage } from "@/components/app-shell-page";
import {
  consumeAgencyTaskSearchParam,
} from "@/lib/agency/agency-notification-navigation";
import { useAgencyNotifications } from "@/lib/agency/use-agency-notifications";
import { useAgencySyncStatus } from "@/lib/queries/agency-sync";
import { prefetchAgencyWorkQueries, useAgencyActiveTimerQuery } from "@/lib/queries/agency";
import { useBilling } from "@/lib/queries/billing";
import { useCurrentAgencyTeam } from "@/stores/agency-timer";
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
  const taskParam = searchParams.get("task");

  const notificationsEnabled = agencyEnabled && Boolean(selectedTeamId) && Boolean(currentUserId);
  const {
    openTask,
    markNotificationsRead,
    markAllRead,
    setInboxOpen,
    enablePushNotifications,
    isMarkingAllRead,
  } = useAgencyNotifications({
    teamId: selectedTeamId,
    enabled: notificationsEnabled,
    segment,
    searchParams,
    setSearchParams,
  });

  useEffect(() => {
    consumeAgencyTaskSearchParam(taskParam, segment, setSearchParams);
  }, [taskParam, segment, setSearchParams]);

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
    if (nextSegment !== "management") {
      next.delete("manage");
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
  const syncState = useAgencySyncStatus(agencySyncTeamId);

  useEffect(() => {
    if (!agencyEnabled || !selectedTeamId || !currentUserId) return;
    prefetchAgencyWorkQueries(selectedTeamId, currentUserId);
  }, [agencyEnabled, selectedTeamId, currentUserId]);

  const isInitialLoading = teamsQuery.isPending;

  function openProject(projectId: string) {
    const next = new URLSearchParams(searchParams);
    next.set("section", "projects");
    next.set("project", projectId);
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

  return (
    <AppShellPage slots={["subtitle", "actions", "hideAgent"]}>
      <div className="flex h-full flex-col overflow-hidden bg-default text-default">
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
          {selectedTeamId ? (
            <AgencyNotificationsBell
              teamId={selectedTeamId}
              onOpenTask={openTask}
              onMarkRead={(ids) => void markNotificationsRead(ids)}
              onMarkAllRead={() => void markAllRead()}
              onOpenChange={setInboxOpen}
              onEnablePush={enablePushNotifications}
              isMarkingAllRead={isMarkingAllRead}
            />
          ) : null}
        </AppShellTopbarActions>

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
              <div className={shellPageBodyClass}>
                <div
                  className={cn(shellPanelStackClass, "overflow-y-auto overscroll-contain")}
                  role="tabpanel"
                  id={panelIdFor(segment)}
                  aria-labelledby={`agency-tab-${segment}`}
                >
                  {segment === "dashboard" ? (
                    <AgencyDashboardSurface teamId={selectedTeamId} />
                  ) : null}
                  {segment === "work" ? (
                    <AgencyWorkSurface
                      teamId={selectedTeamId}
                      onSelectProject={openProject}
                      onSegmentChange={handleSegmentChange}
                    />
                  ) : null}
                  {segment === "projects" ? (
                    selectedProjectId ? (
                      <AgencyProjectDetail
                        teamId={selectedTeamId}
                        projectId={selectedProjectId}
                        onBack={closeProject}
                      />
                    ) : (
                      <AgencyProjectsTable teamId={selectedTeamId} onSelect={openProject} />
                    )
                  ) : null}
                  {segment === "clients" ? (
                    <AgencyClientsSurface teamId={selectedTeamId} />
                  ) : null}
                  {segment === "reports" ? (
                    <AgencyReportsSurface teamId={selectedTeamId} />
                  ) : null}
                  {segment === "management" ? (
                    <AgencyManagementSurface teamId={selectedTeamId} />
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AppShellPage>
  );
}
