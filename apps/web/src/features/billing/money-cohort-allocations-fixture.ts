/** Seed defaults for Money settings Rules / Formulas panes (live data from API). */

export type MoneyCohortRuleId = "profit-loss-share" | "rent-allowance" | "device-compensation";

export type MoneyCalcOptionId =
  | "roi-variables"
  | "charity"
  | "profit-loss-share"
  | "paid-vacation"
  | "device-compensation"
  | "pbc";

export type MoneyCohortRuleFixture = {
  id: MoneyCohortRuleId;
  benefit: string;
  cohort: string;
  memberCount: number | null;
};

export type MoneyCalcOptionFixture = {
  id: MoneyCalcOptionId;
  label: string;
  summary: string;
};

export type MoneyCohortPane = "rules" | "formulas";

export const MONEY_COHORT_PANE_OPTIONS: ReadonlyArray<{
  id: MoneyCohortPane;
  label: string;
  description: string;
}> = [
  {
    id: "rules",
    label: "Rules",
    description: "Who qualifies for extras or reductions",
  },
  {
    id: "formulas",
    label: "Formulas",
    description: "How ROI, charity, shares, and vacation are calculated",
  },
];

export const MONEY_COHORT_RULES_FIXTURE: MoneyCohortRuleFixture[] = [
  {
    id: "profit-loss-share",
    benefit: "Profit share / Loss share",
    cohort: "All members except interns",
    memberCount: null,
  },
  {
    id: "rent-allowance",
    benefit: "Rent allowance",
    cohort: "5 members",
    memberCount: 5,
  },
];

export const MONEY_CALC_OPTIONS_FIXTURE: MoneyCalcOptionFixture[] = [
  {
    id: "roi-variables",
    label: "ROI variables",
    summary: "Team profit ÷ total income",
  },
  {
    id: "charity",
    label: "Charity",
    summary: "Fixed period allocation",
  },
  {
    id: "profit-loss-share",
    label: "Profit / Loss share",
    summary: "Cohort-gated team result",
  },
  {
    id: "paid-vacation",
    label: "Paid vacation",
    summary: "200H · salary-rate conversion",
  },
  {
    id: "device-compensation",
    label: "Device compensation",
    summary: "Per-member stipend",
  },
  {
    id: "pbc",
    label: "PBC",
    summary: "Performance bonus pool",
  },
];
