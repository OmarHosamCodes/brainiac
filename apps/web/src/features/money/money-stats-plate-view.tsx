import { ChevronRight } from "lucide-react";

import {
  type MoneyStatsMetricFixture,
  type MoneyStatsMetricKind,
  type MoneyStatsMetricTone,
} from "@/features/billing/money-stats-fixtures";
import {
  instrumentPlateInkClass,
  instrumentPlateSurfaceClass,
} from "@/features/member-profile/member-profile-instrument-plate";
import { agencyFocusRingClass, agencyMetricClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

import { MoneyStatsPlateGlyph } from "./money-stats-plate-glyphs";
import { moneyStatsPlateMeta } from "./money-stats-plate-meta";
import {
  type AgencyMoneySurfaceViewModel,
  type MoneyStatsCardViewModel,
  type MoneyStatsMetricSelection,
} from "./hooks/use-agency-money-surface";

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
      return "text-foreground";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

export function MoneyStatsMetricRow({
  card,
  metric,
  value,
  onSelect,
}: {
  card: MoneyStatsCardViewModel;
  metric: MoneyStatsMetricFixture & { source: "live" | "fixture" };
  value: string;
  onSelect: (selection: MoneyStatsMetricSelection) => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={cn(
          "group/metric flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
          "hover:bg-muted/40",
          agencyFocusRingClass,
        )}
        onClick={() => onSelect({ cardId: card.id, metricId: metric.id })}
        aria-label={`${metric.label}: ${value}. Open details.`}
      >
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{metric.label}</span>
        <span
          className={cn(
            agencyMetricClass,
            "shrink-0 font-mono text-xs font-semibold tabular-nums",
            toneValueClass(metric.tone),
          )}
        >
          {value}
        </span>
        <ChevronRight
          className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/metric:opacity-100 group-focus-visible/metric:opacity-100"
          aria-hidden
        />
      </button>
    </li>
  );
}

export function MoneyStatsPlate({
  card,
  onSelectMetric,
}: {
  card: MoneyStatsCardViewModel;
  onSelectMetric: AgencyMoneySurfaceViewModel["onSelectMetric"];
}) {
  const { shortTitle, destinationHint, tone } = moneyStatsPlateMeta(card.id);
  const ink = instrumentPlateInkClass(tone);
  const collectedPct = card.collectedRatio === null ? null : Math.round(card.collectedRatio * 100);
  const allMetrics = [card.primary, ...card.secondary];

  return (
    <article
      className={cn(
        instrumentPlateSurfaceClass(),
        "flex flex-col gap-3 rounded-xl border p-4 transition-colors",
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{shortTitle}</h2>
        <span className="shrink-0 text-[0.625rem] font-medium text-muted-foreground">
          {destinationHint}
        </span>
      </header>

      <div className={cn("h-7 w-full", ink)}>
        <MoneyStatsPlateGlyph
          plateId={card.id}
          collectedRatio={card.collectedRatio ?? 0}
          className="h-full w-full"
        />
      </div>

      {collectedPct !== null ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="text-muted-foreground">Collection</span>
            <span className={cn("font-mono font-semibold tabular-nums", toneValueClass("caution"))}>
              {card.collectedLabel}
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
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
        </div>
      ) : null}

      <ul className="flex flex-col gap-0.5 border-t border-border pt-2">
        {allMetrics.map((metric) => (
          <MoneyStatsMetricRow
            key={metric.id}
            card={card}
            metric={metric}
            value={formatMetricValue(metric.kind, metric.amount, card.currency)}
            onSelect={onSelectMetric}
          />
        ))}
      </ul>
    </article>
  );
}

export type MoneyStatsMetricHint = {
  label: string;
  value: string;
  destination: string;
};

export function MoneyStatsMetricHintStrip({ hint }: { hint: MoneyStatsMetricHint | null }) {
  if (!hint) return null;

  return (
    <p
      className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
      aria-live="polite"
    >
      <span className="font-medium text-foreground">{hint.label}</span>
      <span className="text-muted-foreground"> · </span>
      <span className="font-mono tabular-nums text-foreground">{hint.value}</span>
      <span className="text-muted-foreground"> · Opens {hint.destination}</span>
    </p>
  );
}
