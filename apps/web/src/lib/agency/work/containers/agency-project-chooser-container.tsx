import { AgencyProjectChooserView } from "@/components/agency/work/task-list/agency-project-chooser-view";
import { useAgencyProjectChooser } from "@/lib/agency/work/hooks/use-agency-project-chooser";
import type { AgencyProject } from "@/lib/schemas/agency-work";

type AgencyProjectChooserContainerProps = {
  value: string;
  onValueChange: (value: string) => void;
  projects: Array<Pick<AgencyProject, "id" | "clientName" | "name">>;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentAlign?: "start" | "center" | "end";
  autoFocus?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

export function AgencyProjectChooserContainer(props: AgencyProjectChooserContainerProps) {
  const view = useAgencyProjectChooser(props);
  return <AgencyProjectChooserView view={view} />;
}
