/** Price tracked time for Money income (billable rates; waste tracked separately). */

export function amountFromDurationAndRate(durationSeconds: number, rateAmount: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    throw new Error("durationSeconds must be a non-negative number.");
  }
  if (!Number.isFinite(rateAmount) || rateAmount < 0) {
    throw new Error("rateAmount must be a non-negative number.");
  }
  if (durationSeconds === 0 || rateAmount === 0) return 0;
  return Math.round((durationSeconds / 3600) * rateAmount);
}

export type ClientBillableIncomeRow = {
  clientId: string;
  clientName: string;
  category: "internal" | "external";
  userId: string;
  durationSeconds: number;
  isWaste: boolean;
  billableRateAmount: number | null;
};

export type ClientMoneyActivity = {
  clientId: string;
  clientName: string;
  category: "internal" | "external";
  /** Non-waste seconds. */
  durationSeconds: number;
  billableAmount: number;
  wasteAmount: number;
};

export type ExternalBillablePool = {
  billablePoolAmount: number;
  clients: ClientMoneyActivity[];
};

/** Aggregate per-client billable/waste amounts; pool sums external non-waste only. */
export function aggregateExternalBillableIncome(
  rows: ReadonlyArray<ClientBillableIncomeRow>,
): ExternalBillablePool {
  const byClient = new Map<string, ClientMoneyActivity>();

  for (const row of rows) {
    const rate = row.billableRateAmount ?? 0;
    const lineAmount = amountFromDurationAndRate(row.durationSeconds, rate);
    const existing = byClient.get(row.clientId) ?? {
      clientId: row.clientId,
      clientName: row.clientName,
      category: row.category,
      durationSeconds: 0,
      billableAmount: 0,
      wasteAmount: 0,
    };

    if (row.isWaste) {
      existing.wasteAmount += lineAmount;
    } else {
      existing.durationSeconds += row.durationSeconds;
      existing.billableAmount += lineAmount;
    }
    byClient.set(row.clientId, existing);
  }

  const clients = [...byClient.values()].sort((a, b) => a.clientName.localeCompare(b.clientName));
  let billablePoolAmount = 0;
  for (const client of clients) {
    if (client.category === "external") {
      billablePoolAmount += client.billableAmount;
    }
  }

  return { billablePoolAmount, clients };
}
