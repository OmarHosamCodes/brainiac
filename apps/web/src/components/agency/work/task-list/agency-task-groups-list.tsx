import { AgencyTaskProjectGroupView } from "@/components/agency/work/task-list/agency-task-project-group-view";
import type { AgencyTaskProjectDisplayGroup } from "@/lib/utils/agency-task-rail-grouping";
import type { AgencyProjectTask, AgencyTaskProject, TaskStatus } from "@/lib/schemas/agency-work";

type AgencyTaskGroupsListProps = {
  projectGroups: AgencyTaskProjectDisplayGroup[];
  allTasks: AgencyProjectTask[];
  collapsedProjects: Set<string>;
  projects: AgencyTaskProject[];
  teamId: string;
  selectedTaskId: string;
  highlightBlueprintId: string;
  highlightTaskId?: string;
  isRowPending: (taskId: string) => boolean;
  onProjectExpandedChange: (projectId: string, expanded: boolean) => void;
  onSelect: (taskId: string, blueprintId?: string | null) => void;
  onSelectProject: (projectId: string) => void;
  onStatusChange: (task: AgencyProjectTask, status: TaskStatus) => void;
  readOnly?: boolean;
  onReopenToActive?: (task: AgencyProjectTask) => void;
  listAriaLabel?: string;
};

export function AgencyTaskGroupsList({
  projectGroups,
  allTasks,
  collapsedProjects,
  projects,
  teamId,
  selectedTaskId,
  highlightBlueprintId,
  highlightTaskId,
  isRowPending,
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
      {projectGroups.map((group) => (
        <AgencyTaskProjectGroupView
          key={group.projectId}
          group={group}
          expanded={!collapsedProjects.has(group.projectId)}
          allTasks={allTasks}
          projects={projects}
          teamId={teamId}
          selectedTaskId={selectedTaskId}
          isRowPending={isRowPending}
          onExpandedChange={(expanded) => onProjectExpandedChange(group.projectId, expanded)}
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
