import { useAgencySettingsIntegrationsPane } from "../hooks/use-agency-settings-integrations-pane";
import { AgencySettingsIntegrationsPaneView } from "../agency-settings-integrations-pane-view";

type AgencySettingsIntegrationsPaneContainerProps = {
  teamId: string;
  active: boolean;
};

export function AgencySettingsIntegrationsPaneContainer({
  teamId,
  active,
}: AgencySettingsIntegrationsPaneContainerProps) {
  const viewModel = useAgencySettingsIntegrationsPane({ teamId, active });
  return <AgencySettingsIntegrationsPaneView viewModel={viewModel} />;
}
