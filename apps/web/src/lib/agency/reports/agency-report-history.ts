import { RANGE_LABEL } from "@/components/agency/agency-dashboard-command-bar";
import {
  areSameReportFieldSets,
} from "@/lib/agency/reports/agency-report-fields";
import type { AgencyTimeRangeFilterSnapshot } from "@/lib/agency/use-agency-time-range-filters";

const STORAGE_PREFIX = "brainiac:agency-report-history:";
const MAX_ENTRIES = 20;

type ReportHistoryStore = {
  entries: AgencyTimeRangeFilterSnapshot[];
};

function storageKey(teamId: string) {
  return `${STORAGE_PREFIX}${teamId}`;
}

function readStore(teamId: string): ReportHistoryStore {
  if (typeof localStorage === "undefined") return { entries: [] };
  try {
    const raw = localStorage.getItem(storageKey(teamId));
    if (!raw) return { entries: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("entries" in parsed)) {
      return { entries: [] };
    }
    const entries = (parsed as ReportHistoryStore).entries;
    return { entries: Array.isArray(entries) ? entries : [] };
  } catch {
    return { entries: [] };
  }
}

function writeStore(teamId: string, store: ReportHistoryStore) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(storageKey(teamId), JSON.stringify(store));
}

function snapshotsMatch(
  left: AgencyTimeRangeFilterSnapshot,
  right: AgencyTimeRangeFilterSnapshot,
): boolean {
  return (
    left.range.from === right.range.from &&
    left.range.to === right.range.to &&
    left.rangePreset === right.rangePreset &&
    left.customFromDate === right.customFromDate &&
    left.customToDate === right.customToDate &&
    left.clientId === right.clientId &&
    left.projectId === right.projectId &&
    left.memberUserId === right.memberUserId &&
    areSameReportFieldSets(left.fieldIds, right.fieldIds)
  );
}

export function loadAgencyReportHistory(teamId: string): AgencyTimeRangeFilterSnapshot[] {
  return readStore(teamId).entries;
}

export function pushAgencyReportHistory(
  teamId: string,
  snapshot: AgencyTimeRangeFilterSnapshot,
): AgencyTimeRangeFilterSnapshot[] {
  const store = readStore(teamId);
  const withoutDuplicate = store.entries.filter((entry) => !snapshotsMatch(entry, snapshot));
  const next = [{ ...snapshot, savedAt: new Date().toISOString() }, ...withoutDuplicate].slice(
    0,
    MAX_ENTRIES,
  );
  writeStore(teamId, { entries: next });
  return next;
}

export type ReportHistoryLabelContext = {
  clients: ReadonlyArray<{ id: string; name: string }>;
  projects: ReadonlyArray<{ id: string; name: string }>;
  members: ReadonlyArray<{ userId: string; userName: string }>;
};

function rangeLabel(snapshot: AgencyTimeRangeFilterSnapshot): string {
  if (snapshot.rangePreset === "custom") {
    return `${snapshot.customFromDate} – ${snapshot.customToDate}`;
  }
  return RANGE_LABEL[snapshot.rangePreset];
}

export function formatAgencyReportHistoryLabel(
  snapshot: AgencyTimeRangeFilterSnapshot,
  context: ReportHistoryLabelContext,
): string {
  const parts = [rangeLabel(snapshot)];

  if (snapshot.clientId) {
    parts.push(
      context.clients.find((client) => client.id === snapshot.clientId)?.name ?? "Client",
    );
  }
  if (snapshot.projectId) {
    parts.push(
      context.projects.find((project) => project.id === snapshot.projectId)?.name ?? "Project",
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

export function formatAgencyReportHistoryMeta(snapshot: AgencyTimeRangeFilterSnapshot): string {
  const fieldCount = snapshot.fieldIds.length;
  const fieldLabel = fieldCount === 5 ? "All fields" : `${fieldCount} fields`;
  return `${fieldLabel} · ${formatRelativeHistoryTime(snapshot.savedAt)}`;
}

function formatRelativeHistoryTime(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function createReportHistorySnapshot(
  input: Omit<AgencyTimeRangeFilterSnapshot, "id" | "savedAt">,
): AgencyTimeRangeFilterSnapshot {
  return {
    ...input,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };
}
