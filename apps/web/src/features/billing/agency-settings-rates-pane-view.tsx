import { Card } from "@/ui/card";
import { type AgencySettingsRatesPaneViewModel } from "./hooks/use-agency-settings-rates-pane";

export function AgencySettingsRatesPaneView({
  viewModel,
}: {
  viewModel: AgencySettingsRatesPaneViewModel;
}) {
  if (viewModel.isPending) return <Card className="p-4">Loading...</Card>;
  return (
    <Card className="space-y-2 p-4">
      {viewModel.rates.map((rate) => (
        <div key={rate.userId}>{rate.userName}</div>
      ))}
    </Card>
  );
}
