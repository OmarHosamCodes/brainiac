import { useAgencySettingsTenurePane } from "../hooks/use-agency-settings-tenure-pane";
import { AgencySettingsTenurePaneView } from "../agency-settings-tenure-pane-view";

type AgencySettingsTenurePaneContainerProps = {
  teamId: string;
  active: boolean;
};

export function AgencySettingsTenurePaneContainer({
  teamId,
  active,
}: AgencySettingsTenurePaneContainerProps) {
  const viewModel = useAgencySettingsTenurePane({ teamId, active });
  return <AgencySettingsTenurePaneView viewModel={viewModel} />;
}
