import { join } from "node:path";
import { db } from "@brainiac/db";
import {
  agencyOpsClient,
  agencyOpsProject,
  agencyOpsProjectTask,
  agencyOpsTaskThread,
  agencyOpsTimeEntry,
} from "@brainiac/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScrapeManifest = {
  workspaceId: string;
  scrapedAt: string;
  memberCount: number;
  members: Array<{
    userId: string;
    name: string;
    email: string;
    startDate: string | null;
    entryCount: number;
    skipped: boolean;
  }>;
};

export type ClockifyMember = ScrapeManifest["members"][number];

export type ParsedClockifyEntry = {
  clockifyEntryId: string;
  clockifyUserId: string;
  description: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  taskId: string | null;
  taskName: string | null;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
};

export type ImportCatalog = {
  clients: Map<string, { id: string; name: string }>;
  projects: Map<string, { id: string; name: string; clientId: string }>;
  tasks: Map<string, { id: string; title: string; projectId: string }>;
  timeEntries: ParsedClockifyEntry[];
  skipped: Array<{ reason: string; clockifyUserId?: string; clockifyEntryId?: string }>;
};

export type ImportStats = {
  clientsInserted: number;
  projectsInserted: number;
  tasksInserted: number;
  threadsInserted: number;
  timeEntriesInserted: number;
  skipped: number;
};

export type ImportContext = {
  teamId: string;
  createdByUserId: string;
  userIdByClockifyUserId: Map<string, string>;
  dryRun: boolean;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NO_CLIENT_ID = "__no_client__";
const NO_CLIENT_NAME = "(No client)";
const NO_PROJECT_ID = "__no_project__";
const NO_PROJECT_NAME = "(No project)";
const BATCH_SIZE = 500;

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function clockifyClientId(clockifyId: string): string {
  return `clockify-client-${clockifyId}`;
}

export function clockifyProjectId(clockifyId: string): string {
  return `clockify-project-${clockifyId}`;
}

export function clockifyTaskId(clockifyId: string): string {
  return `clockify-task-${clockifyId}`;
}

export function clockifyEntryId(clockifyId: string): string {
  return `clockify-entry-${clockifyId}`;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNestedName(record: Record<string, unknown> | null): string | null {
  if (!record) return null;
  return readString(record.name) ?? readString(record.Name);
}

function readNestedId(record: Record<string, unknown> | null): string | null {
  if (!record) return null;
  return readString(record.id) ?? readString(record._id);
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export function defaultOutputDir(): string {
  return join(import.meta.dir, "..", "..", "..", "..", "..", "Clockify-Scrapper", "output");
}

export async function loadManifest(outputDir: string): Promise<ScrapeManifest> {
  const manifestPath = join(outputDir, "manifest.json");
  const file = Bun.file(manifestPath);
  if (!(await file.exists())) {
    throw new Error(`manifest.json not found at ${manifestPath}`);
  }
  return (await file.json()) as ScrapeManifest;
}

async function readJsonlLines(outputDir: string, clockifyUserId: string, filename: string): Promise<unknown[]> {
  const path = join(outputDir, clockifyUserId, filename);
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return [];
  }
  const text = await file.text();
  if (!text.trim()) {
    return [];
  }
  const records: unknown[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed));
    } catch {
      // skip malformed lines
    }
  }
  return records;
}

function parseTimeInterval(raw: unknown): { startedAt: Date; endedAt: Date; durationSeconds: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const interval = raw as Record<string, unknown>;
  const start = readString(interval.start);
  const end = readString(interval.end);
  if (!start || !end) return null;

  const startedAt = new Date(start);
  const endedAt = new Date(end);
  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
    return null;
  }

  let durationSeconds =
    typeof interval.duration === "number" && Number.isFinite(interval.duration)
      ? Math.round(interval.duration)
      : Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));

  if (durationSeconds <= 0) {
    durationSeconds = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
  }

  return { startedAt, endedAt, durationSeconds };
}

function parseClockifyEntry(raw: unknown, clockifyUserId: string): ParsedClockifyEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Record<string, unknown>;

  const clockifyEntryId = readString(entry.id) ?? readString(entry._id);
  if (!clockifyEntryId) return null;

  const time = parseTimeInterval(entry.timeInterval);
  if (!time) return null;

  const projectObj =
    entry.project && typeof entry.project === "object"
      ? (entry.project as Record<string, unknown>)
      : null;
  const clientObj =
    entry.client && typeof entry.client === "object"
      ? (entry.client as Record<string, unknown>)
      : projectObj?.client && typeof projectObj.client === "object"
        ? (projectObj.client as Record<string, unknown>)
        : null;
  const taskObj =
    entry.task && typeof entry.task === "object" ? (entry.task as Record<string, unknown>) : null;

  const clientName =
    readString(entry.clientName) ??
    readNestedName(clientObj) ??
    readString(projectObj?.clientName) ??
    NO_CLIENT_NAME;

  const clientId =
    readString(entry.clientId) ??
    readNestedId(clientObj) ??
    readString(projectObj?.clientId) ??
    (clientName === NO_CLIENT_NAME ? NO_CLIENT_ID : `name-${slugify(clientName)}`);

  const projectName =
    readString(entry.projectName) ?? readNestedName(projectObj) ?? NO_PROJECT_NAME;

  const projectId =
    readString(entry.projectId) ??
    readNestedId(projectObj) ??
    (projectName === NO_PROJECT_NAME ? NO_PROJECT_ID : `name-${slugify(`${clientId}-${projectName}`)}`);

  const taskName = readString(entry.taskName) ?? readNestedName(taskObj);
  const taskId = readString(entry.taskId) ?? readNestedId(taskObj);

  return {
    clockifyEntryId,
    clockifyUserId,
    description: readString(entry.description) ?? "",
    clientId,
    clientName,
    projectId,
    projectName,
    taskId: taskId ?? (taskName ? `name-${slugify(`${projectId}-${taskName}`)}` : null),
    taskName,
    ...time,
  };
}

export async function buildCatalog(
  outputDir: string,
  selectedMembers: ClockifyMember[],
  userIdByClockifyUserId: Map<string, string>,
): Promise<ImportCatalog> {
  const clients = new Map<string, { id: string; name: string }>();
  const projects = new Map<string, { id: string; name: string; clientId: string }>();
  const tasks = new Map<string, { id: string; title: string; projectId: string }>();
  const timeEntries: ParsedClockifyEntry[] = [];
  const skipped: ImportCatalog["skipped"] = [];
  const seenEntryIds = new Set<string>();

  for (const member of selectedMembers) {
    const brainiacUserId = userIdByClockifyUserId.get(member.userId);
    if (!brainiacUserId) {
      skipped.push({
        reason: "Member not mapped to a Brainiac user",
        clockifyUserId: member.userId,
      });
      continue;
    }

    const rawEntries = await readJsonlLines(outputDir, member.userId, "time-entries.jsonl");
    for (const raw of rawEntries) {
      const parsed = parseClockifyEntry(raw, member.userId);
      if (!parsed) {
        skipped.push({
          reason: "Invalid or incomplete time entry",
          clockifyUserId: member.userId,
        });
        continue;
      }

      if (seenEntryIds.has(parsed.clockifyEntryId)) {
        continue;
      }
      seenEntryIds.add(parsed.clockifyEntryId);

      const clientKey = parsed.clientId;
      if (!clients.has(clientKey)) {
        clients.set(clientKey, {
          id: clockifyClientId(parsed.clientId),
          name: parsed.clientName,
        });
      }

      const projectKey = parsed.projectId;
      if (!projects.has(projectKey)) {
        projects.set(projectKey, {
          id: clockifyProjectId(parsed.projectId),
          name: parsed.projectName,
          clientId: clockifyClientId(parsed.clientId),
        });
      }

      if (parsed.taskId && parsed.taskName) {
        const taskKey = parsed.taskId;
        if (!tasks.has(taskKey)) {
          tasks.set(taskKey, {
            id: clockifyTaskId(parsed.taskId),
            title: parsed.taskName,
            projectId: clockifyProjectId(parsed.projectId),
          });
        }
      }

      timeEntries.push(parsed);
    }
  }

  return { clients, projects, tasks, timeEntries, skipped };
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function runImport(ctx: ImportContext, catalog: ImportCatalog): Promise<ImportStats> {
  const stats: ImportStats = {
    clientsInserted: 0,
    projectsInserted: 0,
    tasksInserted: 0,
    threadsInserted: 0,
    timeEntriesInserted: 0,
    skipped: catalog.skipped.length,
  };

  if (ctx.dryRun) {
    return {
      clientsInserted: catalog.clients.size,
      projectsInserted: catalog.projects.size,
      tasksInserted: catalog.tasks.size,
      threadsInserted: catalog.tasks.size,
      timeEntriesInserted: catalog.timeEntries.length,
      skipped: catalog.skipped.length,
    };
  }

  const now = new Date();

  for (const client of catalog.clients.values()) {
    const inserted = await db
      .insert(agencyOpsClient)
      .values({
        id: client.id,
        teamId: ctx.teamId,
        name: client.name,
        createdByUserId: ctx.createdByUserId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: agencyOpsClient.id });
    stats.clientsInserted += inserted.length;
  }

  for (const project of catalog.projects.values()) {
    const inserted = await db
      .insert(agencyOpsProject)
      .values({
        id: project.id,
        teamId: ctx.teamId,
        clientId: project.clientId,
        name: project.name,
        createdByUserId: ctx.createdByUserId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: agencyOpsProject.id });
    stats.projectsInserted += inserted.length;
  }

  for (const task of catalog.tasks.values()) {
    const insertedTasks = await db
      .insert(agencyOpsProjectTask)
      .values({
        id: task.id,
        teamId: ctx.teamId,
        projectId: task.projectId,
        title: task.title,
        status: "done",
        createdByUserId: ctx.createdByUserId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: agencyOpsProjectTask.id });
    stats.tasksInserted += insertedTasks.length;

    const threadId = `${task.id}-thread`;
    const insertedThreads = await db
      .insert(agencyOpsTaskThread)
      .values({
        id: threadId,
        teamId: ctx.teamId,
        taskId: task.id,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: agencyOpsTaskThread.id });
    stats.threadsInserted += insertedThreads.length;
  }

  const entryRows = catalog.timeEntries
    .map((entry) => {
      const userId = ctx.userIdByClockifyUserId.get(entry.clockifyUserId);
      if (!userId) {
        stats.skipped += 1;
        return null;
      }

      return {
        id: clockifyEntryId(entry.clockifyEntryId),
        teamId: ctx.teamId,
        projectId: clockifyProjectId(entry.projectId),
        taskId: entry.taskId ? clockifyTaskId(entry.taskId) : null,
        userId,
        source: "manual" as const,
        description: entry.description,
        startedAt: entry.startedAt,
        endedAt: entry.endedAt,
        durationSeconds: entry.durationSeconds,
        createdAt: entry.startedAt,
        updatedAt: entry.startedAt,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  for (const batch of chunk(entryRows, BATCH_SIZE)) {
    const inserted = await db
      .insert(agencyOpsTimeEntry)
      .values(batch)
      .onConflictDoNothing()
      .returning({ id: agencyOpsTimeEntry.id });
    stats.timeEntriesInserted += inserted.length;
  }

  return stats;
}
