import { useAgencyTaskChooser } from "@/lib/agency/work/hooks/use-agency-task-chooser";
import type { AgencyProject, AgencyProjectTask } from "@/lib/schemas/agency-work";
import type { AgencyTaskChooserTriggerFormat } from "@/lib/agency/work/hooks/use-agency-task-chooser";

import { AgencyTaskChooserView } from "@/components/agency/work/time-entries/agency-task-chooser-view";

type AgencyTaskChooserContainerProps = {
  value: string;
  onValueChange: (value: string) => void;
  projects: Array<Pick<AgencyProject, "id" | "clientName" | "name">>;
  tasks: Array<
    Pick<
      AgencyProjectTask,
      "id" | "projectId" | "title" | "status" | "assignedToTeam" | "assignees"
    > & {
      dueDate?: string | null;
    }
  >;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentAlign?: "start" | "center" | "end";
  triggerFormat?: AgencyTaskChooserTriggerFormat;
  fallbackTaskTitle?: string;
  fallbackProjectId?: string;
  fallbackProjectName?: string;
};

export function AgencyTaskChooserContainer(props: AgencyTaskChooserContainerProps) {
  const view = useAgencyTaskChooser(props);
  return <AgencyTaskChooserView view={view} />;
}
