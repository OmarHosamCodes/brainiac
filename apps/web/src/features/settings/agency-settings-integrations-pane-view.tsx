import { Card } from "@/ui/card";
import { type AgencySettingsIntegrationsPaneViewModel } from "./hooks/use-agency-settings-integrations-pane";

export function AgencySettingsIntegrationsPaneView({
  viewModel,
}: {
  viewModel: AgencySettingsIntegrationsPaneViewModel;
}) {
  return <Card className="p-4">{viewModel.isPending ? "Loading..." : "Integrations"}</Card>;
}
