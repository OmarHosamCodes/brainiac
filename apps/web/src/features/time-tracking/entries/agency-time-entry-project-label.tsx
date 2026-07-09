import { AgencyProjectHueDot } from "@/features/shared/agency-project-hue-dot";
import { projectHueFor } from "@/lib/utils/project-palette";
import { useTheme } from "@/stores/theme";
import { cn } from "@/lib/utils";

type AgencyTimeEntryProjectLabelProps = {
  projectId: string;
  projectName: string;
  clientName?: string;
  taskTitle?: string;
  format?: "project-client" | "task-project";
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
  const { isDark } = useTheme();
  const projectHue = projectHueFor(projectId);
  const projectColor = isDark ? projectHue.dark : projectHue.light;

  if (format === "task-project") {
    return (
      <span className={cn("inline-flex min-w-0 items-center gap-1 truncate text-xs", className)}>
        <AgencyProjectHueDot projectId={projectId} />
        <span className="truncate font-medium" style={{ color: projectColor }}>
          {taskTitle ?? projectName}
        </span>
        <span className="truncate text-muted">. {projectName}</span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1 truncate text-xs", className)}>
      <AgencyProjectHueDot projectId={projectId} />
      <span className="truncate font-medium" style={{ color: projectColor }}>
        {projectName}
      </span>
      <span className="truncate text-muted">· {clientName}</span>
    </span>
  );
}
