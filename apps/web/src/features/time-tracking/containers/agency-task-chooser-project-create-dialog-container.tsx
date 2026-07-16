import {
  useAgencyTaskChooserProjectCreateDialog,
  type UseAgencyTaskChooserProjectCreateDialogOptions,
} from "@/features/time-tracking/hooks/use-agency-task-chooser-project-create-dialog";
import { AgencyTaskChooserProjectCreateDialogView } from "@/features/time-tracking/agency-task-chooser-project-create-dialog-view";

export type AgencyTaskChooserProjectCreateDialogProps =
  UseAgencyTaskChooserProjectCreateDialogOptions;

export function AgencyTaskChooserProjectCreateDialogContainer(
  props: AgencyTaskChooserProjectCreateDialogProps,
) {
  const { open, onOpenChange } = props;
  const viewModel = useAgencyTaskChooserProjectCreateDialog(props);
  return (
    <AgencyTaskChooserProjectCreateDialogView
      open={open}
      onOpenChange={onOpenChange}
      viewModel={viewModel}
    />
  );
}
