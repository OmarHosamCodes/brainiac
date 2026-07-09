import { AgencyTaskTitleChooserView } from "@/features/task-management/task-list/agency-task-title-chooser-view";
import { useAgencyTaskTitleChooser } from "@/features/task-management/hooks/use-agency-task-title-chooser";
import type { AgencyProjectTask } from "@/features/task-management/agency-work";

type AgencyTaskTitleChooserContainerProps = {
  value: string;
  onValueChange: (value: string) => void;
  tasks: AgencyProjectTask[];
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentAlign?: "start" | "center" | "end";
  autoFocus?: boolean;
};

export function AgencyTaskTitleChooserContainer(props: AgencyTaskTitleChooserContainerProps) {
  const view = useAgencyTaskTitleChooser(props);
  return <AgencyTaskTitleChooserView view={view} />;
}
