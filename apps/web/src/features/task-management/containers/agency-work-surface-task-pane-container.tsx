import { useAgencyTaskList } from "@/features/task-management/hooks/use-agency-task-list";
import type { AgencyTaskProject } from "@/features/task-management/agency-work";

import { AgencyWorkSurfaceDelegatedContainer } from "@/features/task-management/work-surface/containers/agency-work-surface-delegated-container";
import { AgencyWorkSurfaceDoneContainer } from "@/features/task-management/work-surface/containers/agency-work-surface-done-container";
import { AgencyWorkSurfaceMyTasksView } from "@/features/task-management/work-surface/agency-work-surface-my-tasks-view";
import type { AgencyWorkSurfaceTab } from "@/features/task-management/agency-work";
import { AgencyWorkSurfaceTaskTableRow } from "@/features/task-management/work-surface/agency-work-surface-task-table-row";

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

  const renderTaskTableRow = (
    taskRowProps: Parameters<typeof AgencyWorkSurfaceTaskTableRow>[0],
  ) => <AgencyWorkSurfaceTaskTableRow key={taskRowProps.task.id} {...taskRowProps} />;

  switch (tab) {
    case "my-tasks":
      return <AgencyWorkSurfaceMyTasksView view={view} renderTaskTableRow={renderTaskTableRow} />;
    case "done":
      return <AgencyWorkSurfaceDoneContainer view={view} renderTaskTableRow={renderTaskTableRow} />;
    case "delegated":
      return (
        <AgencyWorkSurfaceDelegatedContainer view={view} renderTaskTableRow={renderTaskTableRow} />
      );
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}
