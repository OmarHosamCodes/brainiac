import { useAgencyTaskList } from "@/lib/agency/work/hooks/use-agency-task-list";
import type { AgencyTaskProject } from "@/lib/schemas/agency-work";

import { AgencyTaskListView } from "@/components/agency/work/task-list/agency-task-list-view";

type AgencyTaskListContainerProps = {
  teamId: string;
  projects: AgencyTaskProject[];
  selectedTaskId: string;
  collapsed: boolean;
  onSelect: (taskId: string) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  onSelectProject: (projectId: string) => void;
};

export function AgencyTaskListContainer(props: AgencyTaskListContainerProps) {
  const view = useAgencyTaskList(props);
  return <AgencyTaskListView view={view} />;
}
