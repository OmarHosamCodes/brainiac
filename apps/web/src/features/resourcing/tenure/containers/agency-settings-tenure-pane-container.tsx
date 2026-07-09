import { AgencySettingsTenurePaneView } from "../agency-settings-tenure-pane-view";
import { useAgencySettingsTenurePane } from "../hooks/use-agency-settings-tenure-pane";

type Props = { teamId: string; active: boolean };

export function AgencySettingsTenurePaneContainer(props: Props) {
  const viewModel = useAgencySettingsTenurePane(props);
  return <AgencySettingsTenurePaneView viewModel={viewModel} />;
}
