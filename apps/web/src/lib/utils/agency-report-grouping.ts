import type { AgencyTimeEntry } from "@brainiac/api/schemas/agency-ops";

export type AgencyReportEntry = AgencyTimeEntry;

export type ProjectGroup = {
  projectId: string;
  projectName: string;
  rows: AgencyReportEntry[];
};

export type ClientGroup = {
  clientId: string;
  clientName: string;
  projects: ProjectGroup[];
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
      };
      client.byProject.set(entry.projectId, project);
    }
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

export function isReportEntryWaste(entry: AgencyReportEntry): boolean {
  return entry.taskIsWaste === true;
}

export const reportEntryWasteRowClass =
  "text-muted line-through decoration-muted/60 opacity-70";
