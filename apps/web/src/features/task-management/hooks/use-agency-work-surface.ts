import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import type { AgencySegmentId } from "@/features/shared/agency-segments";
import type { AgencyWorkSurfaceView } from "@/features/task-management/agency-work";
import { normalizeAgencyWorkSurfaceQueryParams } from "@/features/task-management/agency-work";
import { useAgencyProjectsQuery } from "@/features/shared/agency-queries";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type UseAgencyWorkSurfaceOptions = {
  teamId: string;
  onSegmentChange: (segment: AgencySegmentId) => void;
};

export function useAgencyWorkSurface({
  teamId,
  onSegmentChange,
}: UseAgencyWorkSurfaceOptions): AgencyWorkSurfaceView {
  const [searchParams, setSearchParams] = useSearchParams();

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const projects = projectsQuery.data?.items ?? [];

  useEffect(() => {
    const next = normalizeAgencyWorkSurfaceQueryParams(searchParams);
    if (!next) return;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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
  };
}
