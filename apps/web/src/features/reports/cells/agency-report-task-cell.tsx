import { AgencyTaskChooser } from "@/features/time-tracking/choosers/agency-task-chooser";
import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";
import type { AggregatedReportRow } from "@/features/reports/agency-report-grouping";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyReportTaskCellProps = {
  teamId: string;
  row: AggregatedReportRow;
  projects: Array<Pick<AgencyProject, "id" | "clientId" | "clientName" | "name" | "colorHueId">>;
  tasks: Array<
    Pick<
      AgencyProjectTask,
      "id" | "projectId" | "title" | "status" | "assignedToTeam" | "assignees"
    > & {
      dueDate?: string | null;
    }
  >;
  loading?: boolean;
  disabled?: boolean;
  onTaskChange: (taskId: string) => void;
};

export function AgencyReportTaskCell({
  teamId,
  row,
  projects,
  tasks,
  loading = false,
  disabled = false,
  onTaskChange,
}: AgencyReportTaskCellProps) {
  return (
    // Stretch past the chooser’s inline-flex shrink-wrap so the label fills the cell.
    <div className="w-full min-w-0 [&>div]:flex [&>div]:w-full [&>div]:max-w-none">
      <AgencyTaskChooser
        teamId={teamId}
        value={row.taskId ?? ""}
        onValueChange={onTaskChange}
        projects={projects}
        tasks={tasks}
        loading={loading}
        placeholder="—"
        contentAlign="start"
        highlightSearch
        disabled={disabled}
        className={cn(
          "-mx-4 -my-3 h-auto min-h-10 w-[calc(100%+2rem)] justify-start text-start rounded-none border-0 bg-transparent px-4 py-3 text-xs font-normal shadow-none hover:bg-muted/60",
          agencyFocusRingClass,
          "motion-reduce:transition-none",
        )}
      />
    </div>
  );
}
