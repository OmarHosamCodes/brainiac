import { AgencyMemberChooserView } from "@/features/shared/choosers/agency-member-chooser-view";
import {
  useAgencyMemberChooser,
  type UseAgencyMemberChooserOptions,
} from "@/features/shared/choosers/use-agency-member-chooser";

export type AgencyMemberChooserContainerProps = UseAgencyMemberChooserOptions;

export function AgencyMemberChooserContainer(props: AgencyMemberChooserContainerProps) {
  const view = useAgencyMemberChooser(props);
  return <AgencyMemberChooserView view={view} />;
}
