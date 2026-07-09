import { Card } from "@/ui/card";
import { type AgencySettingsTenurePaneViewModel } from "./hooks/use-agency-settings-tenure-pane";

export function AgencySettingsTenurePaneView({
  viewModel,
}: {
  viewModel: AgencySettingsTenurePaneViewModel;
}) {
  return <Card className="p-4">{viewModel.isLoading ? "Loading..." : "Tenure"}</Card>;
}
