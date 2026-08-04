/** Pure helpers for period bill activity (clients with time + members who worked). */

export type PeriodBillClientActivity = {
  clientId: string;
  clientName: string;
  durationSeconds: number;
};

export type PeriodBillMemberActivity = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  durationSeconds: number;
};

export function aggregatePeriodClientActivity(
  rows: Array<{ clientId: string; clientName: string; durationSeconds: number }>,
): PeriodBillClientActivity[] {
  const byClient = new Map<string, PeriodBillClientActivity>();
  for (const row of rows) {
    const existing = byClient.get(row.clientId);
    if (existing) {
      existing.durationSeconds += row.durationSeconds;
    } else {
      byClient.set(row.clientId, {
        clientId: row.clientId,
        clientName: row.clientName,
        durationSeconds: row.durationSeconds,
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
  }>,
): PeriodBillMemberActivity[] {
  const byUser = new Map<string, PeriodBillMemberActivity>();
  for (const row of rows) {
    const existing = byUser.get(row.userId);
    if (existing) {
      existing.durationSeconds += row.durationSeconds;
      if (!existing.userAvatar && row.userAvatar) existing.userAvatar = row.userAvatar;
    } else {
      byUser.set(row.userId, {
        userId: row.userId,
        userName: row.userName,
        userAvatar: row.userAvatar,
        durationSeconds: row.durationSeconds,
      });
    }
  }
  return [...byUser.values()].sort((a, b) => a.userName.localeCompare(b.userName));
}

/** Clients with time that do not yet have an overlapping invoice. */
export function uninvoicedPeriodClients(
  clients: PeriodBillClientActivity[],
  invoicedClientIds: Iterable<string>,
): PeriodBillClientActivity[] {
  const invoiced = new Set(invoicedClientIds);
  return clients.filter((client) => !invoiced.has(client.clientId));
}
