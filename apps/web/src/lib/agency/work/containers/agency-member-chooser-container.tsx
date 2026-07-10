import { AgencyMemberChooserView } from "@/components/agency/work/task-list/agency-member-chooser-view";
import {
  useAgencyMemberChooser,
  type UseAgencyMemberChooserOptions,
} from "@/lib/agency/work/hooks/use-agency-member-chooser";

export type AgencyMemberChooserContainerProps = UseAgencyMemberChooserOptions;

export function AgencyMemberChooserContainer(props: AgencyMemberChooserContainerProps) {
  const view = useAgencyMemberChooser(props);
  return <AgencyMemberChooserView view={view} />;
}
