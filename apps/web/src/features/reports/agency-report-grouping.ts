import type { AgencyTimeEntry } from "@orch/api/schemas/agency-ops";

import {
  isWasteLabel,
  type AgencyReportShowWaste,
} from "@/features/reports/agency-report-show-waste";

export type AgencyReportEntry = AgencyTimeEntry;

export type AgencyReportWasteSources = {
  projects: boolean;
  tasks: boolean;
  entries: boolean;
};

export type ProjectGroup = {
  projectId: string;
  projectName: string;
  rows: AgencyReportEntry[];
  totalSeconds: number;
};

export type ClientGroup = {
  clientId: string;
  clientName: string;
  projects: ProjectGroup[];
  totalSeconds: number;
};

export type AggregatedReportRow = {
  key: string;
  projectId: string;
  projectName: string;
  taskId: string | null;
  taskTitle: string | null;
  taskIsWaste: boolean | null;
  description: string;
  userId: string;
  userName: string;
  durationSeconds: number;
  entryCount: number;
  entries: AgencyReportEntry[];
};

export type AggregatedProjectGroup = {
  projectId: string;
  projectName: string;
  rows: AggregatedReportRow[];
  totalSeconds: number;
};

export type DisplayClientGroup = {
  clientId: string;
  clientName: string;
  projects: AggregatedProjectGroup[];
  totalSeconds: number;
};

export function sortRowsByStartedAt(rows: AgencyReportEntry[]): AgencyReportEntry[] {
  return [...rows].sort(
    (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
  );
}

export function groupEntriesByClient(entries: AgencyReportEntry[]): ClientGroup[] {
  const byClient = new Map<
    string,
    {
      clientId: string;
      clientName: string;
      byProject: Map<string, ProjectGroup>;
      totalSeconds: number;
    }
  >();

  for (const entry of entries) {
    let client = byClient.get(entry.clientId);
    if (!client) {
      client = {
        clientId: entry.clientId,
        clientName: entry.clientName,
        byProject: new Map(),
        totalSeconds: 0,
      };
      byClient.set(entry.clientId, client);
    }

    client.totalSeconds += entry.durationSeconds;

    let project = client.byProject.get(entry.projectId);
    if (!project) {
      project = {
        projectId: entry.projectId,
        projectName: entry.projectName,
        rows: [],
        totalSeconds: 0,
      };
      client.byProject.set(entry.projectId, project);
    }
    project.totalSeconds += entry.durationSeconds;
    project.rows.push(entry);
  }

  return [...byClient.values()]
    .sort((left, right) => left.clientName.localeCompare(right.clientName))
    .map((client) => ({
      clientId: client.clientId,
      clientName: client.clientName,
      totalSeconds: client.totalSeconds,
      projects: [...client.byProject.values()]
        .sort((left, right) => left.projectName.localeCompare(right.projectName))
        .map((project) => ({
          ...project,
          rows: sortRowsByStartedAt(project.rows),
        })),
    }));
}

export function reportRowAggregationKey(entry: AgencyReportEntry): string {
  return [entry.projectId, entry.taskId ?? "", entry.userId, entry.description.trim()].join("\0");
}

export function aggregateSimilarReportRows(rows: AgencyReportEntry[]): AggregatedReportRow[] {
  const byKey = new Map<string, AggregatedReportRow>();

  for (const entry of rows) {
    const key = reportRowAggregationKey(entry);
    let aggregated = byKey.get(key);
    if (!aggregated) {
      aggregated = {
        key,
        projectId: entry.projectId,
        projectName: entry.projectName,
        taskId: entry.taskId,
        taskTitle: entry.taskTitle,
        taskIsWaste: entry.taskIsWaste,
        description: entry.description,
        userId: entry.userId,
        userName: entry.userName,
        durationSeconds: 0,
        entryCount: 0,
        entries: [],
      };
      byKey.set(key, aggregated);
    }
    aggregated.durationSeconds += entry.durationSeconds;
    aggregated.entryCount += 1;
    aggregated.entries.push(entry);
  }

  return [...byKey.values()].sort((left, right) => {
    const byDescription = left.description.localeCompare(right.description);
    if (byDescription !== 0) return byDescription;
    return left.userName.localeCompare(right.userName);
  });
}

export function groupEntriesForDisplay(entries: AgencyReportEntry[]): DisplayClientGroup[] {
  return groupEntriesByClient(entries).map((client) => ({
    clientId: client.clientId,
    clientName: client.clientName,
    totalSeconds: client.totalSeconds,
    projects: client.projects.map((project) => {
      const rows = aggregateSimilarReportRows(project.rows);
      return {
        projectId: project.projectId,
        projectName: project.projectName,
        rows,
        totalSeconds: rows.reduce((sum, row) => sum + row.durationSeconds, 0),
      };
    }),
  }));
}

export function reportEntryWasteSources(
  entry: Pick<AgencyReportEntry, "projectName" | "taskTitle" | "taskIsWaste" | "isWaste">,
): AgencyReportWasteSources {
  return {
    projects: isWasteLabel(entry.projectName),
    tasks: entry.taskIsWaste === true || isWasteLabel(entry.taskTitle),
    entries: entry.isWaste === true,
  };
}

export function isAnyWasteSource(sources: AgencyReportWasteSources): boolean {
  return sources.projects || sources.tasks || sources.entries;
}

export function isReportEntryWaste(
  entry:
    | Pick<AgencyReportEntry, "projectName" | "taskTitle" | "taskIsWaste" | "isWaste">
    | Pick<AggregatedReportRow, "projectName" | "taskTitle" | "taskIsWaste" | "entries">,
): boolean {
  if ("entries" in entry) {
    if (entry.entries.length === 0) {
      return isAnyWasteSource(
        reportEntryWasteSources({
          projectName: entry.projectName,
          taskTitle: entry.taskTitle,
          taskIsWaste: entry.taskIsWaste,
          isWaste: false,
        }),
      );
    }
    return entry.entries.every((item) => isAnyWasteSource(reportEntryWasteSources(item)));
  }
  return isAnyWasteSource(reportEntryWasteSources(entry));
}

export function isReportEntryWasteVisible(
  entry: Pick<AgencyReportEntry, "projectName" | "taskTitle" | "taskIsWaste" | "isWaste">,
  showWaste: AgencyReportShowWaste,
): boolean {
  const sources = reportEntryWasteSources(entry);
  if (!isAnyWasteSource(sources)) return true;
  return (
    (showWaste.projects && sources.projects) ||
    (showWaste.tasks && sources.tasks) ||
    (showWaste.entries && sources.entries)
  );
}

export function filterEntriesByShowWaste(
  entries: readonly AgencyReportEntry[],
  showWaste: AgencyReportShowWaste,
): AgencyReportEntry[] {
  return entries.filter((entry) => isReportEntryWasteVisible(entry, showWaste));
}

/** Playful wavy strike for waste text cells only — not project or row actions. */
export const reportEntryWasteTextClass = "agency-waste-strike text-muted";
