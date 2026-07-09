import { AgencyTaskClientGroupView } from "@/features/task-management/task-list/agency-task-client-group-view";
import type { AgencyTaskClientDisplayGroup } from "@/features/task-management/agency-task-rail-grouping";
import type { AgencyProjectTask, AgencyTaskProject, TaskStatus } from "@/features/task-management/agency-work";

type AgencyTaskGroupsListProps = {
  clientGroups: AgencyTaskClientDisplayGroup[];
  allTasks: AgencyProjectTask[];
  collapsedClients: Set<string>;
  collapsedProjects: Set<string>;
  projects: AgencyTaskProject[];
  teamId: string;
  selectedTaskId: string;
  highlightBlueprintId: string;
  highlightTaskId?: string;
  isRowPending: (taskId: string) => boolean;
  onClientExpandedChange: (clientId: string, expanded: boolean) => void;
  onProjectExpandedChange: (projectId: string, expanded: boolean) => void;
  onSelect: (taskId: string, blueprintId?: string | null) => void;
  onSelectProject: (projectId: string) => void;
  onStatusChange: (task: AgencyProjectTask, status: TaskStatus) => void;
  readOnly?: boolean;
  onReopenToActive?: (task: AgencyProjectTask) => void;
  listAriaLabel?: string;
};

export function AgencyTaskGroupsList({
  clientGroups,
  allTasks,
  collapsedClients,
  collapsedProjects,
  projects,
  teamId,
  selectedTaskId,
  highlightBlueprintId,
  highlightTaskId,
  isRowPending,
  onClientExpandedChange,
  onProjectExpandedChange,
  onSelect,
  onSelectProject,
  onStatusChange,
  readOnly = false,
  onReopenToActive,
  listAriaLabel = "My tasks",
}: AgencyTaskGroupsListProps) {
  return (
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto" aria-label={listAriaLabel}>
      {clientGroups.map((group) => (
        <AgencyTaskClientGroupView
          key={group.clientId}
          group={group}
          expanded={!collapsedClients.has(group.clientId)}
          collapsedProjects={collapsedProjects}
          allTasks={allTasks}
          projects={projects}
          teamId={teamId}
          selectedTaskId={selectedTaskId}
          isRowPending={isRowPending}
          onExpandedChange={(expanded) => onClientExpandedChange(group.clientId, expanded)}
          onProjectExpandedChange={onProjectExpandedChange}
          onSelect={onSelect}
          onSelectProject={onSelectProject}
          onStatusChange={onStatusChange}
          highlightBlueprintId={highlightBlueprintId}
          readOnly={readOnly}
          onReopenToActive={onReopenToActive}
          highlightTaskId={highlightTaskId}
        />
      ))}
    </div>
  );
}
