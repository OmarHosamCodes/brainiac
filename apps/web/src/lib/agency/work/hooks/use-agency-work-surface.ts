import { useEffect } from "react";

import type { AgencySegmentId } from "@/lib/agency-segments";
import { useAgencyElapsedTimer } from "@/lib/agency/work/hooks/use-agency-elapsed-timer";
import type { AgencyWorkSurfaceView } from "@/lib/schemas/agency-work";
import { useAgencyActiveTimerQuery, useAgencyProjectsQuery } from "@/lib/queries/agency";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useAgencyWorkSurfaceStore } from "@/stores/agency-work-surface";

type UseAgencyWorkSurfaceOptions = {
  teamId: string;
  onSelectProject: (projectId: string) => void;
  onSegmentChange: (segment: AgencySegmentId) => void;
};

export function useAgencyWorkSurface({
  teamId,
  onSelectProject,
  onSegmentChange,
}: UseAgencyWorkSurfaceOptions): AgencyWorkSurfaceView {
  const selectedTaskId = useAgencyWorkSurfaceStore((s) => s.selectedTaskId);
  const mobilePane = useAgencyWorkSurfaceStore((s) => s.mobilePane);
  const taskRailCollapsed = useAgencyWorkSurfaceStore((s) => s.taskRailCollapsed);
  const setSelectedTaskId = useAgencyWorkSurfaceStore((s) => s.setSelectedTaskId);
  const setMobilePane = useAgencyWorkSurfaceStore((s) => s.setMobilePane);
  const setTaskRailCollapsed = useAgencyWorkSurfaceStore((s) => s.setTaskRailCollapsed);
  const openTimePane = useAgencyWorkSurfaceStore((s) => s.openTimePane);
  const resetForTeam = useAgencyWorkSurfaceStore((s) => s.resetForTeam);

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const activeTimerQuery = useAgencyActiveTimerQuery(teamId);
  const projects = projectsQuery.data?.items ?? [];
  const activeTimer = activeTimerQuery.data?.timer ?? null;

  const timerStartedAt =
    activeTimer && activeTimer.teamId === teamId ? activeTimer.startedAt : null;

  const mobileTrackingLabel = useAgencyElapsedTimer({
    startedAt: timerStartedAt,
    enabled: Boolean(timerStartedAt),
  });

  useEffect(() => {
    resetForTeam();
  }, [teamId, resetForTeam]);

  if (projectsQuery.isError) {
    return {
      status: "error",
      message: getErrorMessage(projectsQuery.error, "Try refreshing."),
      onRetry: () => void projectsQuery.refetch(),
    };
  }

  if (projectsQuery.isPending) {
    return { status: "loading" };
  }

  const showEmptyProjects =
    projectsQuery.isSuccess && projects.length === 0 && !projectsQuery.isFetching;

  if (showEmptyProjects) {
    return {
      status: "empty",
      onGoToClients: () => onSegmentChange("clients"),
      onGoToProjects: () => onSegmentChange("projects"),
    };
  }

  return {
    status: "ready",
    teamId,
    projects,
    selectedTaskId,
    mobilePane,
    taskRailCollapsed,
    mobileTrackingLabel,
    onSelectTask: setSelectedTaskId,
    onCollapsedChange: setTaskRailCollapsed,
    onSelectProject,
    onMobilePaneChange: setMobilePane,
    onOpenTimePane: openTimePane,
  };
}
