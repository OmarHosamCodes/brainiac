import { AgencySettingsRatesPaneView } from "../agency-settings-rates-pane-view";
import { useAgencySettingsRatesPane } from "../hooks/use-agency-settings-rates-pane";

type Props = { teamId: string; active: boolean };

export function AgencySettingsRatesPaneContainer(props: Props) {
  const viewModel = useAgencySettingsRatesPane(props);
  return <AgencySettingsRatesPaneView viewModel={viewModel} />;
}
