import type {
  MoneyStatsCardId,
  MoneyStatsMetricFixture,
  MoneyStatsMetricId,
} from "@/features/billing/money-stats-fixtures";
import type { InstrumentPlateTone } from "@/features/member-profile/member-profile-instrument-plate";

export function clampPlateRatio(ratio: number): number {
  return Math.min(1, Math.max(0, ratio));
}

export type MoneyStatsPlateGlyphSignal =
  | { kind: "income"; collectedRatio: number }
  | { kind: "deductions"; bars: [number, number, number] }
  | { kind: "profitability"; arcRatio: number }
  | { kind: "allocations"; blocks: [number, number, number] };

export type MoneyStatsPlateSignal = {
  tone: InstrumentPlateTone;
  glyph: MoneyStatsPlateGlyphSignal;
};

export function sharesAgainstMax(amounts: number[]): number[] {
  const cleaned = amounts.map((amount) => Math.max(0, amount));
  const max = Math.max(0, ...cleaned);
  if (max <= 0) return cleaned.map(() => 0);
  return cleaned.map((amount) => clampPlateRatio(amount / max));
}

function metricAmount(
  metrics: Array<Pick<MoneyStatsMetricFixture, "id" | "amount">>,
  id: MoneyStatsMetricId,
): number {
  return metrics.find((metric) => metric.id === id)?.amount ?? 0;
}

function profitabilityArcRatio(profit: number, roi: number): number {
  if (profit <= 0) return 0;
  // Map ROI into [0.15, 1]: 0 → 0.15 floor when still profitable; ≥100% → full arc.
  if (roi < 0) return 0.15;
  return clampPlateRatio(0.15 + 0.85 * Math.min(1, roi));
}

export function moneyStatsPlateSignal(
  cardId: MoneyStatsCardId,
  metrics: Array<Pick<MoneyStatsMetricFixture, "id" | "amount">>,
  collectedRatio: number | null,
): MoneyStatsPlateSignal {
  switch (cardId) {
    case "income-cash": {
      const total = metricAmount(metrics, "total-income");
      const ratio = clampPlateRatio(collectedRatio ?? 0);
      if (total <= 0) {
        return { tone: "info", glyph: { kind: "income", collectedRatio: 0 } };
      }
      if (ratio < 1) {
        return { tone: "warning", glyph: { kind: "income", collectedRatio: ratio } };
      }
      return { tone: "success", glyph: { kind: "income", collectedRatio: 1 } };
    }
    case "deductions": {
      const salaries = metricAmount(metrics, "salaries");
      const expenses = metricAmount(metrics, "expenses");
      const other =
        metricAmount(metrics, "debt-discount") + metricAmount(metrics, "paid-vacation");
      const shares = sharesAgainstMax([salaries, expenses, other]);
      return {
        tone: "neutral",
        glyph: {
          kind: "deductions",
          bars: [shares[0] ?? 0, shares[1] ?? 0, shares[2] ?? 0],
        },
      };
    }
    case "profitability": {
      const profit = metricAmount(metrics, "team-profit");
      const roi = metricAmount(metrics, "roi");
      const arcRatio = profitabilityArcRatio(profit, roi);
      if (profit <= 0) {
        return { tone: "danger", glyph: { kind: "profitability", arcRatio: 0 } };
      }
      if (roi < 0) {
        return { tone: "warning", glyph: { kind: "profitability", arcRatio } };
      }
      return { tone: "success", glyph: { kind: "profitability", arcRatio } };
    }
    case "allocations": {
      const device = metricAmount(metrics, "device-compensation");
      const charity = metricAmount(metrics, "charity");
      const pbc = metricAmount(metrics, "pbc");
      const shares = sharesAgainstMax([device, charity, pbc]);
      const blocks: [number, number, number] = [
        shares[0] ?? 0,
        shares[1] ?? 0,
        shares[2] ?? 0,
      ];
      const tone: InstrumentPlateTone =
        device > 0 || charity > 0 || pbc > 0 ? "info" : "neutral";
      return { tone, glyph: { kind: "allocations", blocks } };
    }
    default: {
      const _exhaustive: never = cardId;
      return _exhaustive;
    }
  }
}
