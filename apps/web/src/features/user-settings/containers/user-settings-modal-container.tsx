import {
  type UserSettingsModalInput,
  useUserSettingsModalActions,
} from "../hooks/use-user-settings-modal-actions";
import { UserSettingsModalView } from "../views/user-settings-modal-view";

export type UserSettingsModalProps = UserSettingsModalInput;

export function UserSettingsModal(props: UserSettingsModalProps) {
  const viewModel = useUserSettingsModalActions(props);
  return <UserSettingsModalView viewModel={viewModel} />;
}
