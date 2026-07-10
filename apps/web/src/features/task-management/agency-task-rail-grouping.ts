import type { AgencyTaskDisplayRow } from "@/features/task-management/agency-task-blueprints";
import type { AgencyProjectTask, AgencyTaskProject } from "@/features/task-management/agency-work";
import {
  collectTaskBlueprintsFromTasks,
  expandTasksWithBlueprints,
  type ExpandTasksWithBlueprintsOptions,
} from "@/features/task-management/agency-task-blueprints";
import { isTaskOverdue } from "@/features/task-management/agency-task-utils";

type AgencyTaskJourneyCluster = {
  projectId: string;
  anchorRow: AgencyTaskDisplayRow;
  milestoneRows: AgencyTaskDisplayRow[];
};

export type AgencyTaskProjectDisplayGroup = {
  projectId: string;
  projectName: string;
  journeyCluster: AgencyTaskJourneyCluster | null;
  standaloneRows: AgencyTaskDisplayRow[];
};

export type AgencyTaskClientDisplayGroup = {
  clientId: string;
  clientName: string;
  projectGroups: AgencyTaskProjectDisplayGroup[];
};

export type BuildAgencyTaskRailGroupsInput = {
  tasks: AgencyProjectTask[];
  projects: AgencyTaskProject[];
  blueprints?: ReturnType<typeof collectTaskBlueprintsFromTasks>;
  expandOptions?: ExpandTasksWithBlueprintsOptions;
};

export type AgencyTaskRailSummaryCounts = {
  journeyCount: number;
  taskCount: number;
};

export function flattenTasksFromClientGroups(
  groups: AgencyTaskClientDisplayGroup[],
): AgencyProjectTask[] {
  const tasks: AgencyProjectTask[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const projectGroup of group.projectGroups) {
      for (const row of projectGroup.standaloneRows) {
        if (seen.has(row.task.id)) continue;
        seen.add(row.task.id);
        tasks.push(row.task);
      }

      const journeyCluster = projectGroup.journeyCluster;
      if (!journeyCluster) continue;

      const anchor = journeyCluster.anchorRow.task;
      if (!seen.has(anchor.id)) {
        seen.add(anchor.id);
        tasks.push(anchor);
      }

      for (const milestone of journeyCluster.milestoneRows) {
        if (seen.has(milestone.task.id)) continue;
        seen.add(milestone.task.id);
        tasks.push(milestone.task);
      }
    }
  }

  return tasks;
}

function sortStandaloneRows(rows: AgencyTaskDisplayRow[]): AgencyTaskDisplayRow[] {
  return [...rows].sort((left, right) => {
    const leftOverdue = isTaskOverdue(left.task.dueDate) ? 0 : 1;
    const rightOverdue = isTaskOverdue(right.task.dueDate) ? 0 : 1;
    if (leftOverdue !== rightOverdue) return leftOverdue - rightOverdue;

    const leftDue = left.task.dueDate
      ? new Date(left.task.dueDate).getTime()
      : Number.POSITIVE_INFINITY;
    const rightDue = right.task.dueDate
      ? new Date(right.task.dueDate).getTime()
      : Number.POSITIVE_INFINITY;
    if (leftDue !== rightDue) return leftDue - rightDue;

    return left.task.title.localeCompare(right.task.title);
  });
}

function sortMilestoneRows(rows: AgencyTaskDisplayRow[]): AgencyTaskDisplayRow[] {
  return [...rows].sort((left, right) => left.task.title.localeCompare(right.task.title));
}

function partitionProjectRows(
  displayRows: AgencyTaskDisplayRow[],
): Pick<AgencyTaskProjectDisplayGroup, "journeyCluster" | "standaloneRows"> {
  const anchorRow = displayRows.find((row) => row.rowKind === "journey_anchor");
  const milestoneRows = displayRows.filter((row) => row.rowKind === "journey_milestone");
  const standardRows = displayRows.filter((row) => row.rowKind === "standard");

  if (anchorRow) {
    return {
      journeyCluster: {
        projectId: anchorRow.task.projectId,
        anchorRow,
        milestoneRows: sortMilestoneRows(milestoneRows),
      },
      standaloneRows: sortStandaloneRows(standardRows),
    };
  }

  return {
    journeyCluster: null,
    standaloneRows: sortStandaloneRows([...standardRows, ...milestoneRows]),
  };
}

function buildProjectGroupsForClient(
  displayRows: AgencyTaskDisplayRow[],
  projects: AgencyTaskProject[],
): AgencyTaskProjectDisplayGroup[] {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const rowsByProject = new Map<string, AgencyTaskDisplayRow[]>();

  for (const row of displayRows) {
    const projectId = row.task.projectId;
    const existing = rowsByProject.get(projectId) ?? [];
    existing.push(row);
    rowsByProject.set(projectId, existing);
  }

  return [...rowsByProject.entries()]
    .map(([projectId, projectRows]) => {
      const project = projectById.get(projectId);
      const { journeyCluster, standaloneRows } = partitionProjectRows(projectRows);
      return {
        projectId,
        projectName: project?.name ?? "Project",
        journeyCluster,
        standaloneRows,
      };
    })
    .sort((left, right) => left.projectName.localeCompare(right.projectName));
}

export function countProjectDisplayRows(group: AgencyTaskProjectDisplayGroup): number {
  const milestoneCount = group.journeyCluster?.milestoneRows.length ?? 0;
  return milestoneCount + group.standaloneRows.length;
}

function countClientDisplayRows(group: AgencyTaskClientDisplayGroup): number {
  return countRailDisplayRows(group.projectGroups);
}

export function countRailDisplayRows(projectGroups: AgencyTaskProjectDisplayGroup[]): number {
  return projectGroups.reduce(
    (sum, projectGroup) => sum + countProjectDisplayRows(projectGroup),
    0,
  );
}

export function summarizeAgencyTaskRailGroups(
  projectGroups: AgencyTaskProjectDisplayGroup[],
): AgencyTaskRailSummaryCounts {
  let journeyCount = 0;
  let taskCount = 0;

  for (const projectGroup of projectGroups) {
    if (projectGroup.journeyCluster) {
      journeyCount += 1;
    }
    taskCount += projectGroup.standaloneRows.length;
  }

  return { journeyCount, taskCount };
}

export function buildAgencyTaskRailGroups({
  tasks,
  projects,
  blueprints = collectTaskBlueprintsFromTasks(tasks),
  expandOptions = {},
}: BuildAgencyTaskRailGroupsInput): AgencyTaskProjectDisplayGroup[] {
  const displayRows = expandTasksWithBlueprints(tasks, blueprints, expandOptions);
  return buildProjectGroupsForClient(displayRows, projects);
}

export function buildAgencyTaskClientRailGroups(
  input: BuildAgencyTaskRailGroupsInput,
): AgencyTaskClientDisplayGroup[] {
  const projectGroups = buildAgencyTaskRailGroups(input);
  const projectById = new Map(input.projects.map((project) => [project.id, project]));
  const groupsByClient = new Map<string, AgencyTaskClientDisplayGroup>();

  for (const projectGroup of projectGroups) {
    const project = projectById.get(projectGroup.projectId);
    const clientId = project?.clientId ?? `unknown:${projectGroup.projectId}`;
    const clientName = project?.clientName ?? "Unknown client";

    const existing = groupsByClient.get(clientId);
    if (existing) {
      existing.projectGroups.push(projectGroup);
      continue;
    }

    groupsByClient.set(clientId, {
      clientId,
      clientName,
      projectGroups: [projectGroup],
    });
  }

  return [...groupsByClient.values()].sort((left, right) =>
    left.clientName.localeCompare(right.clientName),
  );
}

export function countClientRailDisplayRows(clientGroups: AgencyTaskClientDisplayGroup[]): number {
  return clientGroups.reduce((sum, group) => sum + countClientDisplayRows(group), 0);
}
