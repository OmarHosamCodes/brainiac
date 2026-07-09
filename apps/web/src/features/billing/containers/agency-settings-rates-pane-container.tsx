import { useAgencySettingsRatesPane } from "../hooks/use-agency-settings-rates-pane";
import { AgencySettingsRatesPaneView } from "../agency-settings-rates-pane-view";

type AgencySettingsRatesPaneContainerProps = {
  teamId: string;
  active: boolean;
};

export function AgencySettingsRatesPaneContainer({
  teamId,
  active,
}: AgencySettingsRatesPaneContainerProps) {
  const viewModel = useAgencySettingsRatesPane({ teamId, active });
  return <AgencySettingsRatesPaneView viewModel={viewModel} />;
}
