import { useAgencyProjectCreateDialog } from "../hooks/use-agency-project-create-dialog";
import { AgencyProjectCreateDialogView } from "../agency-project-create-dialog-view";
import type { AgencyClientOption } from "../hooks/use-agency-project-create-dialog";

export type AgencyProjectCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  clients: AgencyClientOption[];
  /** When set, client picker is hidden and this client is used. */
  lockClientId?: string;
  defaultClientId?: string;
  onCreated?: (projectId: string) => void;
};

export function AgencyProjectCreateDialogContainer(props: AgencyProjectCreateDialogProps) {
  const { open, onOpenChange, teamId, clients, lockClientId, defaultClientId, onCreated } = props;
  const viewModel = useAgencyProjectCreateDialog({
    open,
    onOpenChange,
    teamId,
    clients,
    lockClientId,
    defaultClientId,
    onCreated,
  });

  return (
    <AgencyProjectCreateDialogView
      open={open}
      onOpenChange={onOpenChange}
      clients={clients}
      viewModel={viewModel}
    />
  );
}
