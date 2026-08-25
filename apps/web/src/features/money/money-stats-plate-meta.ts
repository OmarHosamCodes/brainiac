import type { MoneyStatsCardId, MoneyStatsMetricId } from "@/features/billing/money-stats-fixtures";
import type { InstrumentPlateTone } from "@/features/member-profile/member-profile-instrument-plate";

export function moneyStatsPlateMeta(cardId: MoneyStatsCardId): {
  shortTitle: string;
  destinationHint: string;
  tone: InstrumentPlateTone;
} {
  switch (cardId) {
    case "income-cash":
      return { shortTitle: "Income", destinationHint: "Client bills", tone: "info" };
    case "deductions":
      return { shortTitle: "Deductions", destinationHint: "Outgoing", tone: "neutral" };
    case "profitability":
      return { shortTitle: "Profitability", destinationHint: "Adjustments", tone: "success" };
    case "allocations":
      return { shortTitle: "Allocations", destinationHint: "Formulas", tone: "info" };
    default: {
      const _exhaustive: never = cardId;
      return _exhaustive;
    }
  }
}

export function moneyStatsMetricDestination(metricId: MoneyStatsMetricId): string {
  switch (metricId) {
    case "total-income":
      return "client bills";
    case "received":
      return "paid client bills";
    case "remaining":
      return "outstanding client bills";
    case "salaries":
    case "paid-vacation":
    case "device-compensation":
      return "team costs";
    case "expenses":
      return "expenses";
    case "debt-discount":
    case "charity":
    case "pbc":
    case "team-profit":
    case "roi":
      return "adjustments";
    case "profit-loss-share":
      return "Money formulas";
    default: {
      const _exhaustive: never = metricId;
      return _exhaustive;
    }
  }
}
