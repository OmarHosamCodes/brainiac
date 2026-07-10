import { AgencyTaskChooser } from "@/features/time-tracking/choosers/agency-task-chooser";
import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";
import type { AggregatedReportRow } from "@/features/reports/agency-report-grouping";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyReportTaskCellProps = {
  row: AggregatedReportRow;
  projects: Array<Pick<AgencyProject, "id" | "clientName" | "name">>;
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
  row,
  projects,
  tasks,
  loading = false,
  disabled = false,
  onTaskChange,
}: AgencyReportTaskCellProps) {
  return (
    <AgencyTaskChooser
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
        "h-auto min-h-0 w-full max-w-full justify-start border-0 bg-transparent px-0 py-0 text-xs font-normal shadow-none hover:bg-muted/60",
        agencyFocusRingClass,
        "motion-reduce:transition-none",
      )}
    />
  );
}
