import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import { agencySectionTitleClass } from "@/features/shared/agency-ui";
import { type AgencySettingsIntegrationsPaneViewModel } from "./hooks/use-agency-settings-integrations-pane";

type AgencySettingsIntegrationsPaneViewProps = {
  viewModel: AgencySettingsIntegrationsPaneViewModel;
};

export function AgencySettingsIntegrationsPaneView({
  viewModel,
}: AgencySettingsIntegrationsPaneViewProps) {
  const { isPending, integrations } = viewModel;

  return (
    <div className="space-y-4">
      <div>
        <h2 className={agencySectionTitleClass}>Push time and budgets to where your team works</h2>
      </div>

      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {integrations.map((integration) => (
            <li key={integration.id} className="rounded-xl border border-default p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="truncate text-sm font-bold text-highlighted">{integration.name}</p>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold",
                    integration.status === "connected" ? "text-success" : "text-dimmed",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block size-1.5 rounded-full",
                      integration.status === "connected" ? "bg-success" : "bg-muted",
                    )}
                    aria-hidden="true"
                  />
                  {integration.status === "connected" ? "Connected" : "Available"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">{integration.description}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                disabled={integration.status !== "connected"}
              >
                {integration.status === "connected" ? "Manage" : "Connect"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
