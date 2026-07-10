import {
  type TeamSettingsModalInput,
  useTeamSettingsModalActions,
} from "../hooks/use-team-settings-modal-actions";
import { TeamSettingsModalView } from "../views/team-settings-modal-view";

export type TeamSettingsModalProps = TeamSettingsModalInput;

export function TeamSettingsModal(props: TeamSettingsModalProps) {
  const viewModel = useTeamSettingsModalActions(props);
  return <TeamSettingsModalView viewModel={viewModel} />;
}
