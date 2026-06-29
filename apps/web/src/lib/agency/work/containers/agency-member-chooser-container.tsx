import { AgencyMemberChooserView } from "@/components/agency/work/task-list/agency-member-chooser-view";
import { useAgencyMemberChooser } from "@/lib/agency/work/hooks/use-agency-member-chooser";
import type { AgencyTaskThreadMember } from "@/lib/schemas/agency-work";

type AgencyMemberChooserContainerProps = {
  value: string;
  onValueChange: (value: string) => void;
  members: AgencyTaskThreadMember[];
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentAlign?: "start" | "center" | "end";
  allowUnassigned?: boolean;
};

export function AgencyMemberChooserContainer(props: AgencyMemberChooserContainerProps) {
  const view = useAgencyMemberChooser(props);
  return <AgencyMemberChooserView view={view} />;
}
