import type { MoneyStatsCardId } from "@/features/billing/money-stats-fixtures";
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
      return { shortTitle: "Profitability", destinationHint: "Payout run", tone: "success" };
    case "allocations":
      return { shortTitle: "Allocations", destinationHint: "Formulas", tone: "info" };
    default: {
      const _exhaustive: never = cardId;
      return _exhaustive;
    }
  }
}
