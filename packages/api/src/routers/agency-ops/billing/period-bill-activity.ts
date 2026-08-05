/** Pure helpers for period bill activity (clients with time + members who worked). */

export type PeriodBillClientActivity = {
  clientId: string;
  clientName: string;
  durationSeconds: number;
  billableCents: number;
  wasteCents: number;
};

export type PeriodBillMemberActivity = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  durationSeconds: number;
  payableCents: number;
  wasteCents: number;
};

export function aggregatePeriodClientActivity(
  rows: Array<{
    clientId: string;
    clientName: string;
    durationSeconds: number;
    billableCents?: number;
    wasteCents?: number;
  }>,
): PeriodBillClientActivity[] {
  const byClient = new Map<string, PeriodBillClientActivity>();
  for (const row of rows) {
    const existing = byClient.get(row.clientId);
    if (existing) {
      existing.durationSeconds += row.durationSeconds;
      existing.billableCents += row.billableCents ?? 0;
      existing.wasteCents += row.wasteCents ?? 0;
    } else {
      byClient.set(row.clientId, {
        clientId: row.clientId,
        clientName: row.clientName,
        durationSeconds: row.durationSeconds,
        billableCents: row.billableCents ?? 0,
        wasteCents: row.wasteCents ?? 0,
      });
    }
  }
  return [...byClient.values()].sort((a, b) => a.clientName.localeCompare(b.clientName));
}

export function aggregatePeriodMemberActivity(
  rows: Array<{
    userId: string;
    userName: string;
    userAvatar: string | null;
    durationSeconds: number;
    payableCents?: number;
    wasteCents?: number;
  }>,
): PeriodBillMemberActivity[] {
  const byUser = new Map<string, PeriodBillMemberActivity>();
  for (const row of rows) {
    const existing = byUser.get(row.userId);
    if (existing) {
      existing.durationSeconds += row.durationSeconds;
      existing.payableCents += row.payableCents ?? 0;
      existing.wasteCents += row.wasteCents ?? 0;
      if (!existing.userAvatar && row.userAvatar) existing.userAvatar = row.userAvatar;
    } else {
      byUser.set(row.userId, {
        userId: row.userId,
        userName: row.userName,
        userAvatar: row.userAvatar,
        durationSeconds: row.durationSeconds,
        payableCents: row.payableCents ?? 0,
        wasteCents: row.wasteCents ?? 0,
      });
    }
  }
  return [...byUser.values()].sort((a, b) => a.userName.localeCompare(b.userName));
}

/** Clients with billable time that do not yet have an overlapping invoice. */
export function uninvoicedPeriodClients(
  clients: PeriodBillClientActivity[],
  invoicedClientIds: Iterable<string>,
): PeriodBillClientActivity[] {
  const invoiced = new Set(invoicedClientIds);
  return clients.filter((client) => !invoiced.has(client.clientId) && client.durationSeconds > 0);
}
