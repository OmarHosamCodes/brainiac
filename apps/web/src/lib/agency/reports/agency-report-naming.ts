import type { AgencyReportFieldId } from "./agency-report-fields";

export type AgencyReportNameSnapshot = {
  range: { from: string; to: string };
  clientId?: string;
  memberUserId?: string;
};

export type AgencyReportNameLabelContext = {
  clients: ReadonlyArray<{ id: string; name: string }>;
  members: ReadonlyArray<{ userId: string; userName: string }>;
};

function calendarQuarter(date: Date): number {
  return Math.floor(date.getUTCMonth() / 3) + 1;
}

function quarterLabel(date: Date): string {
  return `Q${calendarQuarter(date)} ${date.getUTCFullYear()}`;
}

function formatPeriodRange(from: Date, to: Date): string {
  const fromQuarter = calendarQuarter(from);
  const toQuarter = calendarQuarter(to);
  const fromYear = from.getUTCFullYear();
  const toYear = to.getUTCFullYear();

  if (fromYear === toYear && fromQuarter === toQuarter) {
    return quarterLabel(from);
  }

  if (fromYear === toYear) {
    return `Q${fromQuarter}–Q${toQuarter} ${fromYear}`;
  }

  return `${quarterLabel(from)}–${quarterLabel(to)}`;
}

export function suggestAgencyReportName(
  snapshot: AgencyReportNameSnapshot,
  context: AgencyReportNameLabelContext,
): string {
  const from = new Date(snapshot.range.from);
  const to = new Date(snapshot.range.to);
  const parts = [formatPeriodRange(from, to)];

  if (snapshot.clientId) {
    parts.push(
      context.clients.find((client) => client.id === snapshot.clientId)?.name ?? "Client",
    );
  }
  if (snapshot.memberUserId) {
    parts.push(
      context.members.find((member) => member.userId === snapshot.memberUserId)?.userName ??
        "Member",
    );
  }

  return parts.join(" · ");
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type AgencyReportPeriodGroup = {
  year: number;
  quarter: number;
  month: number;
  label: string;
  key: string;
};

export function getAgencyReportPeriodGroup(rangeFromIso: string): AgencyReportPeriodGroup {
  const date = new Date(rangeFromIso);
  const year = date.getUTCFullYear();
  const quarter = calendarQuarter(date);
  const month = date.getUTCMonth() + 1;
  const monthName = MONTH_NAMES[date.getUTCMonth()] ?? "Unknown";

  return {
    year,
    quarter,
    month,
    label: `${year} · Q${quarter} · ${monthName}`,
    key: `${year}-Q${quarter}-${month}`,
  };
}

export type SavedReportListItem = {
  id: string;
  name: string;
  rangeFrom: string;
  updatedAt: string;
  createdByUserName: string;
  clientId: string;
  memberUserId: string;
};

export type SavedReportSearchContext = {
  clients: ReadonlyArray<{ id: string; name: string }>;
  members: ReadonlyArray<{ userId: string; userName: string }>;
};

export function filterSavedReports(
  items: SavedReportListItem[],
  query: string,
  context: SavedReportSearchContext,
): SavedReportListItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;

  return items.filter((item) => {
    const clientName =
      context.clients.find((client) => client.id === item.clientId)?.name?.toLowerCase() ?? "";
    const memberName =
      context.members.find((member) => member.userId === item.memberUserId)?.userName?.toLowerCase() ??
      "";

    return (
      item.name.toLowerCase().includes(normalized) ||
      clientName.includes(normalized) ||
      memberName.includes(normalized) ||
      item.createdByUserName.toLowerCase().includes(normalized)
    );
  });
}

export type SavedReportGroupedSection = {
  group: AgencyReportPeriodGroup;
  items: SavedReportListItem[];
};

export function groupSavedReportsByPeriod(items: SavedReportListItem[]): SavedReportGroupedSection[] {
  const sections = new Map<string, SavedReportGroupedSection>();

  for (const item of items) {
    const group = getAgencyReportPeriodGroup(item.rangeFrom);
    const existing = sections.get(group.key);
    if (existing) {
      existing.items.push(item);
    } else {
      sections.set(group.key, { group, items: [item] });
    }
  }

  return [...sections.values()].sort((left, right) => {
    if (left.group.year !== right.group.year) return right.group.year - left.group.year;
    if (left.group.quarter !== right.group.quarter) return right.group.quarter - left.group.quarter;
    return right.group.month - left.group.month;
  });
}

export function formatRelativeReportTime(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function sanitizeReportFileName(name: string): string {
  const trimmed = name.trim().slice(0, 120);
  const sanitized = trimmed.replace(/[^\w\s·\-]/g, "").replace(/\s+/g, " ").trim();
  return sanitized.length > 0 ? sanitized : "report";
}

export type SavedReportFieldIds = AgencyReportFieldId[];
