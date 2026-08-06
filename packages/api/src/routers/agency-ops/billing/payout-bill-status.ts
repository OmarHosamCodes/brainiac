import type { AgencyOpsPayoutLineStatus, AgencyOpsPayoutRunStatus } from "@orch/db/schema";

/** Bills Team chip lens. */
export type PayoutBillStatus = "outstanding" | "partial" | "paid";

export function payoutRemainingAmount(amount: number, paidAmount: number): number {
  return Math.max(0, amount - paidAmount);
}

export function payoutBillStatus(status: AgencyOpsPayoutLineStatus): PayoutBillStatus {
  switch (status) {
    case "draft":
      return "outstanding";
    case "partial":
      return "partial";
    case "paid":
      return "paid";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Statuses that match a Bills Team status chip. */
export function payoutStatusesForBillFilter(
  billStatus: PayoutBillStatus,
): AgencyOpsPayoutLineStatus[] {
  switch (billStatus) {
    case "outstanding":
      return ["draft"];
    case "partial":
      return ["partial"];
    case "paid":
      return ["paid"];
    default: {
      const _exhaustive: never = billStatus;
      return _exhaustive;
    }
  }
}

/**
 * Next line status after applying a paid total.
 */
export function payoutLineStatusAfterPaid(
  amount: number,
  paidAmount: number,
): AgencyOpsPayoutLineStatus {
  if (paidAmount <= 0) return "draft";
  if (paidAmount >= amount) return "paid";
  return "partial";
}

/** Derive run status from line statuses. */
export function payoutRunStatusFromLines(
  lines: ReadonlyArray<{ status: AgencyOpsPayoutLineStatus }>,
): AgencyOpsPayoutRunStatus {
  if (lines.length === 0) return "draft";
  if (lines.every((line) => line.status === "paid")) return "paid";
  if (lines.some((line) => line.status === "partial" || line.status === "paid")) return "paying";
  return "draft";
}
