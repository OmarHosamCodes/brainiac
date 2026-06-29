import { ChevronDown } from "lucide-react";

import { AgencyTaskRowView } from "@/components/agency/work/task-list/agency-task-row-view";
import type { AgencyProjectTask, AgencyTaskProject, TaskStatus } from "@/lib/schemas/agency-work";
import {
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTaskClientGroupHeaderClass,
} from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

export type AgencyTaskClientGroupViewProps = {
  clientId: string;
  clientName: string;
  tasks: AgencyProjectTask[];
  expanded: boolean;
  projects: AgencyTaskProject[];
  teamId: string;
  selectedTaskId: string;
  isRowPending: (taskId: string) => boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSelect: (taskId: string) => void;
  onSelectProject: (projectId: string) => void;
  onStatusChange: (task: AgencyProjectTask, status: TaskStatus) => void;
};

export function AgencyTaskClientGroupView({
  clientId,
  clientName,
  tasks,
  expanded,
  projects,
  teamId,
  selectedTaskId,
  isRowPending,
  onExpandedChange,
  onSelect,
  onSelectProject,
  onStatusChange,
}: AgencyTaskClientGroupViewProps) {
  const panelId = `agency-task-client-group-${clientId}`;
  const inProgressCount = tasks.filter((task) => task.status === "in_progress").length;

  return (
    <section aria-labelledby={`${panelId}-label`}>
      <button
        type="button"
        id={`${panelId}-label`}
        className={cn(
          agencyTaskClientGroupHeaderClass,
          agencyFocusRingClass,
          "motion-reduce:transition-none",
        )}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => onExpandedChange(!expanded)}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted motion-safe:transition-transform motion-safe:duration-200",
              expanded ? "" : "-rotate-90",
            )}
            aria-hidden
          />
          <span className="truncate font-semibold text-highlighted">{clientName}</span>
        </span>
        <span className={cn(agencyMetricClass, "shrink-0 text-[11px] text-muted")}>
          {inProgressCount}/{tasks.length}
        </span>
      </button>

      {expanded ? (
        <ul id={panelId} aria-label={`${clientName} tasks`}>
          {tasks.map((task) => (
            <AgencyTaskRowView
              key={task.id}
              task={task}
              projects={projects}
              teamId={teamId}
              selectedTaskId={selectedTaskId}
              isRowPending={isRowPending(task.id)}
              onSelect={onSelect}
              onSelectProject={onSelectProject}
              onStatusChange={onStatusChange}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
