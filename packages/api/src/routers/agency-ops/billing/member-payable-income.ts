/** Price member tracked time for Money team bills (cost rates; waste tracked separately). */

import { amountFromDurationAndRate } from "./client-billable-income";

export type MemberPayableIncomeRow = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  durationSeconds: number;
  isWaste: boolean;
  costRateAmount: number | null;
};

export type MemberMoneyActivity = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  /** Non-waste seconds. */
  durationSeconds: number;
  payableAmount: number;
  wasteAmount: number;
};

/** Aggregate per-member payable/waste amounts at cost rates. */
export function aggregateMemberPayableIncome(
  rows: ReadonlyArray<MemberPayableIncomeRow>,
): MemberMoneyActivity[] {
  const byUser = new Map<string, MemberMoneyActivity>();

  for (const row of rows) {
    const rate = row.costRateAmount ?? 0;
    const lineAmount = amountFromDurationAndRate(row.durationSeconds, rate);
    const existing = byUser.get(row.userId) ?? {
      userId: row.userId,
      userName: row.userName,
      userAvatar: row.userAvatar,
      durationSeconds: 0,
      payableAmount: 0,
      wasteAmount: 0,
    };

    if (row.isWaste) {
      existing.wasteAmount += lineAmount;
    } else {
      existing.durationSeconds += row.durationSeconds;
      existing.payableAmount += lineAmount;
    }
    if (!existing.userAvatar && row.userAvatar) existing.userAvatar = row.userAvatar;
    byUser.set(row.userId, existing);
  }

  return [...byUser.values()].sort((a, b) => a.userName.localeCompare(b.userName));
}
