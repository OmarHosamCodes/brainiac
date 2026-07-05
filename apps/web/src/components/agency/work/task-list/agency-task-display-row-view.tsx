import { AgencyTaskJourneyRowView } from "@/components/agency/work/task-list/agency-task-journey-row-view";
import { AgencyTaskRowView } from "@/components/agency/work/task-list/agency-task-row-view";
import type { TaskTrackingState } from "@/lib/agency/work/task-tracking-state";
import type { AgencyProjectTask, AgencyTaskProject, TaskStatus } from "@/lib/schemas/agency-work";
import type { AgencyTaskDisplayRow } from "@/lib/utils/agency-task-blueprints";

export type AgencyTaskDisplayRowViewProps = {
  row: AgencyTaskDisplayRow;
  allTasks: AgencyProjectTask[];
  projects: AgencyTaskProject[];
  teamId: string;
  selectedTaskId: string;
  readOnly?: boolean;
  highlight?: boolean;
  isRowPending: boolean;
  nested?: boolean;
  onSelect: (taskId: string) => void;
  onSelectProject?: (projectId: string) => void;
  onStatusChange?: (task: AgencyProjectTask, status: TaskStatus) => void;
  onReopenToActive?: (task: AgencyProjectTask) => void;
  onDelete?: (task: AgencyProjectTask) => void;
  trackingState?: TaskTrackingState;
  onBlueprintDescriptionChange?: (value: string) => void;
};

export function AgencyTaskDisplayRowView({
  row,
  allTasks,
  projects,
  teamId,
  selectedTaskId,
  readOnly = false,
  highlight = false,
  isRowPending,
  nested = false,
  onSelect,
  onSelectProject,
  onStatusChange,
  onReopenToActive,
  onDelete,
  trackingState,
  onBlueprintDescriptionChange,
}: AgencyTaskDisplayRowViewProps) {
  if (row.rowKind === "journey_anchor") {
    return (
      <AgencyTaskJourneyRowView
        task={row.task}
        projects={projects}
        allTasks={allTasks}
        selectedTaskId={selectedTaskId}
        journeyProgress={row.journeyProgress}
        nested={nested}
        onSelect={onSelect}
        onSelectProject={onSelectProject}
      />
    );
  }

  return (
    <AgencyTaskRowView
      task={row.task}
      projects={projects}
      teamId={teamId}
      selectedTaskId={selectedTaskId}
      readOnly={readOnly}
      highlight={highlight}
      isRowPending={isRowPending}
      showAllAssignees={row.rowKind === "journey_milestone"}
      nested={nested}
      blueprintId={row.blueprintId}
      blueprintDescription={row.blueprintDescription}
      trackingState={trackingState}
      onSelect={onSelect}
      onSelectProject={onSelectProject}
      onStatusChange={onStatusChange}
      onReopenToActive={onReopenToActive}
      onDelete={onDelete}
      onBlueprintDescriptionChange={onBlueprintDescriptionChange}
    />
  );
}
