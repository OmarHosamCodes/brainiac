import { user, agencyOpsProjectTaskBlueprint, agencyOpsProjectTaskMemberStatus, agencyOpsProjectTaskAssignee, agencyOpsProjectTask, agencyOpsProject, agencyOpsClient, agencyOpsTimeEntry, agencyOpsProjectJourney, agencyOpsProjectJourneyStep, type AgencyOpsJourneyStepKind, workspaceTeamMember } from "@brainiac/db/schema";
import { getUserAvatarPublicUrl } from "../../../storage";
import { env } from "@brainiac/env/server";
import { ORPCError } from "@orpc/server";
import { db } from "@brainiac/db";
import { and, inArray, eq, asc } from "drizzle-orm";
import { notifyJourneyMilestone } from "../../notifications/fanout";
import { publishAgencyJourneyStepUpdated } from "../live/live";

export const AVATAR_KEY_PREFIX = "user-avatars/";

export function formatAvatarUrl(image: string | null): string | null {
  if (!image || !image.startsWith(AVATAR_KEY_PREFIX)) return image;
  const parts = image.split("/");
  const userId = parts[1];
  if (!userId) return null;
  return getUserAvatarPublicUrl({
    baseUrl: env.BETTER_AUTH_URL,
    userId,
    storageKey: image,
  });
}

export type AgencyProjectTaskAssigneeRecord = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  status: "open" | "in_progress" | "done";
};

export type AgencyProjectTaskBlueprintRecord = {
  id: string;
  description: string;
};

export type AgencyProjectTaskRecord = {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  taskKind: "standard" | "journey_anchor" | "journey_milestone";
  assignedToTeam: boolean;
  isWaste: boolean;
  createdByUserId: string;
  assignees: AgencyProjectTaskAssigneeRecord[];
  viewerStatus?: "open" | "in_progress" | "done";
  viewerCompletionCount?: number;
  viewerBlueprints?: AgencyProjectTaskBlueprintRecord[];
  totalTrackedSeconds?: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MemberStatusEntry = {
  status: "open" | "in_progress" | "done";
  completionCount: number;
};

export function parseIsoDateTime(value: string, fieldName: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Invalid ${fieldName}.`,
    });
  }

  return parsed;
}

export function mapProjectTaskRow(row: {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  taskKind: "standard" | "journey_anchor" | "journey_milestone";
  assignedToTeam: boolean;
  isWaste: boolean;
  createdByUserId: string;
  assignees: AgencyProjectTaskAssigneeRecord[];
  viewerStatus?: "open" | "in_progress" | "done";
  viewerCompletionCount?: number;
  viewerBlueprints?: AgencyProjectTaskBlueprintRecord[];
  totalTrackedSeconds?: number;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AgencyProjectTaskRecord {
  return {
    id: row.id,
    teamId: row.teamId,
    projectId: row.projectId,
    title: row.title,
    status: row.status,
    taskKind: row.taskKind,
    assignedToTeam: row.assignedToTeam,
    isWaste: row.isWaste,
    createdByUserId: row.createdByUserId,
    assignees: row.assignees,
    ...(row.viewerStatus !== undefined ? { viewerStatus: row.viewerStatus } : {}),
    ...(row.viewerCompletionCount !== undefined
      ? { viewerCompletionCount: row.viewerCompletionCount }
      : {}),
    ...(row.viewerBlueprints !== undefined ? { viewerBlueprints: row.viewerBlueprints } : {}),
    ...(row.totalTrackedSeconds !== undefined
      ? { totalTrackedSeconds: row.totalTrackedSeconds }
      : {}),
    dueDate: row.dueDate?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadTaskBlueprintsForViewer(
  taskIds: string[],
  viewerUserId: string,
): Promise<Map<string, AgencyProjectTaskBlueprintRecord[]>> {
  const result = new Map<string, AgencyProjectTaskBlueprintRecord[]>();
  if (taskIds.length === 0 || !viewerUserId) return result;

  const rows = await db
    .select({
      id: agencyOpsProjectTaskBlueprint.id,
      taskId: agencyOpsProjectTaskBlueprint.taskId,
      description: agencyOpsProjectTaskBlueprint.description,
    })
    .from(agencyOpsProjectTaskBlueprint)
    .where(
      and(
        inArray(agencyOpsProjectTaskBlueprint.taskId, taskIds),
        eq(agencyOpsProjectTaskBlueprint.userId, viewerUserId),
      ),
    )
    .orderBy(asc(agencyOpsProjectTaskBlueprint.createdAt));

  for (const row of rows) {
    const existing = result.get(row.taskId) ?? [];
    existing.push({ id: row.id, description: row.description });
    result.set(row.taskId, existing);
  }

  return result;
}

export async function loadTaskMemberStatuses(
  taskIds: string[],
): Promise<Map<string, Map<string, MemberStatusEntry>>> {
  const result = new Map<string, Map<string, MemberStatusEntry>>();
  if (taskIds.length === 0) return result;

  const rows = await db
    .select({
      taskId: agencyOpsProjectTaskMemberStatus.taskId,
      userId: agencyOpsProjectTaskMemberStatus.userId,
      status: agencyOpsProjectTaskMemberStatus.status,
      completionCount: agencyOpsProjectTaskMemberStatus.completionCount,
    })
    .from(agencyOpsProjectTaskMemberStatus)
    .where(inArray(agencyOpsProjectTaskMemberStatus.taskId, taskIds));

  for (const row of rows) {
    const byUser = result.get(row.taskId) ?? new Map<string, MemberStatusEntry>();
    byUser.set(row.userId, {
      status: row.status,
      completionCount: row.completionCount,
    });
    result.set(row.taskId, byUser);
  }

  return result;
}

export async function loadTaskAssignees(
  taskIds: string[],
): Promise<Map<string, AgencyProjectTaskAssigneeRecord[]>> {
  const result = new Map<string, AgencyProjectTaskAssigneeRecord[]>();
  if (taskIds.length === 0) return result;

  const memberStatuses = await loadTaskMemberStatuses(taskIds);

  const rows = await db
    .select({
      taskId: agencyOpsProjectTaskAssignee.taskId,
      userId: agencyOpsProjectTaskAssignee.userId,
      userName: user.name,
      userAvatar: user.image,
    })
    .from(agencyOpsProjectTaskAssignee)
    .innerJoin(user, eq(user.id, agencyOpsProjectTaskAssignee.userId))
    .where(inArray(agencyOpsProjectTaskAssignee.taskId, taskIds))
    .orderBy(asc(user.name));

  for (const row of rows) {
    const assignees = result.get(row.taskId) ?? [];
    assignees.push({
      userId: row.userId,
      userName: row.userName ?? "Unknown",
      userAvatar: formatAvatarUrl(row.userAvatar),
      status: memberStatuses.get(row.taskId)?.get(row.userId)?.status ?? "open",
    });
    result.set(row.taskId, assignees);
  }

  return result;
}

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function upsertTaskMemberStatus(
  tx: DbTransaction,
  taskId: string,
  userId: string,
  status: "open" | "in_progress" | "done",
) {
  const now = new Date();
  await tx
    .insert(agencyOpsProjectTaskMemberStatus)
    .values({
      taskId,
      userId,
      status,
      completedAt: status === "done" ? now : null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agencyOpsProjectTaskMemberStatus.taskId, agencyOpsProjectTaskMemberStatus.userId],
      set: {
        status,
        completedAt: status === "done" ? now : null,
        updatedAt: now,
      },
    });
}

export async function setTaskMemberStatusesForUsers(
  tx: DbTransaction,
  taskId: string,
  userIds: string[],
  status: "open" | "in_progress" | "done" = "open",
) {
  for (const userId of userIds) {
    await upsertTaskMemberStatus(tx, taskId, userId, status);
  }
}

export async function deleteTaskMemberStatusesForUsers(
  tx: DbTransaction,
  taskId: string,
  userIds: string[],
) {
  if (userIds.length === 0) return;
  await tx
    .delete(agencyOpsProjectTaskMemberStatus)
    .where(
      and(
        eq(agencyOpsProjectTaskMemberStatus.taskId, taskId),
        inArray(agencyOpsProjectTaskMemberStatus.userId, userIds),
      ),
    );
}

export function resolveViewerMemberStatus(
  task: {
    status: "open" | "in_progress" | "done" | "archived";
    assignedToTeam: boolean;
  },
  memberStatuses: Map<string, MemberStatusEntry> | undefined,
  viewerUserId: string,
): "open" | "in_progress" | "done" {
  if (task.status === "archived") return "done";
  return memberStatuses?.get(viewerUserId)?.status ?? "open";
}

export function resolveViewerCompletionCount(
  memberStatuses: Map<string, MemberStatusEntry> | undefined,
  viewerUserId: string,
): number {
  return memberStatuses?.get(viewerUserId)?.completionCount ?? 0;
}

export async function buildProjectTaskRecord(
  row: {
    id: string;
    teamId: string;
    projectId: string;
    title: string;
    status: "open" | "in_progress" | "done" | "archived";
    taskKind: "standard" | "journey_anchor" | "journey_milestone";
    assignedToTeam: boolean;
    isWaste: boolean;
    createdByUserId: string;
    dueDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  assignees: AgencyProjectTaskAssigneeRecord[],
  viewerUserId?: string,
  memberStatuses?: Map<string, MemberStatusEntry>,
  viewerBlueprints?: AgencyProjectTaskBlueprintRecord[],
): Promise<AgencyProjectTaskRecord> {
  return mapProjectTaskRow({
    ...row,
    assignees,
    ...(viewerUserId
      ? {
          viewerStatus: resolveViewerMemberStatus(row, memberStatuses, viewerUserId),
          viewerCompletionCount: resolveViewerCompletionCount(memberStatuses, viewerUserId),
          viewerBlueprints: viewerBlueprints ?? [],
        }
      : {}),
  });
}

export async function setTaskAssignees(tx: DbTransaction, taskId: string, userIds: string[]) {
  const existingRows = await tx
    .select({ userId: agencyOpsProjectTaskAssignee.userId })
    .from(agencyOpsProjectTaskAssignee)
    .where(eq(agencyOpsProjectTaskAssignee.taskId, taskId));
  const existingUserIds = existingRows.map((row) => row.userId);

  await tx
    .delete(agencyOpsProjectTaskAssignee)
    .where(eq(agencyOpsProjectTaskAssignee.taskId, taskId));

  const uniqueUserIds = [...new Set(userIds)];
  const removedUserIds = existingUserIds.filter((userId) => !uniqueUserIds.includes(userId));
  const addedUserIds = uniqueUserIds.filter((userId) => !existingUserIds.includes(userId));

  if (removedUserIds.length > 0) {
    await deleteTaskMemberStatusesForUsers(tx, taskId, removedUserIds);
  }

  if (uniqueUserIds.length === 0) return;

  await tx.insert(agencyOpsProjectTaskAssignee).values(
    uniqueUserIds.map((userId) => ({
      taskId,
      userId,
    })),
  );

  if (addedUserIds.length > 0) {
    await setTaskMemberStatusesForUsers(tx, taskId, addedUserIds, "open");
  }
}

export const projectTaskColumns = {
  id: agencyOpsProjectTask.id,
  teamId: agencyOpsProjectTask.teamId,
  projectId: agencyOpsProjectTask.projectId,
  title: agencyOpsProjectTask.title,
  status: agencyOpsProjectTask.status,
  taskKind: agencyOpsProjectTask.taskKind,
  assignedToTeam: agencyOpsProjectTask.assignedToTeam,
  isWaste: agencyOpsProjectTask.isWaste,
  createdByUserId: agencyOpsProjectTask.createdByUserId,
  dueDate: agencyOpsProjectTask.dueDate,
  createdAt: agencyOpsProjectTask.createdAt,
  updatedAt: agencyOpsProjectTask.updatedAt,
} as const;

export type ProjectTaskRow = {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  taskKind: "standard" | "journey_anchor" | "journey_milestone";
  assignedToTeam: boolean;
  isWaste: boolean;
  createdByUserId: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getProjectByIdForTeam(teamId: string, projectId: string) {
  const [project] = await db
    .select({
      id: agencyOpsProject.id,
      clientId: agencyOpsProject.clientId,
    })
    .from(agencyOpsProject)
    .where(and(eq(agencyOpsProject.id, projectId), eq(agencyOpsProject.teamId, teamId)))
    .limit(1);

  if (!project) {
    throw new ORPCError("NOT_FOUND", {
      message: "Project was not found.",
    });
  }

  return project;
}

export async function getClientByIdForTeam(teamId: string, clientId: string) {
  const [client] = await db
    .select({
      id: agencyOpsClient.id,
    })
    .from(agencyOpsClient)
    .where(and(eq(agencyOpsClient.id, clientId), eq(agencyOpsClient.teamId, teamId)))
    .limit(1);

  if (!client) {
    throw new ORPCError("NOT_FOUND", {
      message: "Client was not found.",
    });
  }
}

export type ReportEntityFilterInput = {
  clientId?: string;
  projectId?: string;
  memberUserId?: string;
  clientIds?: string[];
  projectIds?: string[];
  memberUserIds?: string[];
};

export function resolveReportEntityIds(
  singular: string | undefined,
  plural: string[] | undefined,
): string[] {
  if (plural && plural.length > 0) return plural;
  if (singular) return [singular];
  return [];
}

export function applyReportEntityFilters(
  filters: Parameters<typeof and>[0][],
  input: ReportEntityFilterInput,
) {
  const clientIds = resolveReportEntityIds(input.clientId, input.clientIds);
  if (clientIds.length === 1) {
    filters.push(eq(agencyOpsProject.clientId, clientIds[0]!));
  } else if (clientIds.length > 1) {
    filters.push(inArray(agencyOpsProject.clientId, clientIds));
  }

  const projectIds = resolveReportEntityIds(input.projectId, input.projectIds);
  if (projectIds.length === 1) {
    filters.push(eq(agencyOpsProject.id, projectIds[0]!));
  } else if (projectIds.length > 1) {
    filters.push(inArray(agencyOpsProject.id, projectIds));
  }

  const memberUserIds = resolveReportEntityIds(input.memberUserId, input.memberUserIds);
  if (memberUserIds.length === 1) {
    filters.push(eq(agencyOpsTimeEntry.userId, memberUserIds[0]!));
  } else if (memberUserIds.length > 1) {
    filters.push(inArray(agencyOpsTimeEntry.userId, memberUserIds));
  }
}

export type AgencyClientArchiveFilter = "all" | "archived" | "nonarchived";

export async function getJourneyRowForProject(teamId: string, projectId: string) {
  const [row] = await db
    .select({
      id: agencyOpsProjectJourney.id,
      projectId: agencyOpsProjectJourney.projectId,
      createdAt: agencyOpsProjectJourney.createdAt,
      updatedAt: agencyOpsProjectJourney.updatedAt,
    })
    .from(agencyOpsProjectJourney)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsProjectJourney.projectId))
    .where(
      and(eq(agencyOpsProjectJourney.projectId, projectId), eq(agencyOpsProject.teamId, teamId)),
    )
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND", {
      message: "Project journey was not found.",
    });
  }

  return row;
}

export function isJourneyStepComplete(
  step: {
    stepKind: "start" | "milestone" | "checkpoint" | "destination";
    taskId: string | null;
  },
  task: ProjectTaskRow | null,
  assignees: AgencyProjectTaskAssigneeRecord[],
): boolean {
  switch (step.stepKind) {
    case "start":
      return true;
    case "destination":
      return false;
    case "milestone":
    case "checkpoint":
      if (task?.status === "done") return true;
      if (assignees.length > 0 && assignees.every((assignee) => assignee.status === "done")) {
        return true;
      }
      return false;
    default: {
      const _exhaustive: never = step.stepKind;
      return _exhaustive;
    }
  }
}

export function deriveJourneyStepStatuses(
  steps: Array<{
    id: string;
    sortOrder: number;
    stepKind: "start" | "milestone" | "checkpoint" | "destination";
    taskId: string | null;
    status: "planned" | "active" | "done" | "blocked";
  }>,
  tasksById: Map<string, ProjectTaskRow>,
  assigneesByTask: Map<string, AgencyProjectTaskAssigneeRecord[]>,
): Map<string, "planned" | "active" | "done" | "blocked"> {
  const result = new Map<string, "planned" | "active" | "done" | "blocked">();
  const sorted = [...steps].sort((a, b) => a.sortOrder - b.sortOrder);

  const completionById = new Map<string, boolean>();
  for (const step of sorted) {
    if (step.stepKind === "destination") continue;
    const task = step.taskId ? (tasksById.get(step.taskId) ?? null) : null;
    const assignees = step.taskId ? (assigneesByTask.get(step.taskId) ?? []) : [];
    completionById.set(step.id, isJourneyStepComplete(step, task, assignees));
  }

  let foundActive = false;
  for (const step of sorted) {
    if (step.status === "blocked") {
      result.set(step.id, "blocked");
      continue;
    }

    if (step.stepKind === "destination") {
      const priorDone = sorted
        .filter((candidate) => candidate.stepKind !== "destination")
        .every((candidate) => completionById.get(candidate.id));
      result.set(step.id, priorDone ? "done" : "planned");
      continue;
    }

    const complete = completionById.get(step.id) ?? false;
    if (complete) {
      result.set(step.id, "done");
      continue;
    }

    if (!foundActive) {
      result.set(step.id, "active");
      foundActive = true;
    } else {
      result.set(step.id, "planned");
    }
  }

  return result;
}

export async function syncJourneyStepStatuses(teamId: string, projectId: string) {
  const journey = await getJourneyRowForProject(teamId, projectId);
  const steps = await db
    .select({
      id: agencyOpsProjectJourneyStep.id,
      label: agencyOpsProjectJourneyStep.label,
      sortOrder: agencyOpsProjectJourneyStep.sortOrder,
      stepKind: agencyOpsProjectJourneyStep.stepKind,
      status: agencyOpsProjectJourneyStep.status,
      taskId: agencyOpsProjectJourneyStep.taskId,
    })
    .from(agencyOpsProjectJourneyStep)
    .where(eq(agencyOpsProjectJourneyStep.journeyId, journey.id))
    .orderBy(asc(agencyOpsProjectJourneyStep.sortOrder));

  const taskIds = steps
    .map((step) => step.taskId)
    .filter((taskId): taskId is string => Boolean(taskId));
  const tasksById = new Map<string, ProjectTaskRow>();
  if (taskIds.length > 0) {
    const taskRows = await db
      .select(projectTaskColumns)
      .from(agencyOpsProjectTask)
      .where(
        and(eq(agencyOpsProjectTask.teamId, teamId), inArray(agencyOpsProjectTask.id, taskIds)),
      );
    for (const task of taskRows) {
      tasksById.set(task.id, task);
    }
  }

  const assigneesByTask = await loadTaskAssignees(taskIds);
  const derived = deriveJourneyStepStatuses(steps, tasksById, assigneesByTask);
  const now = new Date();
  let changed = false;
  const completedMilestones: Array<{
    journeyStepId: string;
    journeyStepLabel: string;
    stepKind: AgencyOpsJourneyStepKind;
  }> = [];

  for (const step of steps) {
    const nextStatus = derived.get(step.id);
    if (!nextStatus || nextStatus === step.status) continue;
    changed = true;
    if (
      nextStatus === "done" &&
      (step.stepKind === "milestone" ||
        step.stepKind === "checkpoint" ||
        step.stepKind === "destination")
    ) {
      completedMilestones.push({
        journeyStepId: step.id,
        journeyStepLabel: step.label,
        stepKind: step.stepKind,
      });
    }
    await db
      .update(agencyOpsProjectJourneyStep)
      .set({ status: nextStatus, updatedAt: now })
      .where(eq(agencyOpsProjectJourneyStep.id, step.id));
  }

  if (changed) {
    await db
      .update(agencyOpsProjectJourney)
      .set({ updatedAt: now })
      .where(eq(agencyOpsProjectJourney.id, journey.id));
  }

  return { changed, completedMilestones };
}

export async function applyJourneySyncNotifications(
  teamId: string,
  projectId: string,
  actorUserId: string | null,
  syncResult: {
    changed: boolean;
    completedMilestones: Array<{
      journeyStepId: string;
      journeyStepLabel: string;
      stepKind: AgencyOpsJourneyStepKind;
    }>;
  },
) {
  if (!syncResult.changed) return;

  await publishAgencyJourneyStepUpdated(teamId, projectId);
  if (syncResult.completedMilestones.length === 0) return;

  const [project] = await db
    .select({ name: agencyOpsProject.name })
    .from(agencyOpsProject)
    .where(and(eq(agencyOpsProject.teamId, teamId), eq(agencyOpsProject.id, projectId)))
    .limit(1);

  const projectName = project?.name ?? "Project";
  for (const milestone of syncResult.completedMilestones) {
    await notifyJourneyMilestone({
      teamId,
      actorUserId,
      projectId,
      projectName,
      journeyStepId: milestone.journeyStepId,
      journeyStepLabel: milestone.journeyStepLabel,
    });
  }
}

export async function requireTeamMember(teamId: string, userId: string) {
  const [membership] = await db
    .select({ userId: workspaceTeamMember.userId })
    .from(workspaceTeamMember)
    .where(and(eq(workspaceTeamMember.teamId, teamId), eq(workspaceTeamMember.userId, userId)))
    .limit(1);

  if (!membership) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Selected user is not a member of this team.",
    });
  }
}
