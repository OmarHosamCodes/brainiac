import { formatDuration } from "@/lib/utils/format-duration";

import type { MoneyBillsPartyFilter, MoneyBillsStatusFilter } from "./money-bills-filters";

export type MoneyBillInvoiceStatus = "draft" | "sent" | "partial" | "paid" | "refunded";
export type MoneyBillStatus = "outstanding" | "partial" | "paid" | "refunded";

export type MoneyBillInvoiceSource = {
  id: string;
  clientId: string;
  clientName: string;
  number: string;
  status: MoneyBillInvoiceStatus;
  billStatus: MoneyBillStatus;
  amountCents: number;
  receivedCents: number;
  remainingCents: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
};

export type MoneyBillClientActivitySource = {
  clientId: string;
  clientName: string;
  durationSeconds: number;
};

export type MoneyBillMemberActivitySource = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  durationSeconds: number;
};

type MoneyBillRowBase = {
  id: string;
  title: string;
  subtitle: string;
  metaLabel: string;
  statusLabel: string;
  canSend: boolean;
  canMarkPaid: boolean;
  canRecordPayment: boolean;
  canRefund: boolean;
  canCreateInvoice: boolean;
};

export type MoneyBillInvoiceRow = MoneyBillRowBase & {
  kind: "invoice";
  party: "client";
  clientId: string;
  clientName: string;
  number: string;
  status: MoneyBillInvoiceStatus;
  billStatus: MoneyBillStatus;
  billStatusLabel: string;
  amountCents: number;
  receivedCents: number;
  remainingCents: number;
  currency: string;
  amountLabel: string;
  receivedLabel: string;
  remainingLabel: string;
  periodLabel: string;
};

export type MoneyBillClientActivityRow = MoneyBillRowBase & {
  kind: "client-activity";
  party: "client";
  clientId: string;
  clientName: string;
  durationSeconds: number;
  durationLabel: string;
};

export type MoneyBillMemberActivityRow = MoneyBillRowBase & {
  kind: "member-activity";
  party: "team";
  userId: string;
  userName: string;
  userAvatar: string | null;
  durationSeconds: number;
  durationLabel: string;
};

export type MoneyBillRow =
  | MoneyBillInvoiceRow
  | MoneyBillClientActivityRow
  | MoneyBillMemberActivityRow;

export function moneyBillStatusLabel(billStatus: MoneyBillStatus): string {
  switch (billStatus) {
    case "outstanding":
      return "Outstanding";
    case "partial":
      return "Partial";
    case "paid":
      return "Paid";
    case "refunded":
      return "Refunded";
    default: {
      const _exhaustive: never = billStatus;
      return _exhaustive;
    }
  }
}

export function formatMoneyBillCents(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatMoneyBillPeriod(periodStart: string, periodEnd: string): string {
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);
  const sameMonth =
    startDate.getUTCFullYear() === endDate.getUTCFullYear() &&
    startDate.getUTCMonth() === endDate.getUTCMonth();
  const startLabel = startDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const endLabel = endDate.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${startLabel} – ${endLabel}`;
}

/** Whether client invoice/activity rows belong under the current party lens. */
export function moneyBillsPartyShowsClients(party: MoneyBillsPartyFilter): boolean {
  return party === "all" || party === "client";
}

export function moneyBillsPartyShowsMembers(party: MoneyBillsPartyFilter): boolean {
  return party === "all" || party === "team";
}

export function moneyBillRowFromInvoice(invoice: MoneyBillInvoiceSource): MoneyBillInvoiceRow {
  const billStatusLabel = moneyBillStatusLabel(invoice.billStatus);
  const periodLabel = formatMoneyBillPeriod(invoice.periodStart, invoice.periodEnd);
  const amountLabel = formatMoneyBillCents(invoice.amountCents, invoice.currency);
  return {
    kind: "invoice",
    id: invoice.id,
    party: "client",
    title: invoice.clientName,
    subtitle: `${invoice.number} · ${periodLabel}`,
    metaLabel: amountLabel,
    statusLabel: billStatusLabel,
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    number: invoice.number,
    status: invoice.status,
    billStatus: invoice.billStatus,
    billStatusLabel,
    amountCents: invoice.amountCents,
    receivedCents: invoice.receivedCents,
    remainingCents: invoice.remainingCents,
    currency: invoice.currency,
    amountLabel,
    receivedLabel: formatMoneyBillCents(invoice.receivedCents, invoice.currency),
    remainingLabel: formatMoneyBillCents(invoice.remainingCents, invoice.currency),
    periodLabel,
    canSend: invoice.status === "draft",
    canMarkPaid: invoice.status === "sent" || invoice.status === "partial",
    canRecordPayment: invoice.status === "sent" || invoice.status === "partial",
    canRefund:
      invoice.status === "sent" || invoice.status === "partial" || invoice.status === "paid",
    canCreateInvoice: false,
  };
}

export function moneyBillRowFromClientActivity(
  client: MoneyBillClientActivitySource,
): MoneyBillClientActivityRow {
  const durationLabel = formatDuration(client.durationSeconds, "short");
  return {
    kind: "client-activity",
    id: `client-activity:${client.clientId}`,
    party: "client",
    title: client.clientName,
    subtitle: "Ready to bill from tracked time",
    metaLabel: durationLabel,
    statusLabel: "Ready",
    clientId: client.clientId,
    clientName: client.clientName,
    durationSeconds: client.durationSeconds,
    durationLabel,
    canSend: false,
    canMarkPaid: false,
    canRecordPayment: false,
    canRefund: false,
    canCreateInvoice: true,
  };
}

export function moneyBillRowFromMemberActivity(
  member: MoneyBillMemberActivitySource,
): MoneyBillMemberActivityRow {
  const durationLabel = formatDuration(member.durationSeconds, "short");
  return {
    kind: "member-activity",
    id: `member-activity:${member.userId}`,
    party: "team",
    title: member.userName,
    subtitle: "Logged time this period",
    metaLabel: durationLabel,
    statusLabel: "Worked",
    userId: member.userId,
    userName: member.userName,
    userAvatar: member.userAvatar,
    durationSeconds: member.durationSeconds,
    durationLabel,
    canSend: false,
    canMarkPaid: false,
    canRecordPayment: false,
    canRefund: false,
    canCreateInvoice: false,
  };
}

/** Stable id for project-palette hue (client rows / invoices). */
export function moneyBillHueId(row: MoneyBillRow): string | null {
  switch (row.kind) {
    case "client-activity":
      return row.clientId;
    case "invoice":
      return row.clientId;
    case "member-activity":
      return null;
    default: {
      const _exhaustive: never = row;
      return _exhaustive;
    }
  }
}

export type MoneyBillRowSectionId = "ready" | "invoices" | "team";

export type MoneyBillRowSection = {
  id: MoneyBillRowSectionId;
  title: string;
  hint: string;
  rows: MoneyBillRow[];
};

const SECTION_ORDER: MoneyBillRowSectionId[] = ["ready", "invoices", "team"];

export function groupMoneyBillRows(rows: MoneyBillRow[]): MoneyBillRowSection[] {
  const buckets: Record<MoneyBillRowSectionId, MoneyBillRow[]> = {
    ready: [],
    invoices: [],
    team: [],
  };
  for (const row of rows) {
    switch (row.kind) {
      case "client-activity":
        buckets.ready.push(row);
        break;
      case "invoice":
        buckets.invoices.push(row);
        break;
      case "member-activity":
        buckets.team.push(row);
        break;
      default: {
        const _exhaustive: never = row;
        void _exhaustive;
      }
    }
  }

  const sections: MoneyBillRowSection[] = [];
  for (const id of SECTION_ORDER) {
    const sectionRows = buckets[id];
    if (sectionRows.length === 0) continue;
    switch (id) {
      case "ready":
        sections.push({
          id,
          title: "Ready to invoice",
          hint: `${sectionRows.length} client${sectionRows.length === 1 ? "" : "s"} with unbilled time`,
          rows: sectionRows,
        });
        break;
      case "invoices":
        sections.push({
          id,
          title: "Invoices",
          hint: `${sectionRows.length} in this period`,
          rows: sectionRows,
        });
        break;
      case "team":
        sections.push({
          id,
          title: "Team this period",
          hint: `${sectionRows.length} member${sectionRows.length === 1 ? "" : "s"} logged time`,
          rows: sectionRows,
        });
        break;
      default: {
        const _exhaustive: never = id;
        return _exhaustive;
      }
    }
  }
  return sections;
}

export function moneyBillListInsight(rows: MoneyBillRow[]): string | null {
  const ready = rows.filter((row) => row.kind === "client-activity");
  if (ready.length === 0) return null;
  const totalSeconds = ready.reduce((sum, row) => sum + row.durationSeconds, 0);
  const hoursLabel = formatDuration(totalSeconds, "short");
  return `${ready.length} client${ready.length === 1 ? "" : "s"} ready · ${hoursLabel} unbilled`;
}

export function moneyBillInitials(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

/**
 * Default Bills list: invoices + uninvoiced clients with time + members who worked.
 * Status filter applies to invoices (and uninvoiced clients only when Outstanding).
 */
export function buildMoneyBillRows(input: {
  party: MoneyBillsPartyFilter;
  statusFilter: MoneyBillsStatusFilter | null;
  invoices: MoneyBillInvoiceSource[];
  clients: MoneyBillClientActivitySource[];
  members: MoneyBillMemberActivitySource[];
}): MoneyBillRow[] {
  const rows: MoneyBillRow[] = [];
  const showClients = moneyBillsPartyShowsClients(input.party);
  const showMembers = moneyBillsPartyShowsMembers(input.party);

  if (showClients) {
    for (const invoice of input.invoices) {
      rows.push(moneyBillRowFromInvoice(invoice));
    }

    const invoicedClientIds = new Set(input.invoices.map((invoice) => invoice.clientId));
    const showUninvoiced = input.statusFilter === null || input.statusFilter === "outstanding";
    if (showUninvoiced) {
      for (const client of input.clients) {
        if (invoicedClientIds.has(client.clientId)) continue;
        rows.push(moneyBillRowFromClientActivity(client));
      }
    }
  }

  if (showMembers && input.statusFilter === null) {
    for (const member of input.members) {
      rows.push(moneyBillRowFromMemberActivity(member));
    }
  }

  return rows;
}

export function moneyBillsCreateFormValid(
  clientId: string,
  periodStart: string,
  periodEnd: string,
): boolean {
  return (
    Boolean(clientId) && Boolean(periodStart) && Boolean(periodEnd) && periodEnd >= periodStart
  );
}

/** Major-unit payment string → cents; null when invalid. */
export function parseMoneyBillPaymentCents(value: string, remainingCents: number): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const cents = Math.round(amount * 100);
  if (cents > remainingCents) return null;
  return cents;
}

export function moneyBillsPaymentCanSubmit(value: string, remainingCents: number): boolean {
  return parseMoneyBillPaymentCents(value, remainingCents) !== null;
}

export type { MoneyBillsStatusFilter };
