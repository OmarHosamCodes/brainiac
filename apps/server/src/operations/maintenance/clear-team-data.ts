import {
  autocomplete,
  confirm,
  intro,
  isCancel,
  multiselect,
  outro,
  spinner,
} from "@clack/prompts";
import { db } from "@brainiac/db";
import {
  agencyOpsActiveTimer,
  agencyOpsClient,
  agencyOpsClientContact,
  agencyOpsInvoice,
  agencyOpsMemberCapacity,
  agencyOpsMemberRate,
  agencyOpsMemberTenureProfile,
  agencyOpsProject,
  agencyOpsProjectTask,
  agencyOpsTenurePolicy,
  agencyOpsTenureQuarterExemption,
  agencyOpsTimeEntry,
  workspaceTeam,
} from "@brainiac/db/schema";
import { count, eq } from "drizzle-orm";

type DataCategory =
  | "timeTracking"
  | "tasks"
  | "projects"
  | "clients"
  | "invoices"
  | "memberRates"
  | "memberCapacity"
  | "tenure";

type CliOptions = {
  dryRun: boolean;
  help: boolean;
};

type CategoryCounts = Record<DataCategory, number>;

type CategoryMeta = {
  key: DataCategory;
  label: string;
  hint: string;
};

const CATEGORY_META: CategoryMeta[] = [
  { key: "timeTracking", label: "Time tracking", hint: "Time entries and active timers" },
  { key: "tasks", label: "Tasks", hint: "Tasks, threads, messages, and attachments" },
  { key: "projects", label: "Projects", hint: "Projects linked to clients" },
  { key: "clients", label: "Clients & contacts", hint: "Clients and their contact records" },
  { key: "invoices", label: "Invoices", hint: "Invoices and line items" },
  { key: "memberRates", label: "Member rates", hint: "Billable and cost rates" },
  { key: "memberCapacity", label: "Member capacity", hint: "Weekly capacity records" },
  { key: "tenure", label: "Tenure data", hint: "Policy, profiles, and exemptions" },
];

const CATEGORY_LABELS = Object.fromEntries(
  CATEGORY_META.map((category) => [category.key, category.label]),
) as Record<DataCategory, string>;

const DELETION_ORDER: DataCategory[] = [
  "invoices",
  "timeTracking",
  "tasks",
  "projects",
  "clients",
  "memberRates",
  "memberCapacity",
  "tenure",
];

function parseCliArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let help = false;

  for (const argument of argv) {
    if (!argument) {
      continue;
    }

    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }

    if (argument === "--dry-run" || argument === "-n") {
      dryRun = true;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return { dryRun, help };
}

function printUsage() {
  console.log("Usage:");
  console.log("  bun run src/operations/maintenance/clear-team-data.ts [--dry-run]");
  console.log("");
  console.log("Root workspace command:");
  console.log("  bun run db:clear:team");
  console.log("  bun run db:clear:team -- --dry-run");
}

function resolveDependencies(selected: Set<DataCategory>): Set<DataCategory> {
  const resolved = new Set(selected);

  if (resolved.has("clients")) {
    resolved.add("invoices");
    resolved.add("timeTracking");
    resolved.add("tasks");
    resolved.add("projects");
  }

  if (resolved.has("projects")) {
    resolved.add("timeTracking");
    resolved.add("tasks");
  }

  return resolved;
}

function formatCategoryList(categories: Iterable<DataCategory>) {
  return [...categories].map((category) => CATEGORY_LABELS[category]).join(", ");
}

type TeamScopedAgencyTable =
  | typeof agencyOpsTimeEntry
  | typeof agencyOpsActiveTimer
  | typeof agencyOpsProjectTask
  | typeof agencyOpsProject
  | typeof agencyOpsClient
  | typeof agencyOpsClientContact
  | typeof agencyOpsInvoice
  | typeof agencyOpsMemberRate
  | typeof agencyOpsMemberCapacity
  | typeof agencyOpsTenurePolicy
  | typeof agencyOpsMemberTenureProfile
  | typeof agencyOpsTenureQuarterExemption;

async function countRows(table: TeamScopedAgencyTable, teamId: string) {
  const [row] = await db.select({ count: count() }).from(table).where(eq(table.teamId, teamId));
  return Number(row?.count ?? 0);
}

async function loadCategoryCounts(teamId: string): Promise<CategoryCounts> {
  const [
    timeEntries,
    activeTimers,
    tasks,
    projects,
    clients,
    contacts,
    invoices,
    memberRates,
    memberCapacity,
    tenurePolicies,
    tenureProfiles,
    tenureExemptions,
  ] = await Promise.all([
    countRows(agencyOpsTimeEntry, teamId),
    countRows(agencyOpsActiveTimer, teamId),
    countRows(agencyOpsProjectTask, teamId),
    countRows(agencyOpsProject, teamId),
    countRows(agencyOpsClient, teamId),
    countRows(agencyOpsClientContact, teamId),
    countRows(agencyOpsInvoice, teamId),
    countRows(agencyOpsMemberRate, teamId),
    countRows(agencyOpsMemberCapacity, teamId),
    countRows(agencyOpsTenurePolicy, teamId),
    countRows(agencyOpsMemberTenureProfile, teamId),
    countRows(agencyOpsTenureQuarterExemption, teamId),
  ]);

  return {
    timeTracking: timeEntries + activeTimers,
    tasks,
    projects,
    clients: clients + contacts,
    invoices,
    memberRates,
    memberCapacity,
    tenure: tenurePolicies + tenureProfiles + tenureExemptions,
  };
}

async function pickTeam() {
  const teams = await db
    .select({ id: workspaceTeam.id, name: workspaceTeam.name })
    .from(workspaceTeam)
    .orderBy(workspaceTeam.name);

  if (teams.length === 0) {
    return null;
  }

  const choice = await autocomplete({
    message: "Select a team to clear data from:",
    placeholder: "Type to search teams...",
    options: teams.map((team) => ({
      value: team.id,
      label: team.name,
      hint: team.id,
    })),
  });

  if (isCancel(choice)) {
    return null;
  }

  const team = teams.find((entry) => entry.id === choice);
  if (!team) {
    throw new Error(`Unknown team selected: ${choice}`);
  }

  return team;
}

async function pickCategories(counts: CategoryCounts) {
  const choice = await multiselect({
    message: "Select data categories to clear:",
    options: CATEGORY_META.map((category) => ({
      value: category.key,
      label: `${category.label} (${counts[category.key]})`,
      hint: counts[category.key] === 0 ? "No rows" : category.hint,
      disabled: counts[category.key] === 0,
    })),
    required: true,
  });

  if (isCancel(choice)) {
    return null;
  }

  return new Set(choice as DataCategory[]);
}

type DeletionSummary = {
  category: DataCategory;
  deleted: number;
};

async function deleteCategoryData(
  teamId: string,
  categories: Set<DataCategory>,
): Promise<DeletionSummary[]> {
  const summaries: DeletionSummary[] = [];

  await db.transaction(async (tx) => {
    for (const category of DELETION_ORDER) {
      if (!categories.has(category)) {
        continue;
      }

      const s = spinner();
      s.start(`Clearing ${CATEGORY_LABELS[category].toLowerCase()}...`);

      let deleted = 0;

      switch (category) {
        case "invoices": {
          const rows = await tx
            .delete(agencyOpsInvoice)
            .where(eq(agencyOpsInvoice.teamId, teamId))
            .returning({ id: agencyOpsInvoice.id });
          deleted = rows.length;
          break;
        }
        case "timeTracking": {
          const timerRows = await tx
            .delete(agencyOpsActiveTimer)
            .where(eq(agencyOpsActiveTimer.teamId, teamId))
            .returning({ id: agencyOpsActiveTimer.id });
          const entryRows = await tx
            .delete(agencyOpsTimeEntry)
            .where(eq(agencyOpsTimeEntry.teamId, teamId))
            .returning({ id: agencyOpsTimeEntry.id });
          deleted = timerRows.length + entryRows.length;
          break;
        }
        case "tasks": {
          const rows = await tx
            .delete(agencyOpsProjectTask)
            .where(eq(agencyOpsProjectTask.teamId, teamId))
            .returning({ id: agencyOpsProjectTask.id });
          deleted = rows.length;
          break;
        }
        case "projects": {
          const rows = await tx
            .delete(agencyOpsProject)
            .where(eq(agencyOpsProject.teamId, teamId))
            .returning({ id: agencyOpsProject.id });
          deleted = rows.length;
          break;
        }
        case "clients": {
          const rows = await tx
            .delete(agencyOpsClient)
            .where(eq(agencyOpsClient.teamId, teamId))
            .returning({ id: agencyOpsClient.id });
          deleted = rows.length;
          break;
        }
        case "memberRates": {
          const rows = await tx
            .delete(agencyOpsMemberRate)
            .where(eq(agencyOpsMemberRate.teamId, teamId))
            .returning({ id: agencyOpsMemberRate.id });
          deleted = rows.length;
          break;
        }
        case "memberCapacity": {
          const rows = await tx
            .delete(agencyOpsMemberCapacity)
            .where(eq(agencyOpsMemberCapacity.teamId, teamId))
            .returning({ id: agencyOpsMemberCapacity.id });
          deleted = rows.length;
          break;
        }
        case "tenure": {
          const exemptionRows = await tx
            .delete(agencyOpsTenureQuarterExemption)
            .where(eq(agencyOpsTenureQuarterExemption.teamId, teamId))
            .returning({ id: agencyOpsTenureQuarterExemption.id });
          const profileRows = await tx
            .delete(agencyOpsMemberTenureProfile)
            .where(eq(agencyOpsMemberTenureProfile.teamId, teamId))
            .returning({ id: agencyOpsMemberTenureProfile.id });
          const policyRows = await tx
            .delete(agencyOpsTenurePolicy)
            .where(eq(agencyOpsTenurePolicy.teamId, teamId))
            .returning({ id: agencyOpsTenurePolicy.id });
          deleted = exemptionRows.length + profileRows.length + policyRows.length;
          break;
        }
        default: {
          const unhandled: never = category;
          throw new Error(`Unhandled category: ${unhandled}`);
        }
      }

      summaries.push({ category, deleted });
      s.stop(`Cleared ${CATEGORY_LABELS[category].toLowerCase()} (${deleted} row(s))`);
    }
  });

  return summaries;
}

function buildConfirmationMessage(options: {
  teamName: string;
  selected: Set<DataCategory>;
  resolved: Set<DataCategory>;
  counts: CategoryCounts;
  dryRun: boolean;
}) {
  const added = [...options.resolved].filter((category) => !options.selected.has(category));
  const lines = [
    `${options.dryRun ? "Dry run" : "Delete"} agency data for "${options.teamName}"?`,
    "",
    `Selected: ${formatCategoryList(options.selected)}`,
  ];

  if (added.length > 0) {
    lines.push(`Also required: ${formatCategoryList(added)}`);
  }

  lines.push("");
  lines.push("Rows to clear:");

  for (const category of DELETION_ORDER) {
    if (!options.resolved.has(category)) {
      continue;
    }

    lines.push(`  - ${CATEGORY_LABELS[category]}: ${options.counts[category]}`);
  }

  return lines.join("\n");
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  intro(options.dryRun ? "Clear team data (dry run)" : "Clear team data");

  const team = await pickTeam();
  if (!team) {
    outro("No team selected. Exiting.");
    return;
  }

  const counts = await loadCategoryCounts(team.id);
  const hasAnyData = Object.values(counts).some((value) => value > 0);

  if (!hasAnyData) {
    outro(`Team "${team.name}" has no agency data to clear.`);
    return;
  }

  const selected = await pickCategories(counts);
  if (!selected || selected.size === 0) {
    outro("No categories selected. Exiting.");
    return;
  }

  const resolved = resolveDependencies(selected);
  const shouldProceed = await confirm({
    message: buildConfirmationMessage({
      teamName: team.name,
      selected,
      resolved,
      counts,
      dryRun: options.dryRun,
    }),
    initialValue: false,
  });

  if (isCancel(shouldProceed) || !shouldProceed) {
    outro("Cancelled. No changes made.");
    return;
  }

  if (options.dryRun) {
    outro(`Dry run complete for team "${team.name}". No changes made.`);
    return;
  }

  const summaries = await deleteCategoryData(team.id, resolved);
  const totalDeleted = summaries.reduce((sum, entry) => sum + entry.deleted, 0);

  outro(`Cleared ${totalDeleted} row(s) for team "${team.name}".`);
}

void main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("");
    console.error("Clear team data failed.");
    console.error(error);
    process.exit(1);
  });
