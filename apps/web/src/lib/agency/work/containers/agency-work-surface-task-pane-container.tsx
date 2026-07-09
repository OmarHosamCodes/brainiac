import { useAgencyTaskList } from "@/lib/agency/work/hooks/use-agency-task-list";
import type { AgencyTaskProject } from "@/lib/schemas/agency-work";

import { AgencyWorkSurfaceDelegatedView } from "@/components/agency/work/work-surface/agency-work-surface-delegated-view";
import { AgencyWorkSurfaceDoneView } from "@/components/agency/work/work-surface/agency-work-surface-done-view";
import { AgencyWorkSurfaceMyTasksView } from "@/components/agency/work/work-surface/agency-work-surface-my-tasks-view";
import type { AgencyWorkSurfaceTab } from "@/lib/schemas/agency-work";

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
      return <AgencyWorkSurfaceDelegatedView view={view} />;
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}
