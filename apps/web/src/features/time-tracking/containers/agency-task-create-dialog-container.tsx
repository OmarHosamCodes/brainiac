import {
  useAgencyTaskCreateDialog,
  type UseAgencyTaskCreateDialogOptions,
} from "@/features/time-tracking/hooks/use-agency-task-create-dialog";
import { AgencyTaskCreateDialogView } from "@/features/time-tracking/agency-task-create-dialog-view";

export type AgencyTaskCreateDialogProps = UseAgencyTaskCreateDialogOptions;

export function AgencyTaskCreateDialogContainer(props: AgencyTaskCreateDialogProps) {
  const { open, onOpenChange } = props;
  const viewModel = useAgencyTaskCreateDialog(props);
  return (
    <AgencyTaskCreateDialogView open={open} onOpenChange={onOpenChange} viewModel={viewModel} />
  );
}
