/** Price member tracked time for Money team bills (cost rates; waste tracked separately). */

import { amountCentsFromDurationAndRate } from "./client-billable-income";

export type MemberPayableIncomeRow = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  durationSeconds: number;
  isWaste: boolean;
  costRateCents: number | null;
};

export type MemberMoneyActivity = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  /** Non-waste seconds. */
  durationSeconds: number;
  payableCents: number;
  wasteCents: number;
};

/** Aggregate per-member payable/waste cents at cost rates. */
export function aggregateMemberPayableIncome(
  rows: ReadonlyArray<MemberPayableIncomeRow>,
): MemberMoneyActivity[] {
  const byUser = new Map<string, MemberMoneyActivity>();

  for (const row of rows) {
    const rate = row.costRateCents ?? 0;
    const cents = amountCentsFromDurationAndRate(row.durationSeconds, rate);
    const existing = byUser.get(row.userId) ?? {
      userId: row.userId,
      userName: row.userName,
      userAvatar: row.userAvatar,
      durationSeconds: 0,
      payableCents: 0,
      wasteCents: 0,
    };

    if (row.isWaste) {
      existing.wasteCents += cents;
    } else {
      existing.durationSeconds += row.durationSeconds;
      existing.payableCents += cents;
    }
    if (!existing.userAvatar && row.userAvatar) existing.userAvatar = row.userAvatar;
    byUser.set(row.userId, existing);
  }

  return [...byUser.values()].sort((a, b) => a.userName.localeCompare(b.userName));
}
