import { agencyErrorPanelClass } from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";

import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";
import {
  MoneyStatsMetricHintStrip,
  MoneyStatsPlate,
  type MoneyStatsMetricHint,
} from "./money-stats-plate-view";

export function MoneyStatsSection({
  status,
  errorMessage,
  statsCards,
  onSelectMetric,
  onRetry,
  metricHint,
  periodFx,
}: {
  status: AgencyMoneySurfaceViewModel["scoreboardStatus"];
  errorMessage: string;
  statsCards: AgencyMoneySurfaceViewModel["statsCards"];
  onSelectMetric: AgencyMoneySurfaceViewModel["onSelectMetric"];
  onRetry: AgencyMoneySurfaceViewModel["onRetryScoreboard"];
  metricHint?: MoneyStatsMetricHint | null;
  periodFx?: AgencyMoneySurfaceViewModel["periodFx"];
}) {
  if (status === "loading") {
    return (
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="min-h-[15.5rem] rounded-xl" />
        ))}
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className={agencyErrorPanelClass} role="alert">
        <p className="text-sm font-medium text-highlighted">Couldn’t load the period scoreboard</p>
        <p className="mt-1 text-xs text-muted">{errorMessage}</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Retry
        </Button>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {periodFx?.label ? <p className="text-xs text-muted">{periodFx.label}</p> : null}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Money period stats">
        {statsCards.map((card, index) => (
          <MoneyStatsPlate
            key={card.id}
            card={card}
            onSelectMetric={onSelectMetric}
            staggerIndex={index}
          />
        ))}
      </section>
      <MoneyStatsMetricHintStrip hint={metricHint ?? null} />
    </div>
  );
}
