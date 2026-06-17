import { useTheme } from "@/hooks/use-theme";
import { projectHueFor } from "@/lib/utils/project-palette";
import { cn } from "@/lib/utils";

type AgencyProjectHueDotProps = {
  projectId: string;
  className?: string;
};

export function AgencyProjectHueDot({ projectId, className }: AgencyProjectHueDotProps) {
  const { isDark } = useTheme();
  const hue = projectHueFor(projectId);

  return (
    <span
      className={cn("inline-block size-1.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: isDark ? hue.dark : hue.light }}
      aria-hidden
    />
  );
}
