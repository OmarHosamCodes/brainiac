import { ChevronRight } from "lucide-react";

import {
  agencyFocusRingClass,
  agencyLabelClass,
  agencyMetricClass,
  agencyPanelClass,
  agencySectionTitleClass,
} from "@/features/shared/agency-ui";
import { Badge } from "@/ui/badge";
import { cn } from "@/lib/utils";

import {
  type AgencyMoneySurfaceViewModel,
  type MoneyStatsCardViewModel,
  type MoneyStatsMetricSelection,
} from "./hooks/use-agency-money-surface";
import {
  type MoneyStatsMetricFixture,
  type MoneyStatsMetricKind,
  type MoneyStatsMetricTone,
} from "./money-stats-fixtures";

type AgencyMoneySurfaceViewProps = {
  viewModel: AgencyMoneySurfaceViewModel;
};

function formatMetricValue(kind: MoneyStatsMetricKind, amount: number, currency: string): string {
  if (kind === "percent") {
    return new Intl.NumberFormat(undefined, {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function toneValueClass(tone: MoneyStatsMetricTone | undefined): string {
  switch (tone) {
    case "positive":
      return "text-success";
    case "caution":
      return "text-warning";
    case "default":
    case undefined:
      return "text-highlighted";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

function MetricRowButton({
  card,
  metric,
  value,
  onSelect,
  dense,
}: {
  card: MoneyStatsCardViewModel;
  metric: MoneyStatsMetricFixture;
  value: string;
  onSelect: (selection: MoneyStatsMetricSelection) => void;
  dense?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "group/metric flex w-full items-center gap-2 rounded-xl text-left transition-colors",
        "hover:bg-elevated",
        agencyFocusRingClass,
        dense ? "px-2 py-1.5" : "px-2.5 py-2",
      )}
      onClick={() => onSelect({ cardId: card.id, metricId: metric.id })}
      aria-label={`${metric.label}: ${value}. Open details.`}
    >
      <span className="min-w-0 flex-1 truncate text-xs text-muted">{metric.label}</span>
      <span
        className={cn(
          agencyMetricClass,
          "shrink-0 text-xs font-semibold tabular-nums",
          toneValueClass(metric.tone),
        )}
      >
        {value}
      </span>
      <ChevronRight
        className="size-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover/metric:opacity-100 group-focus-visible/metric:opacity-100"
        aria-hidden
      />
    </button>
  );
}

function StatsCard({
  card,
  onSelectMetric,
}: {
  card: MoneyStatsCardViewModel;
  onSelectMetric: AgencyMoneySurfaceViewModel["onSelectMetric"];
}) {
  const primaryValue = formatMetricValue(card.primary.kind, card.primary.amount, card.currency);
  const collectedPct = card.collectedRatio === null ? null : Math.round(card.collectedRatio * 100);

  return (
    <article
      className={cn(
        agencyPanelClass,
        "flex flex-col gap-4 p-5",
        card.featured && "sm:col-span-2 lg:col-span-2",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className={cn(agencyLabelClass, "text-muted tracking-wide uppercase")}>{card.title}</h2>
        {card.collectedLabel ? (
          <Badge variant="outline" className="text-muted">
            {card.collectedLabel}
          </Badge>
        ) : null}
      </div>

      <button
        type="button"
        className={cn(
          "group/hero -mx-1 flex flex-col gap-1 rounded-2xl px-1 py-1 text-left transition-colors",
          "hover:bg-elevated/70",
          agencyFocusRingClass,
        )}
        onClick={() => onSelectMetric({ cardId: card.id, metricId: card.primary.id })}
        aria-label={`${card.primary.label}: ${primaryValue}. Open details.`}
      >
        <span className="text-xs font-medium text-muted">{card.primary.label}</span>
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              agencyMetricClass,
              "text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl",
              toneValueClass(card.primary.tone),
            )}
          >
            {primaryValue}
          </span>
          <ChevronRight
            className="size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover/hero:opacity-100 group-focus-visible/hero:opacity-100"
            aria-hidden
          />
        </span>
      </button>

      {collectedPct !== null ? (
        <div className="space-y-2" aria-hidden={false}>
          <div
            className="h-2 overflow-hidden rounded-full bg-elevated"
            role="meter"
            aria-label="Share of total income received"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={collectedPct}
          >
            <div
              className="h-full rounded-full bg-success/80 transition-[width] duration-300 ease-out motion-reduce:transition-none"
              style={{ width: `${collectedPct}%` }}
            />
          </div>
          <div className="flex justify-between gap-3 text-[11px] text-muted">
            <span>Collected</span>
            <span>Outstanding</span>
          </div>
        </div>
      ) : null}

      {card.secondary.length > 0 ? (
        <ul
          className={cn(
            "flex flex-col gap-0.5 border-t border-default pt-3",
            card.featured && "sm:grid sm:grid-cols-2 sm:gap-x-2 sm:gap-y-0.5",
          )}
        >
          {card.secondary.map((metric) => (
            <li key={metric.id}>
              <MetricRowButton
                card={card}
                metric={metric}
                value={formatMetricValue(metric.kind, metric.amount, card.currency)}
                onSelect={onSelectMetric}
                dense
              />
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function AgencyMoneySurfaceView({ viewModel }: AgencyMoneySurfaceViewProps) {
  const { title, subtitle, periodLabel, statsCards, onSelectMetric } = viewModel;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className={cn(agencySectionTitleClass, "text-balance")}>{title}</h1>
          {subtitle ? (
            <p className={cn(agencyLabelClass, "text-muted-foreground max-w-xl text-balance")}>
              {subtitle}
            </p>
          ) : null}
        </div>
        <Badge variant="secondary" className="w-fit shrink-0 tabular-nums">
          {periodLabel}
        </Badge>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Money period stats">
        {statsCards.map((card) => (
          <StatsCard key={card.id} card={card} onSelectMetric={onSelectMetric} />
        ))}
      </section>
    </div>
  );
}
