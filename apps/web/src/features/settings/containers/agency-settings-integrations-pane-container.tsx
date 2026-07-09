import { AgencySettingsIntegrationsPaneView } from "../agency-settings-integrations-pane-view";
import { useAgencySettingsIntegrationsPane } from "../hooks/use-agency-settings-integrations-pane";

type Props = { teamId: string; active: boolean };

export function AgencySettingsIntegrationsPaneContainer(props: Props) {
  const viewModel = useAgencySettingsIntegrationsPane(props);
  return <AgencySettingsIntegrationsPaneView viewModel={viewModel} />;
}
