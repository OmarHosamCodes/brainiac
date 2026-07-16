import { useAgencyTaskChooser } from "@/features/time-tracking/hooks/use-agency-task-chooser";
import type { UseAgencyTaskChooserOptions } from "@/features/time-tracking/hooks/use-agency-task-chooser";
import { AgencyTaskChooserView } from "@/features/time-tracking/choosers/agency-task-chooser-view";

export type AgencyTaskChooserContainerProps = UseAgencyTaskChooserOptions;

export function AgencyTaskChooserContainer(props: AgencyTaskChooserContainerProps) {
  const view = useAgencyTaskChooser(props);
  return <AgencyTaskChooserView view={view} />;
}
