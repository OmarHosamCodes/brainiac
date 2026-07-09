import { useAgencyTaskList } from "@/features/task-management/hooks/use-agency-task-list";
import type { AgencyTaskProject } from "@/features/task-management/agency-work";

import { AgencyWorkSurfaceDelegatedContainer } from "@/features/task-management/work-surface/containers/agency-work-surface-delegated-container";
import { AgencyWorkSurfaceDoneView } from "@/features/task-management/work-surface/agency-work-surface-done-view";
import { AgencyWorkSurfaceMyTasksView } from "@/features/task-management/work-surface/agency-work-surface-my-tasks-view";
import type { AgencyWorkSurfaceTab } from "@/features/task-management/agency-work";

type AgencyWorkSurfaceTaskPaneProps = {
  tab: Exclude<AgencyWorkSurfaceTab, "sessions">;
  teamId: string;
  projects: AgencyTaskProject[];
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  onSelectProject: (projectId: string) => void;
};

export function AgencyWorkSurfaceTaskPane({
  tab,
  teamId,
  projects,
  selectedTaskId,
  onSelectTask,
  onSelectProject,
}: AgencyWorkSurfaceTaskPaneProps) {
  const view = useAgencyTaskList({
    teamId,
    projects,
    selectedTaskId,
    collapsed: false,
    onSelect: onSelectTask,
    onCollapsedChange: () => {},
    onSelectProject,
  });

  if (view.status !== "ready") {
    return null;
  }

  switch (tab) {
    case "my-tasks":
      return <AgencyWorkSurfaceMyTasksView view={view} />;
    case "done":
      return <AgencyWorkSurfaceDoneView view={view} />;
    case "delegated":
      return <AgencyWorkSurfaceDelegatedContainer view={view} />;
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}
