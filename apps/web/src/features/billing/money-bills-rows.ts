import { formatDuration } from "@/lib/utils/format-duration";

import type { MoneyBillsPartyFilter, MoneyBillsStatusFilter } from "./money-bills-filters";
import {
  allocationFromInvoice,
  allocationFromPayout,
  allocationFromReadyClient,
  allocationFromReadyMember,
  type MoneyBillAllocationView,
} from "./money-bill-allocation";

export type MoneyBillInvoiceStatus = "draft" | "sent" | "partial" | "paid" | "refunded";
export type MoneyBillPayoutStatus = "draft" | "partial" | "paid";
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
  billableCents: number;
  wasteCents: number;
  currency: string;
};

export type MoneyBillMemberActivitySource = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  durationSeconds: number;
  payableCents: number;
  wasteCents: number;
  currency: string;
};

export type MoneyBillPayoutSectionKey =
  | "salaries"
  | "team_loss"
  | "device_comp"
  | "paid_vacation"
  | "debt_discount"
  | "charity"
  | "pbc";

export type MoneyBillTeamPayoutSource = {
  id: string;
  sectionKey: MoneyBillPayoutSectionKey;
  sectionTitle: string;
  userId: string | null;
  userName: string;
  userAvatar: string | null;
  label: string;
  status: MoneyBillPayoutStatus;
  billStatus: Exclude<MoneyBillStatus, "refunded">;
  amountCents: number;
  paidCents: number;
  remainingCents: number;
  currency: string;
  durationSeconds: number;
  periodStart: string;
  periodEnd: string;
};

export type MoneyBillAdjustmentSource = MoneyBillTeamPayoutSource;

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
  canCreatePayout: boolean;
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
  allocation: MoneyBillAllocationView;
};

export type MoneyBillClientActivityRow = MoneyBillRowBase & {
  kind: "client-activity";
  party: "client";
  clientId: string;
  clientName: string;
  durationSeconds: number;
  durationLabel: string;
  billableCents: number;
  wasteCents: number;
  currency: string;
  amountLabel: string;
  allocation: MoneyBillAllocationView;
};

export type MoneyBillMemberActivityRow = MoneyBillRowBase & {
  kind: "member-activity";
  party: "team";
  userId: string;
  userName: string;
  userAvatar: string | null;
  durationSeconds: number;
  durationLabel: string;
  payableCents: number;
  wasteCents: number;
  currency: string;
  amountLabel: string;
  allocation: MoneyBillAllocationView;
};

export type MoneyBillTeamPayoutRow = MoneyBillRowBase & {
  kind: "team-payout";
  party: "team";
  userId: string | null;
  userName: string;
  userAvatar: string | null;
  label: string;
  status: MoneyBillPayoutStatus;
  billStatus: Exclude<MoneyBillStatus, "refunded">;
  billStatusLabel: string;
  amountCents: number;
  paidCents: number;
  remainingCents: number;
  currency: string;
  amountLabel: string;
  paidLabel: string;
  remainingLabel: string;
  durationSeconds: number;
  durationLabel: string;
  periodLabel: string;
  allocation: MoneyBillAllocationView;
};

export type MoneyBillAdjustmentRow = MoneyBillRowBase & {
  kind: "adjustment";
  party: "adjustments";
  sectionKey: MoneyBillPayoutSectionKey;
  sectionTitle: string;
  label: string;
  status: MoneyBillPayoutStatus;
  billStatus: Exclude<MoneyBillStatus, "refunded">;
  billStatusLabel: string;
  amountCents: number;
  paidCents: number;
  remainingCents: number;
  currency: string;
  amountLabel: string;
  paidLabel: string;
  remainingLabel: string;
  periodLabel: string;
};

export type MoneyBillRow =
  | MoneyBillInvoiceRow
  | MoneyBillClientActivityRow
  | MoneyBillMemberActivityRow
  | MoneyBillTeamPayoutRow
  | MoneyBillAdjustmentRow;

const ADJUSTMENT_SECTION_KEYS = new Set<MoneyBillPayoutSectionKey>([
  "debt_discount",
  "charity",
  "pbc",
]);

export function moneyBillsPartyShowsAdjustments(party: MoneyBillsPartyFilter): boolean {
  return party === "all" || party === "adjustments";
}

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

export function moneyBillRowFromInvoice(
  invoice: MoneyBillInvoiceSource,
  wasteCents = 0,
): MoneyBillInvoiceRow {
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
    allocation: allocationFromInvoice({
      amountCents: invoice.amountCents,
      receivedCents: invoice.receivedCents,
      remainingCents: invoice.remainingCents,
      wasteCents,
      currency: invoice.currency,
    }),
    canSend: invoice.status === "draft",
    canMarkPaid: invoice.status === "sent" || invoice.status === "partial",
    canRecordPayment: invoice.status === "sent" || invoice.status === "partial",
    canRefund:
      invoice.status === "sent" || invoice.status === "partial" || invoice.status === "paid",
    canCreateInvoice: false,
    canCreatePayout: false,
  };
}

export function moneyBillRowFromClientActivity(
  client: MoneyBillClientActivitySource,
): MoneyBillClientActivityRow {
  const durationLabel = formatDuration(client.durationSeconds, "short");
  const amountLabel = formatMoneyBillCents(client.billableCents, client.currency);
  return {
    kind: "client-activity",
    id: `client-activity:${client.clientId}`,
    party: "client",
    title: client.clientName,
    subtitle: durationLabel,
    metaLabel: amountLabel,
    statusLabel: "Ready",
    clientId: client.clientId,
    clientName: client.clientName,
    durationSeconds: client.durationSeconds,
    durationLabel,
    billableCents: client.billableCents,
    wasteCents: client.wasteCents,
    currency: client.currency,
    amountLabel,
    allocation: allocationFromReadyClient({
      billableCents: client.billableCents,
      wasteCents: client.wasteCents,
      currency: client.currency,
    }),
    canSend: false,
    canMarkPaid: false,
    canRecordPayment: false,
    canRefund: false,
    canCreateInvoice: true,
    canCreatePayout: false,
  };
}

export function moneyBillRowFromMemberActivity(
  member: MoneyBillMemberActivitySource,
): MoneyBillMemberActivityRow {
  const durationLabel = formatDuration(member.durationSeconds, "short");
  const amountLabel = formatMoneyBillCents(member.payableCents, member.currency);
  return {
    kind: "member-activity",
    id: `member-activity:${member.userId}`,
    party: "team",
    title: member.userName,
    subtitle: durationLabel,
    metaLabel: amountLabel,
    statusLabel: "Ready",
    userId: member.userId,
    userName: member.userName,
    userAvatar: member.userAvatar,
    durationSeconds: member.durationSeconds,
    durationLabel,
    payableCents: member.payableCents,
    wasteCents: member.wasteCents,
    currency: member.currency,
    amountLabel,
    allocation: allocationFromReadyMember({
      payableCents: member.payableCents,
      wasteCents: member.wasteCents,
      currency: member.currency,
    }),
    canSend: false,
    canMarkPaid: false,
    canRecordPayment: false,
    canRefund: false,
    canCreateInvoice: false,
    canCreatePayout: true,
  };
}

export function moneyBillRowFromPayoutLine(
  payout: MoneyBillTeamPayoutSource,
  wasteCents = 0,
): MoneyBillTeamPayoutRow {
  const billStatusLabel = moneyBillStatusLabel(payout.billStatus);
  const periodLabel = formatMoneyBillPeriod(payout.periodStart, payout.periodEnd);
  const amountLabel = formatMoneyBillCents(payout.amountCents, payout.currency);
  const durationLabel = formatDuration(payout.durationSeconds, "short");
  return {
    kind: "team-payout",
    id: payout.id,
    party: "team",
    title: payout.userName,
    subtitle: `${payout.label} · ${periodLabel}`,
    metaLabel: amountLabel,
    statusLabel: billStatusLabel,
    userId: payout.userId,
    userName: payout.userName,
    userAvatar: payout.userAvatar,
    label: payout.label,
    status: payout.status,
    billStatus: payout.billStatus,
    billStatusLabel,
    amountCents: payout.amountCents,
    paidCents: payout.paidCents,
    remainingCents: payout.remainingCents,
    currency: payout.currency,
    amountLabel,
    paidLabel: formatMoneyBillCents(payout.paidCents, payout.currency),
    remainingLabel: formatMoneyBillCents(payout.remainingCents, payout.currency),
    durationSeconds: payout.durationSeconds,
    durationLabel,
    periodLabel,
    allocation: allocationFromPayout({
      amountCents: payout.amountCents,
      paidCents: payout.paidCents,
      remainingCents: payout.remainingCents,
      wasteCents,
      currency: payout.currency,
    }),
    canSend: false,
    canMarkPaid: payout.status === "draft" || payout.status === "partial",
    canRecordPayment: payout.status === "draft" || payout.status === "partial",
    canRefund: false,
    canCreateInvoice: false,
    canCreatePayout: false,
  };
}

export function moneyBillRowFromAdjustmentLine(
  payout: MoneyBillAdjustmentSource,
): MoneyBillAdjustmentRow {
  const billStatusLabel = moneyBillStatusLabel(payout.billStatus);
  const periodLabel = formatMoneyBillPeriod(payout.periodStart, payout.periodEnd);
  const amountLabel = formatMoneyBillCents(payout.amountCents, payout.currency);
  return {
    kind: "adjustment",
    id: payout.id,
    party: "adjustments",
    title: payout.label || payout.userName,
    subtitle: `${payout.sectionTitle} · ${periodLabel}`,
    metaLabel: amountLabel,
    statusLabel: billStatusLabel,
    sectionKey: payout.sectionKey,
    sectionTitle: payout.sectionTitle,
    label: payout.label,
    status: payout.status,
    billStatus: payout.billStatus,
    billStatusLabel,
    amountCents: payout.amountCents,
    paidCents: payout.paidCents,
    remainingCents: payout.remainingCents,
    currency: payout.currency,
    amountLabel,
    paidLabel: formatMoneyBillCents(payout.paidCents, payout.currency),
    remainingLabel: formatMoneyBillCents(payout.remainingCents, payout.currency),
    periodLabel,
    canSend: false,
    canMarkPaid: payout.status === "draft" || payout.status === "partial",
    canRecordPayment: payout.status === "draft" || payout.status === "partial",
    canRefund: false,
    canCreateInvoice: false,
    canCreatePayout: false,
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
    case "team-payout":
    case "adjustment":
      return null;
    default: {
      const _exhaustive: never = row;
      return _exhaustive;
    }
  }
}

export function moneyBillClientHref(clientId: string): string {
  return `/agency?section=clients&client=${encodeURIComponent(clientId)}`;
}

export function moneyBillMemberHref(userId: string): string {
  return `/agency/members/${encodeURIComponent(userId)}`;
}

/** Agency deep-link for the bill party name (Clients segment or member profile). */
export function moneyBillPartyHref(row: MoneyBillRow): string | null {
  switch (row.kind) {
    case "client-activity":
    case "invoice":
      return moneyBillClientHref(row.clientId);
    case "member-activity":
      return moneyBillMemberHref(row.userId);
    case "team-payout":
      return row.userId ? moneyBillMemberHref(row.userId) : null;
    case "adjustment":
      return null;
    default: {
      const _exhaustive: never = row;
      return _exhaustive;
    }
  }
}

export type MoneyBillRowSectionId = "ready" | "invoices" | "ready-payout" | "team" | "adjustments";

export type MoneyBillRowSection = {
  id: MoneyBillRowSectionId;
  title: string;
  hint: string;
  rows: MoneyBillRow[];
};

const SECTION_ORDER: MoneyBillRowSectionId[] = [
  "ready",
  "invoices",
  "ready-payout",
  "team",
  "adjustments",
];

export function groupMoneyBillRows(rows: MoneyBillRow[]): MoneyBillRowSection[] {
  const buckets: Record<MoneyBillRowSectionId, MoneyBillRow[]> = {
    ready: [],
    invoices: [],
    "ready-payout": [],
    team: [],
    adjustments: [],
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
        buckets["ready-payout"].push(row);
        break;
      case "team-payout":
        buckets.team.push(row);
        break;
      case "adjustment":
        buckets.adjustments.push(row);
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
      case "ready-payout":
        sections.push({
          id,
          title: "Ready to pay",
          hint: `${sectionRows.length} member${sectionRows.length === 1 ? "" : "s"} with tracked time`,
          rows: sectionRows,
        });
        break;
      case "team":
        sections.push({
          id,
          title: "Payouts",
          hint: `${sectionRows.length} in this period`,
          rows: sectionRows,
        });
        break;
      case "adjustments":
        sections.push({
          id,
          title: "Adjustments",
          hint: `${sectionRows.length} in this period`,
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
  const readyClients = rows.filter((row) => row.kind === "client-activity");
  const readyPayouts = rows.filter((row) => row.kind === "member-activity");
  const parts: string[] = [];
  if (readyClients.length > 0) {
    const totalSeconds = readyClients.reduce((sum, row) => sum + row.durationSeconds, 0);
    parts.push(
      `${readyClients.length} client${readyClients.length === 1 ? "" : "s"} ready · ${formatDuration(totalSeconds, "short")} unbilled`,
    );
  }
  if (readyPayouts.length > 0) {
    parts.push(`${readyPayouts.length} member${readyPayouts.length === 1 ? "" : "s"} ready to pay`);
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function moneyBillInitials(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

/**
 * Bills list: invoices + uninvoiced clients + payout lines + members without a line.
 * Status filter applies to invoices/payouts; ready rows only when Outstanding or unset.
 */
export function buildMoneyBillRows(input: {
  party: MoneyBillsPartyFilter;
  statusFilter: MoneyBillsStatusFilter | null;
  invoices: MoneyBillInvoiceSource[];
  clients: MoneyBillClientActivitySource[];
  members: MoneyBillMemberActivitySource[];
  payouts: MoneyBillTeamPayoutSource[];
  adjustments?: MoneyBillAdjustmentSource[];
  /** Period waste cents keyed by client id (for invoice row chips). */
  wasteByClientId?: ReadonlyMap<string, number>;
  /** Period waste cents keyed by member user id (for payout row chips). */
  wasteByUserId?: ReadonlyMap<string, number>;
}): MoneyBillRow[] {
  const rows: MoneyBillRow[] = [];
  const showClients = moneyBillsPartyShowsClients(input.party);
  const showMembers = moneyBillsPartyShowsMembers(input.party);
  const showAdjustments = moneyBillsPartyShowsAdjustments(input.party);

  if (showClients) {
    for (const invoice of input.invoices) {
      rows.push(
        moneyBillRowFromInvoice(invoice, input.wasteByClientId?.get(invoice.clientId) ?? 0),
      );
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

  if (showMembers) {
    const teamPayouts = input.payouts.filter(
      (payout) => !ADJUSTMENT_SECTION_KEYS.has(payout.sectionKey),
    );
    for (const payout of teamPayouts) {
      rows.push(
        moneyBillRowFromPayoutLine(
          payout,
          payout.userId ? (input.wasteByUserId?.get(payout.userId) ?? 0) : 0,
        ),
      );
    }

    const paidMemberIds = new Set(
      teamPayouts.map((payout) => payout.userId).filter((id): id is string => Boolean(id)),
    );
    const showReady = input.statusFilter === null || input.statusFilter === "outstanding";
    if (showReady) {
      for (const member of input.members) {
        if (paidMemberIds.has(member.userId)) continue;
        rows.push(moneyBillRowFromMemberActivity(member));
      }
    }
  }

  if (showAdjustments) {
    const adjustmentLines =
      input.adjustments ??
      input.payouts.filter((payout) => ADJUSTMENT_SECTION_KEYS.has(payout.sectionKey));
    for (const payout of adjustmentLines) {
      rows.push(moneyBillRowFromAdjustmentLine(payout));
    }
  }

  return rows;
}

/** All + Clients tabs default to external-only until the badge is dismissed. */
export function filterMoneyBillRowsByClientCategory(
  rows: MoneyBillRow[],
  category: "external" | null,
  clientCategoryById: ReadonlyMap<string, "internal" | "external">,
): MoneyBillRow[] {
  if (!category) return rows;
  return rows.filter((row) => {
    if (row.kind !== "invoice" && row.kind !== "client-activity") return true;
    return (clientCategoryById.get(row.clientId) ?? "external") === category;
  });
}

export const MONEY_ADJUSTMENT_SECTION_OPTIONS: ReadonlyArray<{
  id: Extract<MoneyBillPayoutSectionKey, "debt_discount" | "charity" | "pbc">;
  label: string;
}> = [
  { id: "debt_discount", label: "Debt / Discount" },
  { id: "charity", label: "Charity" },
  { id: "pbc", label: "PBC" },
];

export function moneyBillsAdjustmentCreateValid(
  sectionKey: string,
  label: string,
  amount: string,
): boolean {
  if (!sectionKey || !label.trim()) return false;
  const parsed = Number(amount.trim());
  return Number.isFinite(parsed) && parsed > 0;
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
