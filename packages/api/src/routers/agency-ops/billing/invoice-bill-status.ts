import type { AgencyOpsInvoiceStatus } from "@orch/db/schema";

/** Bills Clients chip lens (Fin-Sheet). */
export type InvoiceBillStatus = "outstanding" | "partial" | "paid" | "refunded";

export function invoiceRemainingAmount(amount: number, receivedAmount: number): number {
  return Math.max(0, amount - receivedAmount);
}

export function invoiceBillStatus(status: AgencyOpsInvoiceStatus): InvoiceBillStatus {
  switch (status) {
    case "draft":
    case "sent":
      return "outstanding";
    case "partial":
      return "partial";
    case "paid":
      return "paid";
    case "refunded":
      return "refunded";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Statuses that match a Bills Clients status chip. */
export function invoiceStatusesForBillFilter(
  billStatus: InvoiceBillStatus,
): AgencyOpsInvoiceStatus[] {
  switch (billStatus) {
    case "outstanding":
      return ["draft", "sent"];
    case "partial":
      return ["partial"];
    case "paid":
      return ["paid"];
    case "refunded":
      return ["refunded"];
    default: {
      const _exhaustive: never = billStatus;
      return _exhaustive;
    }
  }
}

/**
 * Next lifecycle status after applying a received total.
 * Refunded invoices stay refunded.
 */
export function invoiceStatusAfterReceived(
  amount: number,
  receivedAmount: number,
  current: AgencyOpsInvoiceStatus,
): AgencyOpsInvoiceStatus {
  if (current === "refunded") return "refunded";
  if (receivedAmount <= 0) {
    return current === "draft" ? "draft" : "sent";
  }
  if (receivedAmount >= amount) return "paid";
  return "partial";
}
