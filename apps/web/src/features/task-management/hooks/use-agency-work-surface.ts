import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import type { AgencySegmentId } from "@/features/shared/agency-segments";
import type {
  AgencyWorkSurfaceTab,
  AgencyWorkSurfaceView,
} from "@/features/task-management/agency-work";
import {
  normalizeAgencyWorkSurfaceTabParam,
  parseAgencyWorkSurfaceTab,
} from "@/features/task-management/agency-work";
import {
  normalizeAgencyWorkSurfaceTaskSelection,
  selectAgencyWorkSurfaceTask,
} from "@/features/task-management/agency-work-surface-navigation";
import { useAgencyProjectsQuery } from "@/features/shared/agency-queries";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useAgencyJourneyLiveSync } from "@/features/task-management/hooks/use-agency-journey-live-sync";

type UseAgencyWorkSurfaceOptions = {
  teamId: string;
  onSelectProject: (projectId: string) => void;
  onSegmentChange: (segment: AgencySegmentId) => void;
};

export function useAgencyWorkSurface({
  teamId,
  onSegmentChange,
  onSelectProject,
}: UseAgencyWorkSurfaceOptions): AgencyWorkSurfaceView {
  useAgencyJourneyLiveSync({ teamId });
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseAgencyWorkSurfaceTab(searchParams.get("tab"));
  const selectedTaskId = searchParams.get("task") ?? "";

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const projects = projectsQuery.data?.items ?? [];

  useEffect(() => {
    const legacyTab = normalizeAgencyWorkSurfaceTabParam(searchParams);
    if (legacyTab) {
      setSearchParams(legacyTab, { replace: true });
      return;
    }
    const next = normalizeAgencyWorkSurfaceTaskSelection(searchParams);
    if (!next) return;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const onTabChange = useCallback(
    (tab: AgencyWorkSurfaceTab) => {
      const next = new URLSearchParams(searchParams);
      next.set("section", "work");
      next.set("tab", tab);
      if (tab !== "tasks") {
        next.delete("task");
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const onSelectTask = useCallback(
    (taskId: string) => {
      const next = selectAgencyWorkSurfaceTask(searchParams, taskId);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

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
    activeTab,
    selectedTaskId,
    onTabChange,
    onSelectTask,
    onSelectProject,
  };
}
