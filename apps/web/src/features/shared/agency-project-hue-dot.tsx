import { projectHueStyle } from "@/features/shared/project-palette";
import { cn } from "@/lib/utils";

type AgencyProjectHueDotProps = {
  projectId: string;
  colorHueId?: number | null;
  className?: string;
};

export function AgencyProjectHueDot({
  projectId,
  colorHueId,
  className,
}: AgencyProjectHueDotProps) {
  return (
    <span
      className={cn(
        "inline-block size-1.5 shrink-0 rounded-full bg-[var(--project-hue)] dark:bg-[var(--project-hue-dark)]",
        className,
      )}
      style={projectHueStyle(projectId, colorHueId)}
      aria-hidden
    />
  );
}
