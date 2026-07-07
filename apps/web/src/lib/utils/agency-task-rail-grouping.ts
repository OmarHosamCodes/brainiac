import type { AgencyTaskDisplayRow } from "@/lib/utils/agency-task-blueprints";
import type { AgencyProjectTask, AgencyTaskProject } from "@/lib/schemas/agency-work";
import {
  collectTaskBlueprintsFromTasks,
  expandTasksWithBlueprints,
  type ExpandTasksWithBlueprintsOptions,
} from "@/lib/utils/agency-task-blueprints";
import { type JourneyProgressSummary } from "@/lib/utils/agency-task-journey";
import { isTaskOverdue } from "@/lib/utils/agency-task-utils";

export type AgencyTaskJourneyCluster = {
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

import {
  AGENCY_TASK_CLIENT_GROUP_HEADER_HEIGHT,
  AGENCY_TASK_PROJECT_GROUP_HEADER_HEIGHT,
} from "@/lib/utils/agency-ui";

export const AGENCY_TASK_PROJECT_HEADER_HEIGHT = AGENCY_TASK_PROJECT_GROUP_HEADER_HEIGHT;

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

export function countClientDisplayRows(group: AgencyTaskClientDisplayGroup): number {
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

export type EstimateProjectGroupHeightInput = {
  group: AgencyTaskProjectDisplayGroup;
  estimateRowHeight: (row: AgencyTaskDisplayRow) => number;
};

export function estimateProjectGroupHeight({
  group,
  estimateRowHeight,
}: EstimateProjectGroupHeightInput): number {
  let height = AGENCY_TASK_PROJECT_GROUP_HEADER_HEIGHT;

  if (group.journeyCluster) {
    for (const row of group.journeyCluster.milestoneRows) {
      height += estimateRowHeight(row);
    }
  }

  for (const row of group.standaloneRows) {
    height += estimateRowHeight(row);
  }

  return height;
}

export type EstimateClientGroupHeightInput = {
  group: AgencyTaskClientDisplayGroup;
  expanded: boolean;
  collapsedProjects: Set<string>;
  estimateRowHeight: (row: AgencyTaskDisplayRow) => number;
};

export function estimateClientGroupHeight({
  group,
  expanded,
  collapsedProjects,
  estimateRowHeight,
}: EstimateClientGroupHeightInput): number {
  if (!expanded) return AGENCY_TASK_CLIENT_GROUP_HEADER_HEIGHT;

  let height = AGENCY_TASK_CLIENT_GROUP_HEADER_HEIGHT;
  for (const projectGroup of group.projectGroups) {
    if (collapsedProjects.has(projectGroup.projectId)) {
      height += AGENCY_TASK_PROJECT_GROUP_HEADER_HEIGHT;
      continue;
    }
    height += estimateProjectGroupHeight({
      group: projectGroup,
      estimateRowHeight,
    });
  }
  return height;
}

export type { JourneyProgressSummary };
