import { AgencyTaskChooser } from "@/components/agency/agency-task-chooser";
import type { AgencyProject, AgencyProjectTask } from "@/lib/schemas/agency-work";
import type { AggregatedReportRow } from "@/lib/utils/agency-report-grouping";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
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
      fallbackTaskTitle={row.taskTitle ?? undefined}
      fallbackProjectId={row.projectId}
      fallbackProjectName={row.projectName}
      placeholder="—"
      triggerFormat="task-only"
      contentAlign="start"
      disabled={disabled}
      className={cn(
        "h-auto min-h-0 w-full max-w-full justify-start border-0 bg-transparent px-0 py-0 text-xs font-normal shadow-none hover:bg-muted/60",
        agencyFocusRingClass,
        "motion-reduce:transition-none",
      )}
    />
  );
}
