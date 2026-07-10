/**
 * Non-interactive Clockify backfill import for prod automation.
 *
 * Usage:
 *   DATABASE_URL=... bun run src/import-clockify-backfill.ts --dry-run --before 2026-06-25
 *   railway run -- sh -c 'DATABASE_URL="$DATABASE_PUBLIC_URL" bun run --cwd apps/server src/import-clockify-backfill.ts --before 2026-06-25'
 */
import { resolve } from "node:path";
import { db } from "@brainiac/db";
import { user, workspaceTeamMember } from "@brainiac/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  buildCatalog,
  defaultOutputDir,
  loadManifest,
  loadWorkspaceCatalog,
  parseBeforeDate,
  runImport,
  type ClockifyMember,
} from "./lib/clockify-import";

type CliOptions = {
  dryRun: boolean;
  before: Date | null;
  outputDir: string;
  help: boolean;
  entriesOnly: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let help = false;
  let outputDir = defaultOutputDir();
  let before: Date | null = null;
  let entriesOnly = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg) continue;
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "--dry-run" || arg === "-n") {
      dryRun = true;
      continue;
    }
    if (arg === "--entries-only") {
      entriesOnly = true;
      continue;
    }
    if (arg === "--before") {
      const next = argv[i + 1];
      if (!next) throw new Error("--before requires YYYY-MM-DD");
      before = parseBeforeDate(next);
      i += 1;
      continue;
    }
    if (arg === "--output-dir") {
      const next = argv[i + 1];
      if (!next) throw new Error("--output-dir requires a path");
      outputDir = resolve(next);
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { dryRun, before, outputDir, help, entriesOnly };
}

async function resolveClockifyTeamId(): Promise<{ teamId: string; teamName: string }> {
  const rows = await db.execute<{ team_id: string; team_name: string }>(sql`
    SELECT DISTINCT e.team_id, t.name AS team_name
    FROM agency_ops_time_entry e
    INNER JOIN workspace_team t ON t.id = e.team_id
    WHERE e.id LIKE 'clockify-%'
    LIMIT 1
  `);

  const row = rows.rows[0];
  if (!row) {
    throw new Error("No existing Clockify import team found in database");
  }

  return { teamId: row.team_id, teamName: row.team_name };
}

async function loadTeamMembers(teamId: string) {
  return db
    .select({
      userId: workspaceTeamMember.userId,
      role: workspaceTeamMember.role,
      userName: user.name,
      userEmail: user.email,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, teamId));
}

async function loadImportMembers(outputDir: string): Promise<ClockifyMember[]> {
  const manifest = await loadManifest(outputDir);
  const byId = new Map(manifest.members.map((member) => [member.userId, member]));

  const glob = new Bun.Glob("*/profile.json");
  for await (const relativePath of glob.scan({ cwd: outputDir, onlyFiles: true })) {
    const userId = relativePath.split("/")[0];
    if (!userId || byId.has(userId)) {
      continue;
    }
    const profile = (await Bun.file(`${outputDir}/${relativePath}`).json()) as {
      name?: string;
      email?: string;
    };
    byId.set(userId, {
      userId,
      name: profile.name ?? userId,
      email: profile.email ?? "",
      startDate: null,
      entryCount: 0,
      skipped: false,
    });
  }

  return [...byId.values()].filter((member) => !member.skipped);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(
      `Usage: bun run src/import-clockify-backfill.ts [--dry-run] [--before YYYY-MM-DD] [--output-dir path]`,
    );
    return;
  }

  const selectedMembers = await loadImportMembers(options.outputDir);
  const team = await resolveClockifyTeamId();
  const teamMembers = await loadTeamMembers(team.teamId);
  const byEmail = new Map(
    teamMembers.map((member) => [member.userEmail.toLowerCase(), member.userId]),
  );

  const userIdByClockifyUserId = new Map<string, string>();
  for (const member of selectedMembers) {
    const brainiacUserId = byEmail.get(member.email.toLowerCase());
    if (brainiacUserId) {
      userIdByClockifyUserId.set(member.userId, brainiacUserId);
    }
  }

  const owner = teamMembers.find((member) => member.role === "owner") ?? teamMembers[0];
  if (!owner) {
    throw new Error(`Team ${team.teamId} has no members`);
  }

  const usedWorkspaceCatalog = (await loadWorkspaceCatalog(options.outputDir)) !== null;
  const catalog = await buildCatalog(options.outputDir, selectedMembers, userIdByClockifyUserId, {
    before: options.before ?? undefined,
  });

  console.log(`Team: ${team.teamName} (${team.teamId})`);
  console.log(`Catalog source: ${usedWorkspaceCatalog ? "catalog.json" : "time entries"}`);
  console.log(`Members mapped: ${userIdByClockifyUserId.size}/${selectedMembers.length}`);
  console.log(
    `Clients: ${catalog.clients.size}, Projects: ${catalog.projects.size}, Tasks: ${catalog.tasks.size}`,
  );
  console.log(`Time entries (import window): ${catalog.timeEntries.length}`);
  console.log(`Skipped by before: ${catalog.skippedByBefore}`);

  const stats = await runImport(
    {
      teamId: team.teamId,
      createdByUserId: owner.userId,
      userIdByClockifyUserId,
      dryRun: options.dryRun,
      entriesOnly: options.entriesOnly,
    },
    catalog,
  );

  console.log("");
  console.log(options.dryRun ? "Dry-run results:" : "Import results:");
  console.log(`  Clients inserted:  ${stats.clientsInserted} (${stats.clientsAlreadyExist} exist)`);
  console.log(
    `  Projects inserted: ${stats.projectsInserted} (${stats.projectsAlreadyExist} exist)`,
  );
  console.log(`  Tasks inserted:    ${stats.tasksInserted} (${stats.tasksAlreadyExist} exist)`);
  console.log(
    `  Entries inserted:  ${stats.timeEntriesInserted} (${stats.timeEntriesAlreadyExist} exist)`,
  );
  console.log(`  Task remapped:     ${stats.taskConflictsRemapped}`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
