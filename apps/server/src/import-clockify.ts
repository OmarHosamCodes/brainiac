import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  confirm,
  intro,
  isCancel,
  multiselect,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";
import { db } from "@brainiac/db";
import {
  user,
  workspaceTeam,
  workspaceTeamMember,
  type WorkspaceTeamRole,
} from "@brainiac/db/schema";
import { createWorkspaceId } from "@brainiac/workspace";
import { eq } from "drizzle-orm";
import {
  buildCatalog,
  defaultOutputDir,
  loadManifest,
  loadWorkspaceCatalog,
  parseBeforeDate,
  runImport,
  type ClockifyMember,
  type ScrapeManifest,
} from "./lib/clockify-import";
import {
  ensureCredentialAccount,
  hasCredentialAccount,
  hasLegacyEmailAccount,
} from "./lib/ensure-credential-account";

const DEFAULT_IMPORT_PASSWORD = "brainiac1234";

type CliOptions = {
  dryRun: boolean;
  help: boolean;
  outputDir: string | null;
  before: Date | null;
};

type TeamMember = {
  userId: string;
  userName: string;
  userEmail: string;
  role: "owner" | "editor" | "viewer";
};

function parseCliArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let help = false;
  let outputDir: string | null = null;
  let before: Date | null = null;

  for (let i = 0; i < argv.length; i += 1) {
    const argument = argv[i];
    if (!argument) continue;

    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }

    if (argument === "--dry-run" || argument === "-n") {
      dryRun = true;
      continue;
    }

    if (argument === "--before") {
      const next = argv[i + 1];
      if (!next) {
        throw new Error("--before requires a date (YYYY-MM-DD)");
      }
      before = parseBeforeDate(next);
      i += 1;
      continue;
    }

    if (argument === "--output-dir") {
      const next = argv[i + 1];
      if (!next) {
        throw new Error("--output-dir requires a path");
      }
      outputDir = resolve(next);
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return { dryRun, help, outputDir, before };
}

function printUsage() {
  console.log("Usage:");
  console.log(
    "  bun run src/import-clockify.ts [--dry-run] [--before YYYY-MM-DD] [--output-dir <path>]",
  );
  console.log("");
  console.log("Root workspace command:");
  console.log("  pnpm db:import:clockify");
  console.log(
    "  pnpm db:import:clockify -- --dry-run --before 2026-06-25 --output-dir ../Clockify-Scrapper/output",
  );
}

async function resolveOutputDir(cliOutputDir: string | null): Promise<string> {
  if (cliOutputDir) {
    return cliOutputDir;
  }

  const defaultDir = defaultOutputDir();
  const answer = await text({
    message: "Clockify scraper output directory:",
    defaultValue: defaultDir,
    validate: (value) => {
      if (typeof value !== "string" || value.trim().length === 0) {
        return "Path is required";
      }
      const resolved = resolve(value.trim());
      if (!existsSync(resolve(resolved, "manifest.json"))) {
        return `manifest.json not found in ${resolved}`;
      }
      return undefined;
    },
  });

  if (isCancel(answer)) {
    throw new Error("Cancelled");
  }

  return resolve(answer);
}

async function loadTeamMembers(teamId: string): Promise<TeamMember[]> {
  const rows = await db
    .select({
      userId: workspaceTeamMember.userId,
      role: workspaceTeamMember.role,
      userName: user.name,
      userEmail: user.email,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, teamId));

  return rows.map((row) => ({
    userId: row.userId,
    userName: row.userName,
    userEmail: row.userEmail,
    role: row.role as TeamMember["role"],
  }));
}

async function createNewTeam(): Promise<{
  teamId: string;
  teamName: string;
  members: TeamMember[];
}> {
  const allUsers = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .orderBy(user.name);

  if (allUsers.length === 0) {
    throw new Error("No users exist. Create a user before importing.");
  }

  const ownerChoice = await select({
    message: "Who should be the team owner?",
    options: allUsers.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` })),
  });

  if (isCancel(ownerChoice)) throw new Error("Cancelled");

  const owner = allUsers.find((u) => u.id === ownerChoice);
  const teamName = await text({
    message: "Team name:",
    defaultValue: "Imported Agency",
    validate: (value) =>
      typeof value === "string" && value.trim().length === 0 ? "Name is required" : undefined,
  });

  if (isCancel(teamName)) throw new Error("Cancelled");

  const s = spinner();
  s.start("Creating team");

  const teamId = createWorkspaceId("team");
  const now = new Date();

  await db.insert(workspaceTeam).values({
    id: teamId,
    name: teamName as string,
    createdByUserId: owner!.id,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(workspaceTeamMember).values({
    id: createWorkspaceId("team-member"),
    teamId,
    userId: owner!.id,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });

  s.stop(`Team "${teamName}" created`);

  return {
    teamId,
    teamName: teamName as string,
    members: [
      { userId: owner!.id, userName: owner!.name, userEmail: owner!.email, role: "owner" },
    ],
  };
}

async function pickTeam(): Promise<{
  teamId: string;
  teamName: string;
  members: TeamMember[];
} | null> {
  const existingTeams = await db
    .select({ id: workspaceTeam.id, name: workspaceTeam.name })
    .from(workspaceTeam)
    .orderBy(workspaceTeam.name);

  const teamOptions: Array<{ value: string; label: string; hint?: string }> = [
    { value: "__create__", label: "Create a new team", hint: "Start fresh" },
  ];

  for (const team of existingTeams) {
    teamOptions.push({ value: team.id, label: team.name });
  }

  if (existingTeams.length > 0) {
    teamOptions.push({ value: "__skip__", label: "Cancel import", hint: "Exit without importing" });
  }

  const choice = await select({
    message: "Select a team to import agency data into:",
    options: teamOptions,
  });

  if (isCancel(choice)) return null;
  if (choice === "__skip__") return null;

  if (choice === "__create__") {
    return createNewTeam();
  }

  const teamId = choice as string;
  const team = existingTeams.find((t) => t.id === teamId);
  const members = await loadTeamMembers(teamId);
  return { teamId, teamName: team?.name ?? "Unknown", members };
}

async function selectMembers(manifest: ScrapeManifest): Promise<ClockifyMember[]> {
  const defaultSelected = manifest.members.filter((member) => !member.skipped);
  const options = manifest.members.map((member) => ({
    value: member.userId,
    label: `${member.name} (${member.email})`,
    hint: member.skipped
      ? `skipped — ${member.entryCount} entries`
      : `${member.entryCount} entries`,
  }));

  const selected = await multiselect({
    message: "Select Clockify members to import:",
    options,
    initialValues: defaultSelected.map((member) => member.userId),
    required: true,
  });

  if (isCancel(selected)) {
    throw new Error("Cancelled");
  }

  const selectedIds = new Set(selected as string[]);
  return manifest.members.filter((member) => selectedIds.has(member.userId));
}

async function createBrainiacUser(
  name: string,
  email: string,
  password: string,
): Promise<{ id: string; name: string; email: string }> {
  const now = new Date();
  const userId = createWorkspaceId("user");

  await db.insert(user).values({
    id: userId,
    name,
    email,
    emailVerified: true,
    lifetimePro: true,
    createdAt: now,
    updatedAt: now,
  });

  await ensureCredentialAccount(userId, { password });

  return { id: userId, name, email };
}

async function ensureMappedUserCanSignIn(
  userId: string,
  email: string,
  name: string,
  context: "existing" | "new",
): Promise<void> {
  const hasCredential = await hasCredentialAccount(userId);
  const hasLegacy = await hasLegacyEmailAccount(userId);

  const passwordOptions: Array<{ value: string; label: string; hint?: string }> = [];

  if (hasCredential || hasLegacy) {
    passwordOptions.push({
      value: "keep",
      label: "Keep existing password",
      hint: hasLegacy ? "Migrates legacy account format only" : "No password change",
    });
  }

  passwordOptions.push(
    {
      value: "default",
      label: `Use default password (${DEFAULT_IMPORT_PASSWORD})`,
    },
    { value: "custom", label: "Enter custom password" },
  );

  const choice = await select({
    message: `${name} (${email}) — password:`,
    options: passwordOptions,
    initialValue: context === "new" ? "default" : hasCredential || hasLegacy ? "keep" : "default",
  });

  if (isCancel(choice)) {
    throw new Error("Cancelled");
  }

  if (choice === "keep") {
    await ensureCredentialAccount(userId);
    return;
  }

  let password = DEFAULT_IMPORT_PASSWORD;
  if (choice === "custom") {
    const customPassword = await text({
      message: `Password for ${email}:`,
      validate: (value) =>
        typeof value === "string" && value.length < 8
          ? "Password must be at least 8 characters"
          : undefined,
    });

    if (isCancel(customPassword)) {
      throw new Error("Cancelled");
    }

    password = customPassword as string;
  }

  await ensureCredentialAccount(userId, { password, updatePassword: true });
}

async function addTeamMember(
  teamId: string,
  userId: string,
  role: WorkspaceTeamRole,
): Promise<void> {
  const now = new Date();
  await db
    .insert(workspaceTeamMember)
    .values({
      id: createWorkspaceId("team-member"),
      teamId,
      userId,
      role,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [workspaceTeamMember.teamId, workspaceTeamMember.userId],
      set: { role, updatedAt: now },
    });
}

async function mapClockifyUsers(
  teamId: string,
  members: ClockifyMember[],
  teamMembers: TeamMember[],
): Promise<Map<string, string>> {
  const mapping = new Map<string, string>();
  const teamMembersByEmail = new Map(
    teamMembers.map((member) => [member.userEmail.toLowerCase(), member]),
  );

  for (const clockifyMember of members) {
    const emailKey = clockifyMember.email.toLowerCase();
    const existingTeamMember = teamMembersByEmail.get(emailKey);

    if (existingTeamMember) {
      await ensureMappedUserCanSignIn(
        existingTeamMember.userId,
        existingTeamMember.userEmail,
        existingTeamMember.userName,
        "existing",
      );
      mapping.set(clockifyMember.userId, existingTeamMember.userId);
      continue;
    }

    const [existingUser] = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.email, clockifyMember.email))
      .limit(1);

    if (existingUser) {
      const shouldAdd = await confirm({
        message: `${clockifyMember.name} (${clockifyMember.email}) exists but is not on the team. Add as editor?`,
        initialValue: true,
      });

      if (isCancel(shouldAdd) || !shouldAdd) {
        continue;
      }

      await addTeamMember(teamId, existingUser.id, "editor");
      teamMembers.push({
        userId: existingUser.id,
        userName: existingUser.name,
        userEmail: existingUser.email,
        role: "editor",
      });
      teamMembersByEmail.set(emailKey, teamMembers[teamMembers.length - 1]!);
      await ensureMappedUserCanSignIn(
        existingUser.id,
        existingUser.email,
        existingUser.name,
        "existing",
      );
      mapping.set(clockifyMember.userId, existingUser.id);
      continue;
    }

    const shouldCreate = await confirm({
      message: `Create Brainiac user for ${clockifyMember.name} (${clockifyMember.email})?`,
      initialValue: true,
    });

    if (isCancel(shouldCreate) || !shouldCreate) {
      continue;
    }

    const s = spinner();
    s.start(`Creating user ${clockifyMember.email}`);

    const passwordChoice = await select({
      message: `Password for new user ${clockifyMember.email}:`,
      options: [
        {
          value: "default",
          label: `Use default password (${DEFAULT_IMPORT_PASSWORD})`,
        },
        { value: "custom", label: "Enter custom password" },
      ],
      initialValue: "default",
    });

    if (isCancel(passwordChoice)) {
      throw new Error("Cancelled");
    }

    let password = DEFAULT_IMPORT_PASSWORD;
    if (passwordChoice === "custom") {
      const customPassword = await text({
        message: `Password for ${clockifyMember.email}:`,
        validate: (value) =>
          typeof value === "string" && value.length < 8
            ? "Password must be at least 8 characters"
            : undefined,
      });

      if (isCancel(customPassword)) {
        throw new Error("Cancelled");
      }

      password = customPassword as string;
    }

    const created = await createBrainiacUser(
      clockifyMember.name,
      clockifyMember.email,
      password,
    );
    await addTeamMember(teamId, created.id, "editor");
    s.stop(`Created ${created.email}`);

    teamMembers.push({
      userId: created.id,
      userName: created.name,
      userEmail: created.email,
      role: "editor",
    });
    teamMembersByEmail.set(emailKey, teamMembers[teamMembers.length - 1]!);
    mapping.set(clockifyMember.userId, created.id);
  }

  return mapping;
}

function resolveCreatedByUserId(teamMembers: TeamMember[]): string {
  const owner = teamMembers.find((member) => member.role === "owner");
  if (owner) return owner.userId;
  const first = teamMembers[0];
  if (!first) {
    throw new Error("Team has no members to use as createdByUserId");
  }
  return first.userId;
}

function printMappingSummary(
  members: ClockifyMember[],
  userIdByClockifyUserId: Map<string, string>,
) {
  console.log("");
  console.log("── User Mapping ──────────────────────────────");
  for (const member of members) {
    const brainiacUserId = userIdByClockifyUserId.get(member.userId);
    console.log(
      brainiacUserId
        ? `  ✓ ${member.name} (${member.email})`
        : `  ✗ ${member.name} (${member.email}) — not mapped`,
    );
  }
  console.log("──────────────────────────────────────────────");
}

function printPreview(
  catalog: Awaited<ReturnType<typeof buildCatalog>>,
  selectedMembers: ClockifyMember[],
  userIdByClockifyUserId: Map<string, string>,
  before: Date | null,
  usedWorkspaceCatalog: boolean,
) {
  console.log("");
  console.log("── Import Preview ────────────────────────────");
  console.log(`  Members selected:  ${selectedMembers.length}`);
  console.log(`  Members mapped:    ${userIdByClockifyUserId.size}`);
  console.log(
    `  Catalog source:    ${usedWorkspaceCatalog ? "catalog.json (API)" : "time entries JSONL"}`,
  );
  if (before) {
    console.log(`  Before cutoff:     ${before.toISOString()} (exclusive)`);
  }
  console.log(`  Clients:           ${catalog.clients.size}`);
  console.log(`  Projects:          ${catalog.projects.size}`);
  console.log(`  Tasks:             ${catalog.tasks.size}`);
  console.log(`  Time entries:      ${catalog.timeEntries.length}`);
  console.log(`  Skipped records:   ${catalog.skipped.length}`);
  console.log(`  Skipped by before: ${catalog.skippedByBefore}`);
  console.log(`  Duplicate JSONL:   ${catalog.duplicateEntryIds}`);
  console.log("──────────────────────────────────────────────");
}

function printImportSummary(
  stats: Awaited<ReturnType<typeof runImport>>,
  team: { teamId: string; teamName: string },
  dryRun: boolean,
  catalog: Awaited<ReturnType<typeof buildCatalog>>,
) {
  console.log("");
  console.log("── Import Summary ────────────────────────────");
  console.log(`  Team:              ${team.teamName} (${team.teamId})`);
  console.log(`  Clients inserted:  ${stats.clientsInserted}`);
  console.log(`  Clients exist:     ${stats.clientsAlreadyExist}`);
  console.log(`  Projects inserted: ${stats.projectsInserted}`);
  console.log(`  Projects exist:    ${stats.projectsAlreadyExist}`);
  console.log(`  Tasks inserted:    ${stats.tasksInserted}`);
  console.log(`  Tasks exist:       ${stats.tasksAlreadyExist}`);
  console.log(`  Threads inserted:  ${stats.threadsInserted}`);
  console.log(`  Entries inserted:  ${stats.timeEntriesInserted}`);
  console.log(`  Entries exist:     ${stats.timeEntriesAlreadyExist}`);
  console.log(`  Skipped records:   ${stats.skipped}`);
  console.log(`  Skipped by before: ${stats.skippedByBefore}`);
  console.log(`  Duplicate JSONL:   ${stats.duplicateEntryIds}`);
  console.log(`  Task remapped:     ${stats.taskConflictsRemapped}`);
  if (catalog.taskConflicts.length > 0) {
    console.log("  Task title conflicts (remapped to existing):");
    for (const conflict of catalog.taskConflicts.slice(0, 10)) {
      console.log(`    · ${conflict.title} → ${conflict.existingId}`);
    }
    if (catalog.taskConflicts.length > 10) {
      console.log(`    … and ${catalog.taskConflicts.length - 10} more`);
    }
  }
  if (dryRun) {
    console.log("  Mode:              dry-run (no writes)");
  }
  console.log("──────────────────────────────────────────────");
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  intro("Clockify → Agency Import");

  const outputDir = await resolveOutputDir(options.outputDir);
  const manifest = await loadManifest(outputDir);

  console.log("");
  console.log(`Workspace: ${manifest.workspaceId}`);
  console.log(`Scraped:   ${manifest.scrapedAt}`);
  console.log(`Members:   ${manifest.memberCount}`);
  console.log(`Output:    ${outputDir}`);
  console.log("");

  const selectedMembers = await selectMembers(manifest);
  const team = await pickTeam();
  if (!team) {
    outro("Import cancelled.");
    return;
  }

  const userIdByClockifyUserId = await mapClockifyUsers(
    team.teamId,
    selectedMembers,
    team.members,
  );

  printMappingSummary(selectedMembers, userIdByClockifyUserId);

  if (userIdByClockifyUserId.size === 0) {
    outro("No Clockify members were mapped. Import cancelled.");
    return;
  }

  const catalog = await buildCatalog(outputDir, selectedMembers, userIdByClockifyUserId, {
    before: options.before ?? undefined,
  });
  const usedWorkspaceCatalog = (await loadWorkspaceCatalog(outputDir)) !== null;
  printPreview(catalog, selectedMembers, userIdByClockifyUserId, options.before, usedWorkspaceCatalog);

  const proceed = await confirm({
    message: options.dryRun
      ? "Run dry-run preview (no database writes)?"
      : `Import into "${team.teamName}"?`,
    initialValue: true,
  });

  if (isCancel(proceed) || !proceed) {
    outro("Import cancelled.");
    return;
  }

  const s = spinner();
  s.start(options.dryRun ? "Running dry-run import" : "Importing agency data");

  const stats = await runImport(
    {
      teamId: team.teamId,
      createdByUserId: resolveCreatedByUserId(team.members),
      userIdByClockifyUserId,
      dryRun: options.dryRun,
    },
    catalog,
  );

  s.stop(options.dryRun ? "Dry-run complete" : "Import complete");

  printImportSummary(stats, team, options.dryRun, catalog);

  outro(options.dryRun ? "Dry-run finished." : "Clockify import complete.");
}

void main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("");
    console.error("Clockify import failed.");
    console.error(error);
    process.exit(1);
  });
