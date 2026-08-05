/** Price tracked time for Money income (billable rates; waste tracked separately). */

export function amountCentsFromDurationAndRate(durationSeconds: number, rateCents: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    throw new Error("durationSeconds must be a non-negative number.");
  }
  if (!Number.isFinite(rateCents) || rateCents < 0) {
    throw new Error("rateCents must be a non-negative number.");
  }
  if (durationSeconds === 0 || rateCents === 0) return 0;
  return Math.round((durationSeconds / 3600) * rateCents);
}

export type ClientBillableIncomeRow = {
  clientId: string;
  clientName: string;
  category: "internal" | "external";
  userId: string;
  durationSeconds: number;
  isWaste: boolean;
  billableRateCents: number | null;
};

export type ClientMoneyActivity = {
  clientId: string;
  clientName: string;
  category: "internal" | "external";
  /** Non-waste seconds. */
  durationSeconds: number;
  billableCents: number;
  wasteCents: number;
};

export type ExternalBillablePool = {
  billablePoolCents: number;
  clients: ClientMoneyActivity[];
};

/** Aggregate per-client billable/waste cents; pool sums external non-waste only. */
export function aggregateExternalBillableIncome(
  rows: ReadonlyArray<ClientBillableIncomeRow>,
): ExternalBillablePool {
  const byClient = new Map<string, ClientMoneyActivity>();

  for (const row of rows) {
    const rate = row.billableRateCents ?? 0;
    const cents = amountCentsFromDurationAndRate(row.durationSeconds, rate);
    const existing = byClient.get(row.clientId) ?? {
      clientId: row.clientId,
      clientName: row.clientName,
      category: row.category,
      durationSeconds: 0,
      billableCents: 0,
      wasteCents: 0,
    };

    if (row.isWaste) {
      existing.wasteCents += cents;
    } else {
      existing.durationSeconds += row.durationSeconds;
      existing.billableCents += cents;
    }
    byClient.set(row.clientId, existing);
  }

  const clients = [...byClient.values()].sort((a, b) => a.clientName.localeCompare(b.clientName));
  let billablePoolCents = 0;
  for (const client of clients) {
    if (client.category === "external") {
      billablePoolCents += client.billableCents;
    }
  }

  return { billablePoolCents, clients };
}
