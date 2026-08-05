/** Approach 02 — segmented pool allocation for client + team bill rows. */

export type MoneyBillAllocationParty = "client" | "team";

export type MoneyBillAllocationCents = {
  totalCents: number;
  receivedCents: number;
  remainingCents: number;
  uninvoicedCents: number;
  wasteCents: number;
  currency: string;
  party?: MoneyBillAllocationParty;
};

export type MoneyBillAllocationSegmentId = "received" | "remaining" | "uninvoiced";

export type MoneyBillAllocationSegment = {
  id: MoneyBillAllocationSegmentId;
  percent: number;
};

export type MoneyBillAllocationView = MoneyBillAllocationCents & {
  party: MoneyBillAllocationParty;
  receivedTitle: string;
  remainingTitle: string;
  uninvoicedTitle: string;
  receivedLabel: string;
  remainingLabel: string;
  uninvoicedLabel: string;
  totalLabel: string;
  wasteLabel: string;
  segments: MoneyBillAllocationSegment[];
  ariaLabel: string;
};

function formatCents(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}

function titlesForParty(party: MoneyBillAllocationParty): {
  receivedTitle: string;
  remainingTitle: string;
  uninvoicedTitle: string;
} {
  switch (party) {
    case "client":
      return {
        receivedTitle: "Received",
        remainingTitle: "Remaining",
        uninvoicedTitle: "Uninvoiced",
      };
    case "team":
      return {
        receivedTitle: "Paid",
        remainingTitle: "Remaining",
        uninvoicedTitle: "Ready",
      };
    default: {
      const _exhaustive: never = party;
      return _exhaustive;
    }
  }
}

export function buildMoneyBillAllocation(input: MoneyBillAllocationCents): MoneyBillAllocationView {
  const party = input.party ?? "client";
  const titles = titlesForParty(party);
  const totalCents = Math.max(0, input.totalCents);
  const receivedCents = Math.max(0, input.receivedCents);
  const remainingCents = Math.max(0, input.remainingCents);
  const uninvoicedCents = Math.max(0, input.uninvoicedCents);
  const wasteCents = Math.max(0, input.wasteCents);
  const currency = input.currency;

  const parts: Array<{ id: MoneyBillAllocationSegmentId; cents: number }> = [
    { id: "received", cents: receivedCents },
    { id: "remaining", cents: remainingCents },
    { id: "uninvoiced", cents: uninvoicedCents },
  ];

  const segments: MoneyBillAllocationSegment[] =
    totalCents <= 0
      ? []
      : parts
          .filter((part) => part.cents > 0)
          .map((part) => ({
            id: part.id,
            percent: Math.min(100, Math.max(0, (part.cents / totalCents) * 100)),
          }));

  const receivedLabel = formatCents(receivedCents, currency);
  const remainingLabel = formatCents(remainingCents, currency);
  const uninvoicedLabel = formatCents(uninvoicedCents, currency);
  const totalLabel = formatCents(totalCents, currency);
  const wasteLabel = formatCents(wasteCents, currency);

  return {
    totalCents,
    receivedCents,
    remainingCents,
    uninvoicedCents,
    wasteCents,
    currency,
    party,
    ...titles,
    receivedLabel,
    remainingLabel,
    uninvoicedLabel,
    totalLabel,
    wasteLabel,
    segments,
    ariaLabel: `Total ${totalLabel}: ${titles.receivedTitle.toLowerCase()} ${receivedLabel}, remaining ${remainingLabel}, ${titles.uninvoicedTitle.toLowerCase()} ${uninvoicedLabel}, waste ${wasteLabel}`,
  };
}

export function allocationFromReadyClient(input: {
  billableCents: number;
  wasteCents: number;
  currency: string;
}): MoneyBillAllocationView {
  return buildMoneyBillAllocation({
    totalCents: input.billableCents,
    receivedCents: 0,
    remainingCents: 0,
    uninvoicedCents: input.billableCents,
    wasteCents: input.wasteCents,
    currency: input.currency,
    party: "client",
  });
}

export function allocationFromInvoice(input: {
  amountCents: number;
  receivedCents: number;
  remainingCents: number;
  wasteCents: number;
  currency: string;
}): MoneyBillAllocationView {
  return buildMoneyBillAllocation({
    totalCents: input.amountCents,
    receivedCents: input.receivedCents,
    remainingCents: input.remainingCents,
    uninvoicedCents: 0,
    wasteCents: input.wasteCents,
    currency: input.currency,
    party: "client",
  });
}

export function allocationFromReadyMember(input: {
  payableCents: number;
  wasteCents: number;
  currency: string;
}): MoneyBillAllocationView {
  return buildMoneyBillAllocation({
    totalCents: input.payableCents,
    receivedCents: 0,
    remainingCents: 0,
    uninvoicedCents: input.payableCents,
    wasteCents: input.wasteCents,
    currency: input.currency,
    party: "team",
  });
}

export function allocationFromPayout(input: {
  amountCents: number;
  paidCents: number;
  remainingCents: number;
  wasteCents: number;
  currency: string;
}): MoneyBillAllocationView {
  return buildMoneyBillAllocation({
    totalCents: input.amountCents,
    receivedCents: input.paidCents,
    remainingCents: input.remainingCents,
    uninvoicedCents: 0,
    wasteCents: input.wasteCents,
    currency: input.currency,
    party: "team",
  });
}
