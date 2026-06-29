import { AgencyProjectHueDot } from "@/components/agency/agency-project-hue-dot";
import { projectHueFor } from "@/lib/utils/project-palette";
import { useTheme } from "@/stores/theme";
import { cn } from "@/lib/utils";

type AgencyTimeEntryProjectLabelProps = {
  projectId: string;
  projectName: string;
  clientName: string;
  className?: string;
};

export function AgencyTimeEntryProjectLabel({
  projectId,
  projectName,
  clientName,
  className,
}: AgencyTimeEntryProjectLabelProps) {
  const { isDark } = useTheme();
  const projectHue = projectHueFor(projectId);
  const projectColor = isDark ? projectHue.dark : projectHue.light;

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
