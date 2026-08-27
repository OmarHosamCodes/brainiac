import type { AgencyOpsPayoutSectionKey } from "@orch/db/schema";

export const PAYOUT_SECTION_META: Record<
  AgencyOpsPayoutSectionKey,
  { title: string; sortOrder: number; billsParty: "team" | "adjustments" }
> = {
  salaries: { title: "Salaries", sortOrder: 0, billsParty: "team" },
  team_loss: { title: "Team loss", sortOrder: 1, billsParty: "team" },
  device_comp: { title: "Device compensation", sortOrder: 2, billsParty: "team" },
  paid_vacation: { title: "Paid vacation", sortOrder: 3, billsParty: "team" },
  debt_discount: { title: "Debt / Discount", sortOrder: 4, billsParty: "adjustments" },
  charity: { title: "Charity", sortOrder: 5, billsParty: "adjustments" },
  pbc: { title: "PBC", sortOrder: 6, billsParty: "adjustments" },
};

export const ADJUSTMENT_SECTION_KEYS: AgencyOpsPayoutSectionKey[] = [
  "debt_discount",
  "charity",
  "pbc",
];

export const TEAM_SECTION_KEYS: AgencyOpsPayoutSectionKey[] = [
  "salaries",
  "team_loss",
  "device_comp",
  "paid_vacation",
];

export function isPayoutSectionKey(value: string): value is AgencyOpsPayoutSectionKey {
  return value in PAYOUT_SECTION_META;
}

/** Formula sync writes these; salaries and debt/discount stay manual. */
export function isFormulaSyncedPayoutSection(key: AgencyOpsPayoutSectionKey): boolean {
  return key !== "salaries" && key !== "debt_discount";
}

export function isAdjustmentSectionKey(
  key: string,
): key is (typeof ADJUSTMENT_SECTION_KEYS)[number] {
  return (ADJUSTMENT_SECTION_KEYS as readonly string[]).includes(key);
}

export function payoutSectionKeysForBillsParty(
  party: "team" | "adjustments" | "all",
): AgencyOpsPayoutSectionKey[] | null {
  switch (party) {
    case "team":
      return TEAM_SECTION_KEYS;
    case "adjustments":
      return ADJUSTMENT_SECTION_KEYS;
    case "all":
      return null;
    default: {
      const _exhaustive: never = party;
      return _exhaustive;
    }
  }
}
