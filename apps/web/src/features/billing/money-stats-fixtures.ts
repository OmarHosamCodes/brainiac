/** Fin-Sheet-shaped metric ids/labels for Money stats. Amounts come from periodScoreboard (fixtures kept for tests). */

export type MoneyStatsCardId = "income-cash" | "deductions" | "profitability" | "allocations";

export type MoneyStatsMetricId =
  | "total-income"
  | "received"
  | "remaining"
  | "salaries"
  | "expenses"
  | "debt-discount"
  | "paid-vacation"
  | "team-profit"
  | "profit-loss-share"
  | "roi"
  | "device-compensation"
  | "charity"
  | "pbc";

export type MoneyStatsMetricKind = "currency" | "percent";

export type MoneyStatsMetricTone = "default" | "positive" | "caution" | "danger";

export type MoneyStatsMetricFixture = {
  id: MoneyStatsMetricId;
  label: string;
  kind: MoneyStatsMetricKind;
  /** Currency: major units. Percent: 0–1 fraction. */
  amount: number;
  tone?: MoneyStatsMetricTone;
};

export type MoneyStatsCardFixture = {
  id: MoneyStatsCardId;
  title: string;
  /** North-star metric shown as the card hero. */
  primaryMetricId: MoneyStatsMetricId;
  metrics: MoneyStatsMetricFixture[];
};

export const MONEY_STATS_FIXTURE_CURRENCY = "EGP";

export const MONEY_STATS_CARDS_FIXTURE: MoneyStatsCardFixture[] = [
  {
    id: "income-cash",
    title: "Income & cash flow",
    primaryMetricId: "received",
    metrics: [
      { id: "total-income", label: "Total income", kind: "currency", amount: 186_400 },
      { id: "received", label: "Received", kind: "currency", amount: 112_200, tone: "positive" },
      {
        id: "remaining",
        label: "Remaining",
        kind: "currency",
        amount: 74_200,
        tone: "caution",
      },
    ],
  },
  {
    id: "deductions",
    title: "Deductions & expenses",
    primaryMetricId: "salaries",
    metrics: [
      { id: "salaries", label: "Salaries", kind: "currency", amount: 84_000 },
      { id: "expenses", label: "Expenses", kind: "currency", amount: 18_500 },
      { id: "debt-discount", label: "Debt / Discount", kind: "currency", amount: 4_200 },
      { id: "paid-vacation", label: "Paid off days", kind: "currency", amount: 6_800 },
    ],
  },
  {
    id: "profitability",
    title: "Profitability",
    primaryMetricId: "team-profit",
    metrics: [
      {
        id: "team-profit",
        label: "Team profit",
        kind: "currency",
        amount: 42_100,
        tone: "positive",
      },
      {
        id: "profit-loss-share",
        label: "Profit share / Loss share",
        kind: "currency",
        amount: 12_600,
      },
      { id: "roi", label: "ROI", kind: "percent", amount: 0.184 },
    ],
  },
  {
    id: "allocations",
    title: "Additional allocations",
    primaryMetricId: "device-compensation",
    metrics: [
      { id: "device-compensation", label: "Device compensation", kind: "currency", amount: 3_500 },
      { id: "charity", label: "Charity", kind: "currency", amount: 2_000 },
      { id: "pbc", label: "PBC", kind: "currency", amount: 1_500 },
    ],
  },
];
