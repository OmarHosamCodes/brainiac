/** Pure helpers: current + prior carry obligations for Money compose-on-demand. */

export type MoneyCarryPeriod = {
  periodStart: string;
  periodEnd: string;
};

export type MoneyCarryOpenDoc = MoneyCarryPeriod & {
  id: string;
  remainingCents: number;
  amountCents: number;
  receivedOrPaidCents: number;
};

export type MoneyCarryReadySlice = MoneyCarryPeriod & {
  partyId: string;
  partyName: string;
  amountCents: number;
  durationSeconds: number;
  wasteCents: number;
};

export type MoneyCarryClientObligation =
  | {
      kind: "invoice";
      id: string;
      clientId: string;
      clientName: string;
      periodStart: string;
      periodEnd: string;
      isCarry: boolean;
      amountCents: number;
      receivedCents: number;
      remainingCents: number;
      wasteCents: number;
      durationSeconds: number;
      number: string | null;
    }
  | {
      kind: "ready";
      id: string;
      clientId: string;
      clientName: string;
      periodStart: string;
      periodEnd: string;
      isCarry: boolean;
      amountCents: number;
      receivedCents: 0;
      remainingCents: number;
      wasteCents: number;
      durationSeconds: number;
      number: null;
    };

export type MoneyCarryMemberObligation =
  | {
      kind: "payout";
      id: string;
      userId: string;
      userName: string;
      userAvatar: string | null;
      periodStart: string;
      periodEnd: string;
      isCarry: boolean;
      amountCents: number;
      paidCents: number;
      remainingCents: number;
      wasteCents: number;
      durationSeconds: number;
    }
  | {
      kind: "ready";
      id: string;
      userId: string;
      userName: string;
      userAvatar: string | null;
      periodStart: string;
      periodEnd: string;
      isCarry: boolean;
      amountCents: number;
      paidCents: 0;
      remainingCents: number;
      wasteCents: number;
      durationSeconds: number;
    };

function periodEndsBefore(periodEndIso: string, rangeStartIso: string): boolean {
  return new Date(periodEndIso).getTime() < new Date(rangeStartIso).getTime();
}

function periodsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return (
    new Date(aStart).getTime() <= new Date(bEnd).getTime() &&
    new Date(aEnd).getTime() >= new Date(bStart).getTime()
  );
}

/** Open docs whose period ends before the viewing range (carry-in). */
export function selectOpenPriorDocs<T extends MoneyCarryOpenDoc>(
  docs: T[],
  rangeStartIso: string,
): T[] {
  return docs.filter(
    (doc) => doc.remainingCents > 0 && periodEndsBefore(doc.periodEnd, rangeStartIso),
  );
}

/** Docs overlapping the viewing range (current period). */
export function selectCurrentPeriodDocs<T extends MoneyCarryPeriod & { id: string }>(
  docs: T[],
  rangeStartIso: string,
  rangeEndIso: string,
): T[] {
  return docs.filter((doc) =>
    periodsOverlap(doc.periodStart, doc.periodEnd, rangeStartIso, rangeEndIso),
  );
}

/**
 * Ready slices with no covering document overlapping that slice's period.
 * Used for both current-period Ready and prior Ready carry.
 */
export function selectUncoveredReadySlices<T extends MoneyCarryReadySlice>(
  slices: T[],
  coveringDocs: MoneyCarryPeriod[],
): T[] {
  return slices.filter(
    (slice) =>
      slice.amountCents > 0 &&
      !coveringDocs.some((doc) =>
        periodsOverlap(doc.periodStart, doc.periodEnd, slice.periodStart, slice.periodEnd),
      ),
  );
}

export function buildClientObligations(input: {
  rangeStart: string;
  rangeEnd: string;
  invoices: Array<{
    id: string;
    clientId: string;
    clientName: string;
    number: string;
    periodStart: string;
    periodEnd: string;
    amountCents: number;
    receivedCents: number;
    remainingCents: number;
  }>;
  readySlices: Array<{
    clientId: string;
    clientName: string;
    periodStart: string;
    periodEnd: string;
    amountCents: number;
    durationSeconds: number;
    wasteCents: number;
  }>;
}): MoneyCarryClientObligation[] {
  const out: MoneyCarryClientObligation[] = [];

  for (const invoice of input.invoices) {
    const isCarry = periodEndsBefore(invoice.periodEnd, input.rangeStart);
    const inCurrent = periodsOverlap(
      invoice.periodStart,
      invoice.periodEnd,
      input.rangeStart,
      input.rangeEnd,
    );
    if (!inCurrent && !(isCarry && invoice.remainingCents > 0)) continue;
    if (isCarry && invoice.remainingCents <= 0) continue;

    out.push({
      kind: "invoice",
      id: invoice.id,
      clientId: invoice.clientId,
      clientName: invoice.clientName,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      isCarry: isCarry && !inCurrent,
      amountCents: invoice.amountCents,
      receivedCents: invoice.receivedCents,
      remainingCents: invoice.remainingCents,
      wasteCents: 0,
      durationSeconds: 0,
      number: invoice.number,
    });
  }

  // Ready = residual activity after overlapping invoice amounts for that slice.
  for (const slice of input.readySlices) {
    if (slice.amountCents <= 0) continue;
    const invoicedCents = input.invoices
      .filter(
        (invoice) =>
          invoice.clientId === slice.clientId &&
          periodsOverlap(
            invoice.periodStart,
            invoice.periodEnd,
            slice.periodStart,
            slice.periodEnd,
          ),
      )
      .reduce((sum, invoice) => sum + invoice.amountCents, 0);
    const readyCents = Math.max(0, slice.amountCents - invoicedCents);
    if (readyCents <= 0) continue;

    const isCarry = periodEndsBefore(slice.periodEnd, input.rangeStart);
    const inCurrent = periodsOverlap(
      slice.periodStart,
      slice.periodEnd,
      input.rangeStart,
      input.rangeEnd,
    );
    if (!inCurrent && !isCarry) continue;

    out.push({
      kind: "ready",
      id: `ready:client:${slice.clientId}:${slice.periodStart}:${slice.periodEnd}`,
      clientId: slice.clientId,
      clientName: slice.clientName,
      periodStart: slice.periodStart,
      periodEnd: slice.periodEnd,
      isCarry,
      amountCents: readyCents,
      receivedCents: 0,
      remainingCents: readyCents,
      wasteCents: slice.wasteCents,
      durationSeconds: slice.durationSeconds,
      number: null,
    });
  }

  return out.sort((a, b) => {
    if (a.clientName !== b.clientName) return a.clientName.localeCompare(b.clientName);
    if (a.isCarry !== b.isCarry) return a.isCarry ? 1 : -1;
    return a.periodStart.localeCompare(b.periodStart);
  });
}

export function buildMemberObligations(input: {
  rangeStart: string;
  rangeEnd: string;
  payouts: Array<{
    id: string;
    userId: string;
    userName: string;
    userAvatar: string | null;
    periodStart: string;
    periodEnd: string;
    amountCents: number;
    paidCents: number;
    remainingCents: number;
    durationSeconds: number;
  }>;
  readySlices: Array<{
    userId: string;
    userName: string;
    userAvatar: string | null;
    periodStart: string;
    periodEnd: string;
    amountCents: number;
    durationSeconds: number;
    wasteCents: number;
  }>;
}): MoneyCarryMemberObligation[] {
  const out: MoneyCarryMemberObligation[] = [];

  for (const payout of input.payouts) {
    const isCarry = periodEndsBefore(payout.periodEnd, input.rangeStart);
    const inCurrent = periodsOverlap(
      payout.periodStart,
      payout.periodEnd,
      input.rangeStart,
      input.rangeEnd,
    );
    if (!inCurrent && !(isCarry && payout.remainingCents > 0)) continue;
    if (isCarry && payout.remainingCents <= 0) continue;

    out.push({
      kind: "payout",
      id: payout.id,
      userId: payout.userId,
      userName: payout.userName,
      userAvatar: payout.userAvatar,
      periodStart: payout.periodStart,
      periodEnd: payout.periodEnd,
      isCarry: isCarry && !inCurrent,
      amountCents: payout.amountCents,
      paidCents: payout.paidCents,
      remainingCents: payout.remainingCents,
      wasteCents: 0,
      durationSeconds: payout.durationSeconds,
    });
  }

  for (const slice of input.readySlices) {
    if (slice.amountCents <= 0) continue;
    const paidOutCents = input.payouts
      .filter(
        (payout) =>
          payout.userId === slice.userId &&
          periodsOverlap(payout.periodStart, payout.periodEnd, slice.periodStart, slice.periodEnd),
      )
      .reduce((sum, payout) => sum + payout.amountCents, 0);
    const readyCents = Math.max(0, slice.amountCents - paidOutCents);
    if (readyCents <= 0) continue;

    const isCarry = periodEndsBefore(slice.periodEnd, input.rangeStart);
    const inCurrent = periodsOverlap(
      slice.periodStart,
      slice.periodEnd,
      input.rangeStart,
      input.rangeEnd,
    );
    if (!inCurrent && !isCarry) continue;

    out.push({
      kind: "ready",
      id: `ready:member:${slice.userId}:${slice.periodStart}:${slice.periodEnd}`,
      userId: slice.userId,
      userName: slice.userName,
      userAvatar: slice.userAvatar,
      periodStart: slice.periodStart,
      periodEnd: slice.periodEnd,
      isCarry,
      amountCents: readyCents,
      paidCents: 0,
      remainingCents: readyCents,
      wasteCents: slice.wasteCents,
      durationSeconds: slice.durationSeconds,
    });
  }

  return out.sort((a, b) => {
    if (a.userName !== b.userName) return a.userName.localeCompare(b.userName);
    if (a.isCarry !== b.isCarry) return a.isCarry ? 1 : -1;
    return a.periodStart.localeCompare(b.periodStart);
  });
}

/** Group selected obligation periods for combine vs split export. */
export function groupObligationsForExport(
  obligations: MoneyCarryPeriod[],
  mode: "combine" | "split",
): MoneyCarryPeriod[][] {
  if (obligations.length === 0) return [];
  if (mode === "combine") return [obligations];
  const byPeriod = new Map<string, MoneyCarryPeriod[]>();
  for (const item of obligations) {
    const key = `${item.periodStart}|${item.periodEnd}`;
    const list = byPeriod.get(key) ?? [];
    list.push(item);
    byPeriod.set(key, list);
  }
  return [...byPeriod.values()];
}

export type MoneyPendingAdjustmentKind = "discount" | "surcharge" | "debt";

/** Apply pending Adjust deltas: discount reduces, surcharge/debt increase. */
export function applyPendingAdjustmentCents(
  baseCents: number,
  adjustments: ReadonlyArray<{ kind: MoneyPendingAdjustmentKind; amountCents: number }>,
): number {
  let total = baseCents;
  for (const adj of adjustments) {
    switch (adj.kind) {
      case "discount":
        total -= adj.amountCents;
        break;
      case "surcharge":
      case "debt":
        total += adj.amountCents;
        break;
      default: {
        const _exhaustive: never = adj.kind;
        return _exhaustive;
      }
    }
  }
  return Math.max(0, total);
}
