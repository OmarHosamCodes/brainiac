import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import type { AgencySegmentId } from "@/lib/agency-segments";
import type { AgencyWorkSurfaceTab, AgencyWorkSurfaceView } from "@/lib/schemas/agency-work";
import { parseAgencyWorkSurfaceTab } from "@/lib/schemas/agency-work";
import { useAgencyProjectsQuery } from "@/lib/queries/agency";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useAgencyTaskListStore, type AgencyTaskRailStatusFilter } from "@/stores/agency-task-list";

type UseAgencyWorkSurfaceOptions = {
  teamId: string;
  onSelectProject: (projectId: string) => void;
  onSegmentChange: (segment: AgencySegmentId) => void;
};

function tabToRailFilter(tab: AgencyWorkSurfaceTab): AgencyTaskRailStatusFilter | null {
  switch (tab) {
    case "my-tasks":
      return "active";
    case "done":
      return "done";
    case "delegated":
      return "assigned";
    case "sessions":
      return null;
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}

export function useAgencyWorkSurface({
  teamId,
  onSegmentChange,
  onSelectProject,
}: UseAgencyWorkSurfaceOptions): AgencyWorkSurfaceView {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseAgencyWorkSurfaceTab(searchParams.get("tab"));
  const selectedTaskId = searchParams.get("task") ?? "";
  const setRailStatusFilter = useAgencyTaskListStore((s) => s.setRailStatusFilter);
  const setQuickAddFocused = useAgencyTaskListStore((s) => s.setQuickAddFocused);

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const projects = projectsQuery.data?.items ?? [];

  useEffect(() => {
    const filter = tabToRailFilter(activeTab);
    if (filter) {
      setRailStatusFilter(filter);
    }
  }, [activeTab, setRailStatusFilter]);

  useEffect(() => {
    const taskId = searchParams.get("task");
    if (!taskId || searchParams.get("tab") === "my-tasks") return;
    const next = new URLSearchParams(searchParams);
    next.set("section", "work");
    next.set("tab", "my-tasks");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const onTabChange = useCallback(
    (tab: AgencyWorkSurfaceTab) => {
      const next = new URLSearchParams(searchParams);
      next.set("section", "work");
      next.set("tab", tab);
      if (tab !== "my-tasks") {
        next.delete("task");
      }
      setSearchParams(next, { replace: true });
      const filter = tabToRailFilter(tab);
      if (filter) {
        setRailStatusFilter(filter);
      }
    },
    [searchParams, setRailStatusFilter, setSearchParams],
  );

  const onSelectTask = useCallback(
    (taskId: string) => {
      const next = new URLSearchParams(searchParams);
      next.set("section", "work");
      next.set("tab", "my-tasks");
      if (taskId) {
        next.set("task", taskId);
      } else {
        next.delete("task");
      }
      setSearchParams(next, { replace: true });
      setRailStatusFilter("active");
    },
    [searchParams, setRailStatusFilter, setSearchParams],
  );

  const onAddNewTask = useCallback(() => {
    setQuickAddFocused(true);
    onTabChange("my-tasks");
  }, [onTabChange, setQuickAddFocused]);

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
    onAddNewTask,
    onSelectProject,
  };
}
