import { AgencyProjectHueDot } from "@/features/shared/agency-project-hue-dot";
import { agencyWorkMetaClass } from "@/features/shared/agency-ui";
import { projectHueStyle } from "@/features/shared/project-palette";
import { cn } from "@/lib/utils";

type AgencyTimeEntryProjectLabelProps = {
  projectId: string;
  projectName: string;
  clientName?: string;
  taskTitle?: string;
  format?: "project-client" | "task-project" | "task-client";
  className?: string;
};

export function AgencyTimeEntryProjectLabel({
  projectId,
  projectName,
  clientName,
  taskTitle,
  format = "project-client",
  className,
}: AgencyTimeEntryProjectLabelProps) {
  const projectStyle = projectHueStyle(projectId);

  if (format === "task-client") {
    return (
      <span
        className={cn(
          "inline-flex min-w-0 items-center gap-1 truncate",
          agencyWorkMetaClass,
          className,
        )}
      >
        <AgencyProjectHueDot projectId={projectId} />
        <span
          className="truncate font-medium text-[var(--project-hue)] dark:text-[var(--project-hue-dark)]"
          style={projectStyle}
        >
          {taskTitle ?? projectName}
        </span>
        <span className="truncate">- {clientName || "General"}</span>
      </span>
    );
  }

  if (format === "task-project") {
    return (
      <span
        className={cn(
          "inline-flex min-w-0 items-center gap-1 truncate",
          agencyWorkMetaClass,
          className,
        )}
      >
        <AgencyProjectHueDot projectId={projectId} />
        <span
          className="truncate font-medium text-[var(--project-hue)] dark:text-[var(--project-hue-dark)]"
          style={projectStyle}
        >
          {taskTitle ?? projectName}
        </span>
        <span className="truncate">- {projectName}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1 truncate",
        agencyWorkMetaClass,
        className,
      )}
    >
      <AgencyProjectHueDot projectId={projectId} />
      <span
        className="truncate font-medium text-[var(--project-hue)] dark:text-[var(--project-hue-dark)]"
        style={projectStyle}
      >
        {projectName}
      </span>
      <span className="truncate">- {clientName}</span>
    </span>
  );
}
