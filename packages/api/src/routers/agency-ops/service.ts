import { env } from "@brainiac/env/server";
import { db } from "@brainiac/db";
import {
  agencyOpsActiveTimer,
  agencyOpsClient,
  agencyOpsClientContact,
  agencyOpsInvoice,
  agencyOpsInvoiceLineItem,
  agencyOpsMemberCapacity,
  agencyOpsMemberRate,
  agencyOpsProject,
  agencyOpsProjectTask,
  agencyOpsProjectTaskAssignee,
  agencyOpsProjectTaskMemberStatus,
  agencyOpsTaskAttachment,
  agencyOpsTaskMessage,
  agencyOpsTaskThread,
  agencyOpsTimeEntry,
  user,
  workspaceTeamMember,
} from "@brainiac/db/schema";
import { createWorkspaceId, type WorkspaceTeamRole } from "@brainiac/workspace";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, exists, gte, inArray, isNull, lt, lte, or, sql, sum } from "drizzle-orm";

import {
  createTaskAttachmentUploadToken,
  createTaskAttachmentPresignedUploadUrl,
  deleteTaskAttachmentFromStorage,
  getTaskAttachmentReadUrl,
  getUserAvatarPublicUrl,
  verifyTaskAttachmentUploadToken,
} from "../../storage";

const AVATAR_KEY_PREFIX = "user-avatars/";

function formatAvatarUrl(image: string | null): string | null {
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

const TEAM_ROLE_WEIGHT: Record<WorkspaceTeamRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

type AgencyTimeEntrySource = "timer" | "manual";

type AgencyClientRecord = {
  id: string;
  teamId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type AgencyProjectRecord = {
  id: string;
  teamId: string;
  clientId: string;
  clientName: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type AgencyProjectTaskAssigneeRecord = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  status: "open" | "in_progress" | "done";
};

type AgencyProjectTaskRecord = {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  assignedToTeam: boolean;
  assignees: AgencyProjectTaskAssigneeRecord[];
  viewerStatus?: "open" | "in_progress" | "done";
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type AgencyTaskMessageRecord = {
  id: string;
  teamId: string;
  threadId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  content: string;
  type: "text" | "voice" | "attachment";
  senderType: "user" | "agent";
  createdAt: string;
  updatedAt: string;
  attachments: AgencyTaskAttachmentRecord[];
};

type AttachmentMetadata = {
  imageWidth?: number;
  imageHeight?: number;
  videoWidth?: number;
  videoHeight?: number;
  durationSeconds?: number;
  fileExtension?: string;
  lastModified?: string;
  mediaKind?: "image" | "video" | "audio" | "document" | "archive" | "other" | "link";
  sourceUrl?: string;
};

function isTaskLinkStorageKey(storageKey: string) {
  return storageKey.startsWith("task-links/");
}

function normalizeTaskLinkUrl(input: string): string {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  if (parsed.protocol !== "https:") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Link attachments must use HTTPS URLs.",
    });
  }
  return parsed.href;
}

function deriveTaskLinkLabel(url: string, label?: string | null): string {
  if (label?.trim()) return label.trim().slice(0, 260);
  const parsed = new URL(url);
  const path =
    parsed.pathname !== "/" && parsed.pathname.length > 1
      ? parsed.pathname.replace(/\/$/, "").slice(0, 48)
      : "";
  return (path ? `${parsed.hostname}${path}` : parsed.hostname).slice(0, 260);
}

async function resolveTaskAttachmentUrl(args: {
  storageKey: string;
  metadata: AttachmentMetadata | null;
}): Promise<string | null> {
  if (isTaskLinkStorageKey(args.storageKey)) {
    return args.metadata?.sourceUrl ?? null;
  }
  return getTaskAttachmentReadUrl(args.storageKey);
}

type AgencyTaskAttachmentRecord = {
  id: string;
  teamId: string;
  messageId: string;
  fileName: string;
  mimeType: string;
  storageKey: string;
  sizeBytes: number;
  durationSeconds: number | null;
  metadata: AttachmentMetadata | null;
  createdAt: string;
  url: string | null;
};

type AgencyTimeEntryRecord = {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string | null;
  projectName: string;
  clientId: string;
  clientName: string;
  source: AgencyTimeEntrySource;
  description: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
};

type AgencyActiveTimerRecord = {
  id: string;
  teamId: string;
  userId: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string | null;
  projectName: string;
  description: string;
  startedAt: string;
  createdAt: string;
  updatedAt: string;
};

type AgencyReportSummary = {
  totalHours: number;
  totalEntries: number;
  timeDistributionByClient: Array<{
    clientId: string;
    clientName: string;
    hours: number;
  }>;
  timeDistributionByProject: Array<{
    projectId: string;
    projectName: string;
    clientId: string;
    clientName: string;
    hours: number;
  }>;
  teamActivity: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    hours: number;
  }>;
};

type AgencyDashboardSummary = AgencyReportSummary & {
  totalSeconds: number;
  activeTimerCount: number;
  topClient: { clientId: string; clientName: string; seconds: number } | null;
  topProject: {
    projectId: string;
    projectName: string;
    clientId: string;
    clientName: string;
    seconds: number;
  } | null;
  dailyBuckets: Array<{
    date: string;
    totalSeconds: number;
    segments: Array<{
      projectId: string;
      projectName: string;
      clientName: string;
      seconds: number;
    }>;
  }>;
  teamMembers: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    avatar: string | null;
    isActive: boolean;
    totalSeconds: number;
    latestEntry: {
      projectName: string;
      clientName: string;
      description: string;
      startedAt: string;
    } | null;
    projectBreakdown: Array<{
      projectId: string;
      projectName: string;
      clientName: string;
      seconds: number;
    }>;
  }>;
};

function hasRoleAtLeast(role: WorkspaceTeamRole, required: WorkspaceTeamRole) {
  return TEAM_ROLE_WEIGHT[role] >= TEAM_ROLE_WEIGHT[required];
}

export async function requireTeamMembership(
  actorUserId: string,
  teamId: string,
  requiredRole: WorkspaceTeamRole = "viewer",
) {
  const [membership] = await db
    .select({ role: workspaceTeamMember.role })
    .from(workspaceTeamMember)
    .where(and(eq(workspaceTeamMember.teamId, teamId), eq(workspaceTeamMember.userId, actorUserId)))
    .limit(1);

  if (!membership) {
    throw new ORPCError("UNAUTHORIZED");
  }

  if (!hasRoleAtLeast(membership.role, requiredRole)) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return membership.role;
}

function parseIsoDateTime(value: string, fieldName: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Invalid ${fieldName}.`,
    });
  }

  return parsed;
}

function validateDateRange(startedAt: Date, endedAt: Date) {
  if (startedAt >= endedAt) {
    throw new ORPCError("BAD_REQUEST", {
      message: "startAt must be before endAt.",
    });
  }
}

function getDurationSeconds(startedAt: Date, endedAt: Date) {
  return Math.max(1, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1_000));
}

function getWeekStartUtc(anchor: Date) {
  const utcDay = anchor.getUTCDay();
  const diff = utcDay === 0 ? -6 : 1 - utcDay;
  const start = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate() + diff, 0, 0, 0, 0),
  );

  return start;
}

function addDaysUtc(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1_000);
}

function formatUtcDateKey(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeCsvCell(value: string | number) {
  const stringified = String(value ?? "");

  if (/[",\n]/.test(stringified)) {
    return `"${stringified.replace(/"/g, '""')}"`;
  }

  return stringified;
}

function mapClientRow(row: {
  id: string;
  teamId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): AgencyClientRecord {
  return {
    id: row.id,
    teamId: row.teamId,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapProjectRow(row: {
  id: string;
  teamId: string;
  clientId: string;
  clientName: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): AgencyProjectRecord {
  return {
    id: row.id,
    teamId: row.teamId,
    clientId: row.clientId,
    clientName: row.clientName,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapProjectTaskRow(row: {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  assignedToTeam: boolean;
  assignees: AgencyProjectTaskAssigneeRecord[];
  viewerStatus?: "open" | "in_progress" | "done";
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
    assignedToTeam: row.assignedToTeam,
    assignees: row.assignees,
    ...(row.viewerStatus !== undefined ? { viewerStatus: row.viewerStatus } : {}),
    dueDate: row.dueDate?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadTaskMemberStatuses(
  taskIds: string[],
): Promise<Map<string, Map<string, "open" | "in_progress" | "done">>> {
  const result = new Map<string, Map<string, "open" | "in_progress" | "done">>();
  if (taskIds.length === 0) return result;

  const rows = await db
    .select({
      taskId: agencyOpsProjectTaskMemberStatus.taskId,
      userId: agencyOpsProjectTaskMemberStatus.userId,
      status: agencyOpsProjectTaskMemberStatus.status,
    })
    .from(agencyOpsProjectTaskMemberStatus)
    .where(inArray(agencyOpsProjectTaskMemberStatus.taskId, taskIds));

  for (const row of rows) {
    const byUser = result.get(row.taskId) ?? new Map<string, "open" | "in_progress" | "done">();
    byUser.set(row.userId, row.status);
    result.set(row.taskId, byUser);
  }

  return result;
}

async function loadTaskAssignees(
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
      status: memberStatuses.get(row.taskId)?.get(row.userId) ?? "open",
    });
    result.set(row.taskId, assignees);
  }

  return result;
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function upsertTaskMemberStatus(
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
      target: [
        agencyOpsProjectTaskMemberStatus.taskId,
        agencyOpsProjectTaskMemberStatus.userId,
      ],
      set: {
        status,
        completedAt: status === "done" ? now : null,
        updatedAt: now,
      },
    });
}

async function setTaskMemberStatusesForUsers(
  tx: DbTransaction,
  taskId: string,
  userIds: string[],
  status: "open" | "in_progress" | "done" = "open",
) {
  for (const userId of userIds) {
    await upsertTaskMemberStatus(tx, taskId, userId, status);
  }
}

async function deleteTaskMemberStatusesForUsers(
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

function resolveViewerMemberStatus(
  task: {
    status: "open" | "in_progress" | "done" | "archived";
    assignedToTeam: boolean;
  },
  memberStatuses: Map<string, "open" | "in_progress" | "done"> | undefined,
  viewerUserId: string,
): "open" | "in_progress" | "done" {
  if (task.status === "archived") return "done";
  return memberStatuses?.get(viewerUserId) ?? "open";
}

async function buildProjectTaskRecord(
  row: {
    id: string;
    teamId: string;
    projectId: string;
    title: string;
    status: "open" | "in_progress" | "done" | "archived";
    assignedToTeam: boolean;
    dueDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  assignees: AgencyProjectTaskAssigneeRecord[],
  viewerUserId?: string,
  memberStatuses?: Map<string, "open" | "in_progress" | "done">,
): Promise<AgencyProjectTaskRecord> {
  return mapProjectTaskRow({
    ...row,
    assignees,
    ...(viewerUserId
      ? {
          viewerStatus: resolveViewerMemberStatus(row, memberStatuses, viewerUserId),
        }
      : {}),
  });
}

async function setTaskAssignees(tx: DbTransaction, taskId: string, userIds: string[]) {
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

async function getActiveTimerByUser(userId: string) {
  const [timer] = await db
    .select({
      id: agencyOpsActiveTimer.id,
      teamId: agencyOpsActiveTimer.teamId,
      userId: agencyOpsActiveTimer.userId,
      projectId: agencyOpsActiveTimer.projectId,
      taskId: agencyOpsActiveTimer.taskId,
      taskTitle: agencyOpsProjectTask.title,
      projectName: agencyOpsProject.name,
      description: agencyOpsActiveTimer.description,
      startedAt: agencyOpsActiveTimer.startedAt,
      createdAt: agencyOpsActiveTimer.createdAt,
      updatedAt: agencyOpsActiveTimer.updatedAt,
    })
    .from(agencyOpsActiveTimer)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsActiveTimer.projectId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsActiveTimer.taskId))
    .where(eq(agencyOpsActiveTimer.userId, userId))
    .limit(1);

  if (!timer) {
    return null;
  }

  return {
    id: timer.id,
    teamId: timer.teamId,
    userId: timer.userId,
    projectId: timer.projectId,
    taskId: timer.taskId,
    taskTitle: timer.taskTitle ?? null,
    projectName: timer.projectName,
    description: timer.description,
    startedAt: timer.startedAt.toISOString(),
    createdAt: timer.createdAt.toISOString(),
    updatedAt: timer.updatedAt.toISOString(),
  } satisfies AgencyActiveTimerRecord;
}

async function getProjectByIdForTeam(teamId: string, projectId: string) {
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

async function resolveTaskProjectId(teamId: string, taskId: string) {
  const [task] = await db
    .select({ projectId: agencyOpsProjectTask.projectId })
    .from(agencyOpsProjectTask)
    .where(and(eq(agencyOpsProjectTask.id, taskId), eq(agencyOpsProjectTask.teamId, teamId)))
    .limit(1);
  if (!task) {
    throw new ORPCError("NOT_FOUND", { message: "Task was not found." });
  }
  return task.projectId;
}

async function getClientByIdForTeam(teamId: string, clientId: string) {
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

async function getReportRows(
  actorUserId: string,
  input: {
    teamId: string;
    from: string;
    to: string;
    clientId?: string;
    projectId?: string;
    memberUserId?: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const from = parseIsoDateTime(input.from, "from");
  const to = parseIsoDateTime(input.to, "to");

  if (from > to) {
    throw new ORPCError("BAD_REQUEST", {
      message: "from must be before or equal to to.",
    });
  }

  const filters = [
    eq(agencyOpsTimeEntry.teamId, input.teamId),
    isNull(agencyOpsTimeEntry.deletedAt),
    gte(agencyOpsTimeEntry.startedAt, from),
    lte(agencyOpsTimeEntry.startedAt, to),
  ];

  if (input.clientId) {
    filters.push(eq(agencyOpsProject.clientId, input.clientId));
  }

  if (input.projectId) {
    filters.push(eq(agencyOpsProject.id, input.projectId));
  }

  if (input.memberUserId) {
    filters.push(eq(agencyOpsTimeEntry.userId, input.memberUserId));
  }

  const rows = await db
    .select({
      entryId: agencyOpsTimeEntry.id,
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      memberName: user.name,
      memberEmail: user.email,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      projectId: agencyOpsProject.id,
      taskId: agencyOpsTimeEntry.taskId,
      projectName: agencyOpsProject.name,
      source: agencyOpsTimeEntry.source,
      description: agencyOpsTimeEntry.description,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .innerJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .where(and(...filters))
    .orderBy(desc(agencyOpsTimeEntry.startedAt));

  const scopedProjects = await db
    .select({
      id: agencyOpsProject.id,
      name: agencyOpsProject.name,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
    })
    .from(agencyOpsProject)
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(
      and(
        eq(agencyOpsProject.teamId, input.teamId),
        input.clientId ? eq(agencyOpsProject.clientId, input.clientId) : undefined,
        input.projectId ? eq(agencyOpsProject.id, input.projectId) : undefined,
      ),
    )
    .orderBy(asc(agencyOpsProject.name));

  return {
    rows,
    scopedProjects,
  };
}

export async function listAgencyClients(
  actorUserId: string,
  input: { teamId: string; includeArchived?: boolean },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const filters = [eq(agencyOpsClient.teamId, input.teamId)];
  if (!input.includeArchived) {
    filters.push(isNull(agencyOpsClient.archivedAt));
  }

  const rows = await db
    .select({
      id: agencyOpsClient.id,
      teamId: agencyOpsClient.teamId,
      name: agencyOpsClient.name,
      archivedAt: agencyOpsClient.archivedAt,
      createdAt: agencyOpsClient.createdAt,
      updatedAt: agencyOpsClient.updatedAt,
    })
    .from(agencyOpsClient)
    .where(and(...filters))
    .orderBy(asc(agencyOpsClient.name));

  return {
    items: rows.map((row) => ({
      ...mapClientRow(row),
      archivedAt: row.archivedAt?.toISOString() ?? null,
    })),
  };
}

export async function createAgencyClient(
  actorUserId: string,
  input: { teamId: string; name: string },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const now = new Date();
  const [created] = await db
    .insert(agencyOpsClient)
    .values({
      id: createWorkspaceId("agency-client"),
      teamId: input.teamId,
      name: input.name.trim(),
      createdByUserId: actorUserId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: agencyOpsClient.id,
      teamId: agencyOpsClient.teamId,
      name: agencyOpsClient.name,
      archivedAt: agencyOpsClient.archivedAt,
      createdAt: agencyOpsClient.createdAt,
      updatedAt: agencyOpsClient.updatedAt,
    });

  if (!created) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  return { ...mapClientRow(created), archivedAt: created.archivedAt?.toISOString() ?? null };
}

export async function updateAgencyClient(
  actorUserId: string,
  input: {
    teamId: string;
    clientId: string;
    name?: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [current] = await db
    .select({
      id: agencyOpsClient.id,
    })
    .from(agencyOpsClient)
    .where(and(eq(agencyOpsClient.teamId, input.teamId), eq(agencyOpsClient.id, input.clientId)))
    .limit(1);

  if (!current) {
    throw new ORPCError("NOT_FOUND");
  }

  const now = new Date();

  const [updated] = await db
    .update(agencyOpsClient)
    .set({
      name: input.name?.trim(),
      updatedAt: now,
    })
    .where(and(eq(agencyOpsClient.teamId, input.teamId), eq(agencyOpsClient.id, input.clientId)))
    .returning({
      id: agencyOpsClient.id,
      teamId: agencyOpsClient.teamId,
      name: agencyOpsClient.name,
      archivedAt: agencyOpsClient.archivedAt,
      createdAt: agencyOpsClient.createdAt,
      updatedAt: agencyOpsClient.updatedAt,
    });

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }

  return { ...mapClientRow(updated), archivedAt: updated.archivedAt?.toISOString() ?? null };
}

export async function listAgencyProjects(
  actorUserId: string,
  input: {
    teamId: string;
    clientId?: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const rows = await db
    .select({
      id: agencyOpsProject.id,
      teamId: agencyOpsProject.teamId,
      clientId: agencyOpsProject.clientId,
      clientName: agencyOpsClient.name,
      name: agencyOpsProject.name,
      createdAt: agencyOpsProject.createdAt,
      updatedAt: agencyOpsProject.updatedAt,
    })
    .from(agencyOpsProject)
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(
      and(
        eq(agencyOpsProject.teamId, input.teamId),
        input.clientId ? eq(agencyOpsProject.clientId, input.clientId) : undefined,
      ),
    )
    .orderBy(asc(agencyOpsProject.name));

  return {
    items: rows.map(mapProjectRow),
  };
}

export async function createAgencyProject(
  actorUserId: string,
  input: {
    teamId: string;
    clientId: string;
    name: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");
  await getClientByIdForTeam(input.teamId, input.clientId);

  const now = new Date();
  const [created] = await db
    .insert(agencyOpsProject)
    .values({
      id: createWorkspaceId("agency-project"),
      teamId: input.teamId,
      clientId: input.clientId,
      name: input.name.trim(),
      createdByUserId: actorUserId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: agencyOpsProject.id,
      teamId: agencyOpsProject.teamId,
      clientId: agencyOpsProject.clientId,
      name: agencyOpsProject.name,
      createdAt: agencyOpsProject.createdAt,
      updatedAt: agencyOpsProject.updatedAt,
    });

  if (!created) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  const [client] = await db
    .select({ name: agencyOpsClient.name })
    .from(agencyOpsClient)
    .where(eq(agencyOpsClient.id, created.clientId))
    .limit(1);

  return mapProjectRow({
    ...created,
    clientName: client?.name ?? "Unknown",
  });
}

export async function updateAgencyProject(
  actorUserId: string,
  input: {
    teamId: string;
    projectId: string;
    clientId?: string;
    name?: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  if (input.clientId) {
    await getClientByIdForTeam(input.teamId, input.clientId);
  }

  const now = new Date();
  const [updated] = await db
    .update(agencyOpsProject)
    .set({
      clientId: input.clientId,
      name: input.name?.trim(),
      updatedAt: now,
    })
    .where(and(eq(agencyOpsProject.teamId, input.teamId), eq(agencyOpsProject.id, input.projectId)))
    .returning({
      id: agencyOpsProject.id,
      teamId: agencyOpsProject.teamId,
      clientId: agencyOpsProject.clientId,
      name: agencyOpsProject.name,
      createdAt: agencyOpsProject.createdAt,
      updatedAt: agencyOpsProject.updatedAt,
    });

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }

  const [client] = await db
    .select({ name: agencyOpsClient.name })
    .from(agencyOpsClient)
    .where(eq(agencyOpsClient.id, updated.clientId))
    .limit(1);

  return mapProjectRow({
    ...updated,
    clientName: client?.name ?? "Unknown",
  });
}

export async function listAgencyProjectTasks(
  actorUserId: string,
  input: {
    teamId: string;
    projectId?: string;
    status?: "open" | "in_progress" | "done" | "archived";
    statuses?: ("open" | "in_progress" | "done" | "archived")[];
    assigneeUserId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  if (input.projectId) {
    await getProjectByIdForTeam(input.teamId, input.projectId);
  }

  const searchTerm = input.search?.trim().toLowerCase();
  const filters = [eq(agencyOpsProjectTask.teamId, input.teamId)];

  if (input.projectId) {
    filters.push(eq(agencyOpsProjectTask.projectId, input.projectId));
  }

  const requestedStatuses = input.statuses ?? (input.status ? [input.status] : []);
  const filterByMemberStatus = Boolean(input.assigneeUserId && requestedStatuses.length > 0);

  if (filterByMemberStatus) {
    if (!requestedStatuses.includes("archived")) {
      filters.push(sql`${agencyOpsProjectTask.status} <> 'archived'`);
    }
    const memberStatusList = requestedStatuses.filter(
      (status): status is "open" | "in_progress" | "done" =>
        status === "open" || status === "in_progress" || status === "done",
    );
    if (memberStatusList.length > 0) {
      filters.push(
        sql`coalesce(
          (
            select ${agencyOpsProjectTaskMemberStatus.status}
            from ${agencyOpsProjectTaskMemberStatus}
            where ${agencyOpsProjectTaskMemberStatus.taskId} = ${agencyOpsProjectTask.id}
              and ${agencyOpsProjectTaskMemberStatus.userId} = ${input.assigneeUserId!}
            limit 1
          ),
          'open'
        ) in (${sql.join(
          memberStatusList.map((status) => sql`${status}`),
          sql`, `,
        )})`,
      );
    } else if (requestedStatuses.includes("archived")) {
      filters.push(eq(agencyOpsProjectTask.status, "archived"));
    }
  } else if (requestedStatuses.length > 0) {
    filters.push(inArray(agencyOpsProjectTask.status, requestedStatuses));
  }

  if (input.assigneeUserId) {
    const assigneeSubquery = db
      .select({ one: sql`1` })
      .from(agencyOpsProjectTaskAssignee)
      .where(
        and(
          eq(agencyOpsProjectTaskAssignee.taskId, agencyOpsProjectTask.id),
          eq(agencyOpsProjectTaskAssignee.userId, input.assigneeUserId),
        ),
      );
    filters.push(
      or(eq(agencyOpsProjectTask.assignedToTeam, true), exists(assigneeSubquery))!,
    );
  }
  if (searchTerm) {
    filters.push(sql`lower(${agencyOpsProjectTask.title}) like ${`%${searchTerm}%`}`);
  }

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 50));
  const offset = (page - 1) * pageSize;
  const whereClause = and(...filters);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(agencyOpsProjectTask)
    .where(whereClause);

  const parsedTotal = Number(countRow?.count ?? 0);
  const total = Number.isFinite(parsedTotal) && parsedTotal >= 0 ? parsedTotal : 0;

  const rows = await db
    .select({
      id: agencyOpsProjectTask.id,
      teamId: agencyOpsProjectTask.teamId,
      projectId: agencyOpsProjectTask.projectId,
      title: agencyOpsProjectTask.title,
      status: agencyOpsProjectTask.status,
      assignedToTeam: agencyOpsProjectTask.assignedToTeam,
      dueDate: agencyOpsProjectTask.dueDate,
      createdAt: agencyOpsProjectTask.createdAt,
      updatedAt: agencyOpsProjectTask.updatedAt,
    })
    .from(agencyOpsProjectTask)
    .where(whereClause)
    .orderBy(desc(agencyOpsProjectTask.createdAt))
    .limit(pageSize)
    .offset(offset);

  const assigneesByTask = await loadTaskAssignees(rows.map((row) => row.id));
  const memberStatusesByTask = input.assigneeUserId
    ? await loadTaskMemberStatuses(rows.map((row) => row.id))
    : undefined;

  return {
    items: await Promise.all(
      rows.map((row) =>
        buildProjectTaskRecord(
          row,
          assigneesByTask.get(row.id) ?? [],
          input.assigneeUserId,
          memberStatusesByTask?.get(row.id),
        ),
      ),
    ),
    page,
    pageSize,
    total,
  };
}

async function getTaskByIdForTeam(teamId: string, taskId: string) {
  const [task] = await db
    .select({
      id: agencyOpsProjectTask.id,
      teamId: agencyOpsProjectTask.teamId,
      projectId: agencyOpsProjectTask.projectId,
      title: agencyOpsProjectTask.title,
      status: agencyOpsProjectTask.status,
      assignedToTeam: agencyOpsProjectTask.assignedToTeam,
      dueDate: agencyOpsProjectTask.dueDate,
      createdAt: agencyOpsProjectTask.createdAt,
      updatedAt: agencyOpsProjectTask.updatedAt,
    })
    .from(agencyOpsProjectTask)
    .where(and(eq(agencyOpsProjectTask.id, taskId), eq(agencyOpsProjectTask.teamId, teamId)))
    .limit(1);

  if (!task) {
    throw new ORPCError("NOT_FOUND", {
      message: "Task was not found.",
    });
  }

  return task;
}

export async function createAgencyProjectTask(
  actorUserId: string,
  input: {
    teamId: string;
    projectId: string;
    title: string;
    status?: "open" | "in_progress" | "done" | "archived";
    assignedToTeam?: boolean;
    assigneeUserIds?: string[];
    dueDate?: string | null;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");
  await getProjectByIdForTeam(input.teamId, input.projectId);

  const title = input.title.trim();
  if (!title) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Task title is required.",
    });
  }

  const assignedToTeam = input.assignedToTeam ?? false;
  const assigneeUserIds = assignedToTeam ? [] : [...new Set(input.assigneeUserIds ?? [])];

  if (!assignedToTeam) {
    for (const userId of assigneeUserIds) {
      await requireTeamMember(input.teamId, userId);
    }
  }

  const now = new Date();
  const taskId = createWorkspaceId("agency-project-task");
  const dueDate = input.dueDate ? parseIsoDateTime(input.dueDate, "dueDate") : null;

  const [created] = await db.transaction(async (tx) => {
    const [task] = await tx
      .insert(agencyOpsProjectTask)
      .values({
        id: taskId,
        teamId: input.teamId,
        projectId: input.projectId,
        title,
        status: input.status ?? "open",
        assignedToTeam,
        dueDate,
        createdByUserId: actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: agencyOpsProjectTask.id,
        teamId: agencyOpsProjectTask.teamId,
        projectId: agencyOpsProjectTask.projectId,
        title: agencyOpsProjectTask.title,
        status: agencyOpsProjectTask.status,
        assignedToTeam: agencyOpsProjectTask.assignedToTeam,
        dueDate: agencyOpsProjectTask.dueDate,
        createdAt: agencyOpsProjectTask.createdAt,
        updatedAt: agencyOpsProjectTask.updatedAt,
      });

    if (task) {
      if (assigneeUserIds.length > 0) {
        await setTaskAssignees(tx, task.id, assigneeUserIds);
      }

      await tx.insert(agencyOpsTaskThread).values({
        id: createWorkspaceId("agency-task-thread"),
        teamId: input.teamId,
        taskId: task.id,
        createdAt: now,
        updatedAt: now,
      });
    }

    return [task];
  });

  if (!created) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  const assigneesByTask = await loadTaskAssignees([created.id]);
  const memberStatuses = await loadTaskMemberStatuses([created.id]);

  return buildProjectTaskRecord(
    created,
    assigneesByTask.get(created.id) ?? [],
    actorUserId,
    memberStatuses.get(created.id),
  );
}

export async function completeAgencyProjectTaskForMember(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const current = await getTaskByIdForTeam(input.teamId, input.taskId);
  if (current.status === "archived") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Archived tasks cannot be updated.",
    });
  }

  const canWork =
    current.assignedToTeam ||
    (
      await db
        .select({ userId: agencyOpsProjectTaskAssignee.userId })
        .from(agencyOpsProjectTaskAssignee)
        .where(
          and(
            eq(agencyOpsProjectTaskAssignee.taskId, input.taskId),
            eq(agencyOpsProjectTaskAssignee.userId, actorUserId),
          ),
        )
        .limit(1)
    ).length > 0;

  if (!canWork) {
    throw new ORPCError("FORBIDDEN", {
      message: "You are not assigned to this task.",
    });
  }

  const now = new Date();
  await db
    .insert(agencyOpsProjectTaskMemberStatus)
    .values({
      taskId: input.taskId,
      userId: actorUserId,
      status: "done",
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        agencyOpsProjectTaskMemberStatus.taskId,
        agencyOpsProjectTaskMemberStatus.userId,
      ],
      set: {
        status: "done",
        completedAt: now,
        updatedAt: now,
      },
    });

  const assigneesByTask = await loadTaskAssignees([current.id]);
  const memberStatuses = await loadTaskMemberStatuses([current.id]);

  return buildProjectTaskRecord(
    current,
    assigneesByTask.get(current.id) ?? [],
    actorUserId,
    memberStatuses.get(current.id),
  );
}

export async function updateAgencyProjectTask(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
    title?: string;
    status?: "open" | "in_progress" | "done" | "archived";
    assignedToTeam?: boolean;
    assigneeUserIds?: string[];
    dueDate?: string | null;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const current = await getTaskByIdForTeam(input.teamId, input.taskId);

  const title = input.title?.trim();
  if (title === "") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Task title cannot be empty.",
    });
  }

  const dueDate =
    input.dueDate !== undefined
      ? input.dueDate
        ? parseIsoDateTime(input.dueDate, "dueDate")
        : null
      : current.dueDate;

  let nextAssignedToTeam = current.assignedToTeam;
  let nextAssigneeUserIds: string[] | null = null;

  if (input.assignedToTeam === true) {
    nextAssignedToTeam = true;
    nextAssigneeUserIds = [];
  } else if (input.assignedToTeam === false || input.assigneeUserIds !== undefined) {
    nextAssignedToTeam = false;
    nextAssigneeUserIds = [...new Set(input.assigneeUserIds ?? [])];
    for (const userId of nextAssigneeUserIds) {
      await requireTeamMember(input.teamId, userId);
    }
  }

  const now = new Date();
  const [updated] = await db.transaction(async (tx) => {
    const [task] = await tx
      .update(agencyOpsProjectTask)
      .set({
        ...(title ? { title } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.assignedToTeam !== undefined || input.assigneeUserIds !== undefined
          ? { assignedToTeam: nextAssignedToTeam }
          : {}),
        dueDate,
        updatedAt: now,
      })
      .where(
        and(eq(agencyOpsProjectTask.teamId, input.teamId), eq(agencyOpsProjectTask.id, input.taskId)),
      )
      .returning({
        id: agencyOpsProjectTask.id,
        teamId: agencyOpsProjectTask.teamId,
        projectId: agencyOpsProjectTask.projectId,
        title: agencyOpsProjectTask.title,
        status: agencyOpsProjectTask.status,
        assignedToTeam: agencyOpsProjectTask.assignedToTeam,
        dueDate: agencyOpsProjectTask.dueDate,
        createdAt: agencyOpsProjectTask.createdAt,
        updatedAt: agencyOpsProjectTask.updatedAt,
      });

    if (task && nextAssigneeUserIds !== null) {
      await setTaskAssignees(tx, task.id, nextAssigneeUserIds);
    }

    return [task];
  });

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }

  const assigneesByTask = await loadTaskAssignees([updated.id]);

  return buildProjectTaskRecord(updated, assigneesByTask.get(updated.id) ?? []);
}

export async function deleteAgencyProjectTask(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [deleted] = await db
    .delete(agencyOpsProjectTask)
    .where(
      and(eq(agencyOpsProjectTask.teamId, input.teamId), eq(agencyOpsProjectTask.id, input.taskId)),
    )
    .returning({ id: agencyOpsProjectTask.id });

  if (!deleted) {
    throw new ORPCError("NOT_FOUND", {
      message: "Task was not found.",
    });
  }

  return {
    taskId: deleted.id,
    deleted: true,
  };
}

async function requireTeamMember(teamId: string, userId: string) {
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

export async function ensureTaskThreadByTaskId(teamId: string, taskId: string) {
  const [existingThread] = await db
    .select({
      id: agencyOpsTaskThread.id,
      teamId: agencyOpsTaskThread.teamId,
      taskId: agencyOpsTaskThread.taskId,
    })
    .from(agencyOpsTaskThread)
    .where(and(eq(agencyOpsTaskThread.teamId, teamId), eq(agencyOpsTaskThread.taskId, taskId)))
    .limit(1);

  if (existingThread) {
    return existingThread;
  }

  const now = new Date();
  const [thread] = await db
    .insert(agencyOpsTaskThread)
    .values({
      id: createWorkspaceId("agency-task-thread"),
      teamId,
      taskId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agencyOpsTaskThread.taskId],
      set: { updatedAt: sql`${agencyOpsTaskThread.updatedAt}` },
    })
    .returning({
      id: agencyOpsTaskThread.id,
      teamId: agencyOpsTaskThread.teamId,
      taskId: agencyOpsTaskThread.taskId,
    });

  if (!thread || thread.teamId !== teamId) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  return thread;
}

async function mapTaskMessageRow(row: {
  id: string;
  teamId: string;
  threadId: string;
  userId: string;
  userName: string | null;
  userAvatar: string | null;
  content: string;
  type: "text" | "voice" | "attachment";
  senderType: "user" | "agent";
  createdAt: Date;
  updatedAt: Date;
}): Promise<AgencyTaskMessageRecord> {
  const attachments = await db
    .select({
      id: agencyOpsTaskAttachment.id,
      teamId: agencyOpsTaskAttachment.teamId,
      messageId: agencyOpsTaskAttachment.messageId,
      fileName: agencyOpsTaskAttachment.fileName,
      mimeType: agencyOpsTaskAttachment.mimeType,
      storageKey: agencyOpsTaskAttachment.storageKey,
      sizeBytes: agencyOpsTaskAttachment.sizeBytes,
      durationSeconds: agencyOpsTaskAttachment.durationSeconds,
      metadata: agencyOpsTaskAttachment.metadata,
      createdAt: agencyOpsTaskAttachment.createdAt,
      deletedAt: agencyOpsTaskAttachment.deletedAt,
    })
    .from(agencyOpsTaskAttachment)
    .where(
      and(eq(agencyOpsTaskAttachment.messageId, row.id), isNull(agencyOpsTaskAttachment.deletedAt)),
    );

  return {
    id: row.id,
    teamId: row.teamId,
    threadId: row.threadId,
    userId: row.userId,
    userName: row.senderType === "agent" ? "Agent" : (row.userName ?? "Unknown"),
    userAvatar: row.senderType === "agent" ? null : formatAvatarUrl(row.userAvatar),
    content: row.content,
    type: row.type,
    senderType: row.senderType,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    attachments: await Promise.all(
      attachments.map(async (a) => ({
        id: a.id,
        teamId: a.teamId,
        messageId: a.messageId,
        fileName: a.fileName,
        mimeType: a.mimeType,
        storageKey: a.storageKey,
        sizeBytes: a.sizeBytes,
        durationSeconds: a.durationSeconds,
        metadata: a.metadata as AttachmentMetadata | null,
        createdAt: a.createdAt.toISOString(),
        url: await resolveTaskAttachmentUrl({
          storageKey: a.storageKey,
          metadata: a.metadata as AttachmentMetadata | null,
        }),
      })),
    ),
  };
}

export async function listTaskThreadMessages(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
    page?: number;
    pageSize?: number;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  await getTaskByIdForTeam(input.teamId, input.taskId);
  const thread = await ensureTaskThreadByTaskId(input.teamId, input.taskId);

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: agencyOpsTaskMessage.id,
      teamId: agencyOpsTaskMessage.teamId,
      threadId: agencyOpsTaskMessage.threadId,
      userId: agencyOpsTaskMessage.userId,
      userName: user.name,
      userAvatar: user.image,
      content: agencyOpsTaskMessage.content,
      type: agencyOpsTaskMessage.type,
      senderType: agencyOpsTaskMessage.senderType,
      createdAt: agencyOpsTaskMessage.createdAt,
      updatedAt: agencyOpsTaskMessage.updatedAt,
    })
    .from(agencyOpsTaskMessage)
    .leftJoin(user, eq(user.id, agencyOpsTaskMessage.userId))
    .where(
      and(eq(agencyOpsTaskMessage.threadId, thread.id), isNull(agencyOpsTaskMessage.deletedAt)),
    )
    .orderBy(desc(agencyOpsTaskMessage.createdAt))
    .limit(pageSize)
    .offset(offset);

  const items = await Promise.all(
    rows.map((row) =>
      mapTaskMessageRow({
        ...row,
        userName: row.userName ?? null,
        userAvatar: row.userAvatar ?? null,
        type: row.type as "text" | "voice" | "attachment",
        senderType: row.senderType as "user" | "agent",
      }),
    ),
  );

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(agencyOpsTaskMessage)
    .where(
      and(eq(agencyOpsTaskMessage.threadId, thread.id), isNull(agencyOpsTaskMessage.deletedAt)),
    );

  const parsedTotal = Number(countRow?.count ?? 0);
  const total = Number.isFinite(parsedTotal) && parsedTotal >= 0 ? parsedTotal : 0;

  return {
    items,
    page,
    pageSize,
    total,
  };
}

export async function createTaskThreadMessage(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
    content: string;
    type?: "text" | "voice" | "attachment";
    attachments?: Array<{
      fileName: string;
      mimeType: string;
      storageKey: string;
      sizeBytes: number;
      durationSeconds?: number | null;
      uploadToken: string;
      metadata?: AttachmentMetadata | null;
    }>;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  await getTaskByIdForTeam(input.teamId, input.taskId);
  const thread = await ensureTaskThreadByTaskId(input.teamId, input.taskId);

  const type = input.type ?? "text";
  const content = input.content.trim();

  if (type === "text" && !content) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Message content is required.",
    });
  }

  validateTaskAttachmentUploadReferences(input);

  const now = new Date();
  const messageId = createWorkspaceId("agency-task-message");

  const [created] = await db.transaction(async (tx) => {
    const [message] = await tx
      .insert(agencyOpsTaskMessage)
      .values({
        id: messageId,
        teamId: input.teamId,
        threadId: thread.id,
        userId: actorUserId,
        content,
        type,
        senderType: "user",
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: agencyOpsTaskMessage.id,
        teamId: agencyOpsTaskMessage.teamId,
        threadId: agencyOpsTaskMessage.threadId,
        userId: agencyOpsTaskMessage.userId,
        content: agencyOpsTaskMessage.content,
        type: agencyOpsTaskMessage.type,
        createdAt: agencyOpsTaskMessage.createdAt,
        updatedAt: agencyOpsTaskMessage.updatedAt,
      });

    if (input.attachments && input.attachments.length > 0 && message) {
      await tx.insert(agencyOpsTaskAttachment).values(
        input.attachments.map((attachment) => ({
          id: createWorkspaceId("agency-task-attachment"),
          teamId: input.teamId,
          messageId: message.id,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          storageKey: attachment.storageKey,
          sizeBytes: attachment.sizeBytes,
          durationSeconds: attachment.durationSeconds ?? null,
          metadata: attachment.metadata ?? null,
          createdAt: now,
        })),
      );
    }

    return [message];
  });

  if (!created) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  await db
    .update(agencyOpsTaskThread)
    .set({ updatedAt: now })
    .where(eq(agencyOpsTaskThread.id, thread.id));

  return mapTaskMessageRow({
    ...created,
    userName: null,
    userAvatar: null,
    type: created.type as "text" | "voice" | "attachment",
    senderType: "user",
  });
}

export function validateTaskAttachmentUploadReferences(input: {
  teamId: string;
  taskId: string;
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    storageKey: string;
    sizeBytes: number;
    uploadToken: string;
  }>;
}) {
  for (const attachment of input.attachments ?? []) {
    const linkPrefix = `task-links/${input.teamId}/${input.taskId}/`;
    if (attachment.storageKey.startsWith(linkPrefix)) {
      if (
        attachment.mimeType !== "text/uri-list" ||
        attachment.sizeBytes !== 0 ||
        !verifyTaskAttachmentUploadToken(attachment.uploadToken, {
          teamId: input.teamId,
          taskId: input.taskId,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          storageKey: attachment.storageKey,
          sizeBytes: attachment.sizeBytes,
        })
      ) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Link attachment reference is invalid or expired.",
        });
      }
      continue;
    }

    const expectedPrefix = `task-attachments/${input.teamId}/${input.taskId}/`;
    if (
      !attachment.storageKey.startsWith(expectedPrefix) ||
      !verifyTaskAttachmentUploadToken(attachment.uploadToken, {
        teamId: input.teamId,
        taskId: input.taskId,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        storageKey: attachment.storageKey,
        sizeBytes: attachment.sizeBytes,
      })
    ) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Attachment upload reference is invalid or expired.",
      });
    }
  }
}

export async function createTaskAttachmentPresignedUrl(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  await getTaskByIdForTeam(input.teamId, input.taskId);

  const extension = input.fileName.split(".").pop() ?? "";
  const storageKey = `task-attachments/${input.teamId}/${input.taskId}/${createWorkspaceId("upload")}${extension ? `.${extension}` : ""}`;

  const { uploadUrl, publicUrl } = await createTaskAttachmentPresignedUploadUrl({
    storageKey,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  });

  return {
    storageKey,
    publicUrl,
    uploadUrl,
    uploadToken: createTaskAttachmentUploadToken({
      teamId: input.teamId,
      taskId: input.taskId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      storageKey,
      sizeBytes: input.sizeBytes,
    }),
  };
}

export async function createTaskLinkAttachment(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
    url: string;
    label?: string | null;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  await getTaskByIdForTeam(input.teamId, input.taskId);

  const sourceUrl = normalizeTaskLinkUrl(input.url);
  const fileName = deriveTaskLinkLabel(sourceUrl, input.label);
  const storageKey = `task-links/${input.teamId}/${input.taskId}/${createWorkspaceId("link")}`;
  const mimeType = "text/uri-list";

  return {
    storageKey,
    publicUrl: sourceUrl,
    fileName,
    mimeType,
    sizeBytes: 0,
    metadata: {
      mediaKind: "link" as const,
      sourceUrl,
    },
    uploadToken: createTaskAttachmentUploadToken({
      teamId: input.teamId,
      taskId: input.taskId,
      fileName,
      mimeType,
      storageKey,
      sizeBytes: 0,
    }),
  };
}

export async function deleteTaskAttachment(
  actorUserId: string,
  input: {
    teamId: string;
    attachmentId: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [attachment] = await db
    .select({
      id: agencyOpsTaskAttachment.id,
      teamId: agencyOpsTaskAttachment.teamId,
      storageKey: agencyOpsTaskAttachment.storageKey,
      deletedAt: agencyOpsTaskAttachment.deletedAt,
    })
    .from(agencyOpsTaskAttachment)
    .where(
      and(
        eq(agencyOpsTaskAttachment.id, input.attachmentId),
        eq(agencyOpsTaskAttachment.teamId, input.teamId),
      ),
    )
    .limit(1);

  if (!attachment) {
    throw new ORPCError("NOT_FOUND", {
      message: "Attachment was not found.",
    });
  }

  if (attachment.deletedAt) {
    return {
      attachmentId: attachment.id,
      deleted: true,
    };
  }

  const now = new Date();

  if (!isTaskLinkStorageKey(attachment.storageKey)) {
    await deleteTaskAttachmentFromStorage(attachment.storageKey);
  }
  await db
    .update(agencyOpsTaskAttachment)
    .set({ deletedAt: now })
    .where(eq(agencyOpsTaskAttachment.id, attachment.id));

  return {
    attachmentId: attachment.id,
    deleted: true,
  };
}

export async function listTaskThreadMembers(
  actorUserId: string,
  input: {
    teamId: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const members = await db
    .select({
      userId: workspaceTeamMember.userId,
      userName: user.name,
      userAvatar: user.image,
    })
    .from(workspaceTeamMember)
    .leftJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, input.teamId))
    .orderBy(asc(user.name));

  return {
    items: members.map((m) => ({
      userId: m.userId,
      userName: m.userName ?? "Unknown",
      userAvatar: formatAvatarUrl(m.userAvatar),
    })),
  };
}

export async function getTaskThreadContext(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const [context] = await db
    .select({
      taskId: agencyOpsProjectTask.id,
      taskTitle: agencyOpsProjectTask.title,
      taskStatus: agencyOpsProjectTask.status,
      projectId: agencyOpsProject.id,
      projectName: agencyOpsProject.name,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      assignedToTeam: agencyOpsProjectTask.assignedToTeam,
    })
    .from(agencyOpsProjectTask)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsProjectTask.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(
      and(eq(agencyOpsProjectTask.id, input.taskId), eq(agencyOpsProjectTask.teamId, input.teamId)),
    )
    .limit(1);

  if (!context) {
    throw new ORPCError("NOT_FOUND", {
      message: "Task was not found.",
    });
  }

  const assigneesByTask = await loadTaskAssignees([context.taskId]);
  const assignees = assigneesByTask.get(context.taskId) ?? [];

  return {
    ...context,
    assigneeName:
      context.assignedToTeam || assignees.length > 0
        ? context.assignedToTeam
          ? "Entire team"
          : assignees.map((assignee) => assignee.userName).join(", ")
        : null,
  };
}

export async function listRecentTaskThreadMessages(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
    limit?: number;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  await getTaskByIdForTeam(input.teamId, input.taskId);
  const thread = await ensureTaskThreadByTaskId(input.teamId, input.taskId);

  const limit = Math.min(50, Math.max(1, input.limit ?? 20));

  const rows = await db
    .select({
      id: agencyOpsTaskMessage.id,
      teamId: agencyOpsTaskMessage.teamId,
      threadId: agencyOpsTaskMessage.threadId,
      userId: agencyOpsTaskMessage.userId,
      userName: user.name,
      userAvatar: user.image,
      content: agencyOpsTaskMessage.content,
      type: agencyOpsTaskMessage.type,
      senderType: agencyOpsTaskMessage.senderType,
      createdAt: agencyOpsTaskMessage.createdAt,
      updatedAt: agencyOpsTaskMessage.updatedAt,
    })
    .from(agencyOpsTaskMessage)
    .leftJoin(user, eq(user.id, agencyOpsTaskMessage.userId))
    .where(
      and(eq(agencyOpsTaskMessage.threadId, thread.id), isNull(agencyOpsTaskMessage.deletedAt)),
    )
    .orderBy(desc(agencyOpsTaskMessage.createdAt))
    .limit(limit);

  const items = await Promise.all(
    rows.map((row) =>
      mapTaskMessageRow({
        ...row,
        userName: row.userName ?? null,
        userAvatar: row.userAvatar ?? null,
        type: row.type as "text" | "voice" | "attachment",
        senderType: row.senderType as "user" | "agent",
      }),
    ),
  );

  return {
    items: items.reverse(),
  };
}

export async function getAgencyActiveTimer(actorUserId: string, input: { teamId?: string }) {
  const timer = await getActiveTimerByUser(actorUserId);

  if (!timer) {
    return {
      timer: null,
    };
  }

  await requireTeamMembership(actorUserId, timer.teamId, "viewer");

  if (input.teamId && timer.teamId !== input.teamId) {
    return {
      timer: null,
    };
  }

  return {
    timer,
  };
}

export async function startAgencyTimer(
  actorUserId: string,
  input: {
    teamId: string;
    projectId?: string;
    taskId?: string;
    description?: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  let projectId = input.projectId;
  if (input.taskId) {
    const taskProjectId = await resolveTaskProjectId(input.teamId, input.taskId);
    if (projectId && projectId !== taskProjectId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "taskId does not belong to the provided projectId.",
      });
    }
    projectId = taskProjectId;
  } else if (!projectId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "projectId or taskId is required.",
    });
  }

  await getProjectByIdForTeam(input.teamId, projectId);

  const now = new Date();

  const [existing] = await db
    .select({
      id: agencyOpsActiveTimer.id,
      teamId: agencyOpsActiveTimer.teamId,
      projectId: agencyOpsActiveTimer.projectId,
      taskId: agencyOpsActiveTimer.taskId,
      description: agencyOpsActiveTimer.description,
      startedAt: agencyOpsActiveTimer.startedAt,
    })
    .from(agencyOpsActiveTimer)
    .where(eq(agencyOpsActiveTimer.userId, actorUserId))
    .limit(1);

  let rolledOverEntryId: string | null = null;

  await db.transaction(async (tx) => {
    if (existing) {
      const durationSeconds = getDurationSeconds(existing.startedAt, now);
      rolledOverEntryId = createWorkspaceId("agency-time");

      await tx.insert(agencyOpsTimeEntry).values({
        id: rolledOverEntryId,
        teamId: existing.teamId,
        projectId: existing.projectId,
        taskId: existing.taskId,
        userId: actorUserId,
        source: "timer",
        description: existing.description,
        startedAt: existing.startedAt,
        endedAt: now,
        durationSeconds,
        createdAt: now,
        updatedAt: now,
      });

      await tx.delete(agencyOpsActiveTimer).where(eq(agencyOpsActiveTimer.id, existing.id));
    }

    await tx.insert(agencyOpsActiveTimer).values({
      id: createWorkspaceId("agency-active-timer"),
      teamId: input.teamId,
      projectId,
      taskId: input.taskId ?? null,
      userId: actorUserId,
      description: input.description?.trim() ?? "",
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    if (input.taskId) {
      await tx
        .update(agencyOpsProjectTask)
        .set({ status: "in_progress", updatedAt: now })
        .where(
          and(
            eq(agencyOpsProjectTask.id, input.taskId),
            eq(agencyOpsProjectTask.teamId, input.teamId),
            eq(agencyOpsProjectTask.status, "open"),
          ),
        );
    }
  });

  const timer = await getActiveTimerByUser(actorUserId);
  const createdEntry = rolledOverEntryId
    ? await fetchAgencyTimeEntryRecord(rolledOverEntryId)
    : null;

  return {
    timer,
    createdEntry,
  };
}

async function fetchAgencyTimeEntryRecord(entryId: string) {
  const [row] = await db
    .select({
      id: agencyOpsTimeEntry.id,
      teamId: agencyOpsTimeEntry.teamId,
      userId: agencyOpsTimeEntry.userId,
      userName: user.name,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
      taskTitle: agencyOpsProjectTask.title,
      projectName: agencyOpsProject.name,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      source: agencyOpsTimeEntry.source,
      description: agencyOpsTimeEntry.description,
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      createdAt: agencyOpsTimeEntry.createdAt,
      updatedAt: agencyOpsTimeEntry.updatedAt,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .where(eq(agencyOpsTimeEntry.id, entryId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    teamId: row.teamId,
    userId: row.userId,
    userName: row.userName ?? "Unknown",
    projectId: row.projectId,
    taskId: row.taskId ?? null,
    taskTitle: row.taskTitle ?? null,
    projectName: row.projectName,
    clientId: row.clientId,
    clientName: row.clientName,
    source: row.source,
    description: row.description,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt.toISOString(),
    durationSeconds: row.durationSeconds,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies AgencyTimeEntryRecord;
}

export async function stopAgencyTimer(
  actorUserId: string,
  input: {
    teamId?: string;
    taskId?: string;
    description?: string;
    discard?: boolean;
  },
) {
  const [active] = await db
    .select({
      id: agencyOpsActiveTimer.id,
      teamId: agencyOpsActiveTimer.teamId,
      projectId: agencyOpsActiveTimer.projectId,
      taskId: agencyOpsActiveTimer.taskId,
      description: agencyOpsActiveTimer.description,
      startedAt: agencyOpsActiveTimer.startedAt,
    })
    .from(agencyOpsActiveTimer)
    .where(eq(agencyOpsActiveTimer.userId, actorUserId))
    .limit(1);

  if (!active) {
    return {
      timer: null,
      createdEntry: null,
    };
  }

  await requireTeamMembership(actorUserId, active.teamId, "viewer");

  if (input.teamId && active.teamId !== input.teamId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Active timer belongs to a different team.",
    });
  }

  let taskId = active.taskId ?? null;
  if (input.taskId) {
    const taskProjectId = await resolveTaskProjectId(active.teamId, input.taskId);
    if (taskProjectId !== active.projectId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Task must belong to the active timer project.",
      });
    }
    taskId = active.taskId ?? input.taskId;
  }

  if (!input.discard && !taskId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Choose a task before stopping this timer.",
    });
  }

  const now = new Date();
  const description = input.description?.trim() ?? active.description;

  if (!input.discard && !description) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Add a description before stopping this timer.",
    });
  }

  const durationSeconds = getDurationSeconds(active.startedAt, now);

  if (input.discard) {
    await db.delete(agencyOpsActiveTimer).where(eq(agencyOpsActiveTimer.id, active.id));

    return {
      timer: null,
      createdEntry: null,
    };
  }

  const [entry] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(agencyOpsTimeEntry)
      .values({
        id: createWorkspaceId("agency-time"),
        teamId: active.teamId,
        projectId: active.projectId,
        taskId,
        userId: actorUserId,
        source: "timer",
        description,
        startedAt: active.startedAt,
        endedAt: now,
        durationSeconds,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: agencyOpsTimeEntry.id });

    await tx.delete(agencyOpsActiveTimer).where(eq(agencyOpsActiveTimer.id, active.id));

    if (taskId) {
      await tx
        .update(agencyOpsProjectTask)
        .set({ status: "in_progress", updatedAt: now })
        .where(
          and(
            eq(agencyOpsProjectTask.id, taskId),
            eq(agencyOpsProjectTask.teamId, active.teamId),
            eq(agencyOpsProjectTask.status, "open"),
          ),
        );
    }

    return [created];
  });

  if (!entry) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  const createdEntry = await fetchAgencyTimeEntryRecord(entry.id);

  return {
    timer: null,
    createdEntry,
  };
}

export async function listMyAgencyTimeEntries(
  actorUserId: string,
  input: {
    teamId: string;
    page?: number;
    pageSize?: number;
    anchorDate?: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: agencyOpsTimeEntry.id,
      teamId: agencyOpsTimeEntry.teamId,
      userId: agencyOpsTimeEntry.userId,
      userName: user.name,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
      taskTitle: agencyOpsProjectTask.title,
      projectName: agencyOpsProject.name,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      source: agencyOpsTimeEntry.source,
      description: agencyOpsTimeEntry.description,
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      createdAt: agencyOpsTimeEntry.createdAt,
      updatedAt: agencyOpsTimeEntry.updatedAt,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        eq(agencyOpsTimeEntry.userId, actorUserId),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    )
    .orderBy(desc(agencyOpsTimeEntry.startedAt))
    .limit(pageSize)
    .offset(offset);

  const items = rows.map(
    (row) =>
      ({
        id: row.id,
        teamId: row.teamId,
        userId: row.userId,
        userName: row.userName ?? "Unknown",
        projectId: row.projectId,
        taskId: row.taskId ?? null,
        taskTitle: row.taskTitle ?? null,
        projectName: row.projectName,
        clientId: row.clientId,
        clientName: row.clientName,
        source: row.source,
        description: row.description,
        startedAt: row.startedAt.toISOString(),
        endedAt: row.endedAt.toISOString(),
        durationSeconds: row.durationSeconds,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }) satisfies AgencyTimeEntryRecord,
  );

  // Count total for pagination
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        eq(agencyOpsTimeEntry.userId, actorUserId),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    );

  const parsedTotal = Number(countRow?.count ?? 0);
  const total = Number.isFinite(parsedTotal) && parsedTotal >= 0 ? parsedTotal : 0;

  // Compute week summary for the anchor date (or current week)
  const anchor = input.anchorDate ? parseIsoDateTime(input.anchorDate, "anchorDate") : new Date();
  const weekStart = getWeekStartUtc(anchor);
  const weekEnd = addDaysUtc(weekStart, 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  const weekRows = await db
    .select({
      startedAt: agencyOpsTimeEntry.startedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        eq(agencyOpsTimeEntry.userId, actorUserId),
        isNull(agencyOpsTimeEntry.deletedAt),
        gte(agencyOpsTimeEntry.startedAt, weekStart),
        lte(agencyOpsTimeEntry.startedAt, weekEnd),
      ),
    );

  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const day = addDaysUtc(weekStart, i);
    dailyMap.set(day.toISOString().slice(0, 10), 0);
  }
  let weekTotalSeconds = 0;
  for (const wr of weekRows) {
    const dateKey = wr.startedAt.toISOString().slice(0, 10);
    dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + wr.durationSeconds);
    weekTotalSeconds += wr.durationSeconds;
  }

  const weekSummary = {
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
    totalSeconds: weekTotalSeconds,
    daily: [...dailyMap.entries()].map(([date, totalSeconds]) => ({ date, totalSeconds })),
  };

  return {
    items,
    page,
    pageSize,
    total,
    weekSummary,
  };
}

// ---------------------------------------------------------------------------
// Client archive
// ---------------------------------------------------------------------------

export async function archiveAgencyClient(
  actorUserId: string,
  input: { teamId: string; clientId: string },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [client] = await db
    .select({ id: agencyOpsClient.id, archivedAt: agencyOpsClient.archivedAt })
    .from(agencyOpsClient)
    .where(and(eq(agencyOpsClient.id, input.clientId), eq(agencyOpsClient.teamId, input.teamId)))
    .limit(1);

  if (!client) {
    throw new ORPCError("NOT_FOUND", { message: "Client was not found." });
  }

  if (client.archivedAt) {
    throw new ORPCError("BAD_REQUEST", { message: "Client is already archived." });
  }

  const now = new Date();
  await db
    .update(agencyOpsClient)
    .set({ archivedAt: now, updatedAt: now })
    .where(and(eq(agencyOpsClient.id, input.clientId), eq(agencyOpsClient.teamId, input.teamId)));

  return { clientId: input.clientId, archived: true };
}

export async function unarchiveAgencyClient(
  actorUserId: string,
  input: { teamId: string; clientId: string },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const now = new Date();
  await db
    .update(agencyOpsClient)
    .set({ archivedAt: null, updatedAt: now })
    .where(and(eq(agencyOpsClient.id, input.clientId), eq(agencyOpsClient.teamId, input.teamId)));

  return { clientId: input.clientId, archived: false };
}

// ---------------------------------------------------------------------------
// Client contact (one per client — upsert semantics)
// ---------------------------------------------------------------------------

type AgencyClientContactRecord = {
  id: string;
  teamId: string;
  clientId: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
};

export async function getClientContact(
  actorUserId: string,
  input: { teamId: string; clientId: string },
): Promise<AgencyClientContactRecord | null> {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const [row] = await db
    .select()
    .from(agencyOpsClientContact)
    .where(
      and(
        eq(agencyOpsClientContact.teamId, input.teamId),
        eq(agencyOpsClientContact.clientId, input.clientId),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    teamId: row.teamId,
    clientId: row.clientId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function upsertClientContact(
  actorUserId: string,
  input: {
    teamId: string;
    clientId: string;
    name?: string;
    email?: string;
    phone?: string;
  },
): Promise<AgencyClientContactRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  await getClientByIdForTeam(input.teamId, input.clientId);

  const now = new Date();

  // Use a single upsert to avoid a TOCTOU race between the existence check
  // and the insert (two concurrent callers could both see no row and both try
  // to insert, hitting the unique constraint).
  const [upserted] = await db
    .insert(agencyOpsClientContact)
    .values({
      id: createWorkspaceId("agency-contact"),
      teamId: input.teamId,
      clientId: input.clientId,
      name: input.name ?? "",
      email: input.email ?? "",
      phone: input.phone ?? "",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agencyOpsClientContact.clientId],
      set: {
        name: input.name !== undefined ? input.name : sql`${agencyOpsClientContact.name}`,
        email: input.email !== undefined ? input.email : sql`${agencyOpsClientContact.email}`,
        phone: input.phone !== undefined ? input.phone : sql`${agencyOpsClientContact.phone}`,
        updatedAt: now,
      },
    })
    .returning();

  if (!upserted) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return {
    id: upserted.id,
    teamId: upserted.teamId,
    clientId: upserted.clientId,
    name: upserted.name,
    email: upserted.email,
    phone: upserted.phone,
    createdAt: upserted.createdAt.toISOString(),
    updatedAt: upserted.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Member rates
// ---------------------------------------------------------------------------

type AgencyMemberRateRecord = {
  userId: string;
  userName: string;
  userEmail: string;
  costRateCents: number | null;
  billableRateCents: number | null;
  currency: string;
  effectiveFrom: string | null;
};

export async function listMemberRates(
  actorUserId: string,
  input: { teamId: string },
): Promise<{ items: AgencyMemberRateRecord[] }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const members = await db
    .select({
      userId: workspaceTeamMember.userId,
      userName: user.name,
      userEmail: user.email,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, input.teamId))
    .orderBy(asc(user.name));

  if (members.length === 0) return { items: [] };

  const userIds = members.map((m) => m.userId);

  const rateRows = await db
    .select()
    .from(agencyOpsMemberRate)
    .where(
      and(
        eq(agencyOpsMemberRate.teamId, input.teamId),
        inArray(agencyOpsMemberRate.userId, userIds),
      ),
    );

  const rateByUserId = new Map(rateRows.map((r) => [r.userId, r]));

  const items: AgencyMemberRateRecord[] = members.map((m) => {
    const rate = rateByUserId.get(m.userId);
    return {
      userId: m.userId,
      userName: m.userName ?? "Unknown",
      userEmail: m.userEmail,
      costRateCents: rate?.costRateCents ?? null,
      billableRateCents: rate?.billableRateCents ?? null,
      currency: rate?.currency ?? "USD",
      effectiveFrom: rate?.effectiveFrom?.toISOString() ?? null,
    };
  });

  return { items };
}

export async function upsertMemberRate(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
    costRateCents?: number | null;
    billableRateCents?: number | null;
    currency?: string;
    effectiveFrom?: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [membership] = await db
    .select({ userId: workspaceTeamMember.userId })
    .from(workspaceTeamMember)
    .where(
      and(
        eq(workspaceTeamMember.teamId, input.teamId),
        eq(workspaceTeamMember.userId, input.userId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new ORPCError("NOT_FOUND", { message: "User is not a member of this team." });
  }

  const now = new Date();
  const effectiveFrom = input.effectiveFrom
    ? parseIsoDateTime(input.effectiveFrom, "effectiveFrom")
    : now;

  const [upserted] = await db
    .insert(agencyOpsMemberRate)
    .values({
      id: createWorkspaceId("agency-rate"),
      teamId: input.teamId,
      userId: input.userId,
      costRateCents: input.costRateCents ?? null,
      billableRateCents: input.billableRateCents ?? null,
      currency: input.currency ?? "USD",
      effectiveFrom,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agencyOpsMemberRate.teamId, agencyOpsMemberRate.userId],
      set: {
        // Only overwrite a field when the caller explicitly provided it;
        // otherwise keep the existing value via COALESCE.
        costRateCents:
          input.costRateCents !== undefined
            ? input.costRateCents
            : sql`COALESCE(${agencyOpsMemberRate.costRateCents}, ${agencyOpsMemberRate.costRateCents})`,
        billableRateCents:
          input.billableRateCents !== undefined
            ? input.billableRateCents
            : sql`COALESCE(${agencyOpsMemberRate.billableRateCents}, ${agencyOpsMemberRate.billableRateCents})`,
        currency:
          input.currency !== undefined ? input.currency : sql`${agencyOpsMemberRate.currency}`,
        effectiveFrom:
          input.effectiveFrom !== undefined
            ? effectiveFrom
            : sql`${agencyOpsMemberRate.effectiveFrom}`,
        updatedAt: now,
      },
    })
    .returning();

  if (!upserted) throw new ORPCError("INTERNAL_SERVER_ERROR");

  const [userRow] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, input.userId))
    .limit(1);

  return {
    userId: upserted.userId,
    userName: userRow?.name ?? "Unknown",
    userEmail: userRow?.email ?? "",
    costRateCents: upserted.costRateCents,
    billableRateCents: upserted.billableRateCents,
    currency: upserted.currency,
    effectiveFrom: upserted.effectiveFrom.toISOString(),
  } satisfies AgencyMemberRateRecord;
}

// ---------------------------------------------------------------------------
// Member capacity
// ---------------------------------------------------------------------------

type AgencyCapacityWeek = {
  weekStart: string;
  members: Array<{
    userId: string;
    userName: string;
    capacitySeconds: number;
    bookedSeconds: number;
    loggedSeconds: number;
  }>;
};

export async function listMemberCapacity(
  actorUserId: string,
  input: { teamId: string; weekStart: string; weeks: number },
): Promise<{ weeks: AgencyCapacityWeek[] }> {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const weekStartRaw = parseIsoDateTime(input.weekStart, "weekStart");
  // Normalize to exact UTC midnight so map keys are consistent with date_trunc output.
  const weekStartDate = new Date(
    Date.UTC(weekStartRaw.getUTCFullYear(), weekStartRaw.getUTCMonth(), weekStartRaw.getUTCDate()),
  );

  const weekStarts: Date[] = Array.from({ length: input.weeks }, (_, i) => {
    const d = new Date(weekStartDate);
    d.setUTCDate(d.getUTCDate() + i * 7);
    return d;
  });

  const weekStartStrings = weekStarts.map((d) => d.toISOString());

  const members = await db
    .select({
      userId: workspaceTeamMember.userId,
      userName: user.name,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, input.teamId))
    .orderBy(asc(user.name));

  if (members.length === 0) return { weeks: [] };

  const userIds = members.map((m) => m.userId);

  const capacityRows = await db
    .select()
    .from(agencyOpsMemberCapacity)
    .where(
      and(
        eq(agencyOpsMemberCapacity.teamId, input.teamId),
        inArray(agencyOpsMemberCapacity.userId, userIds),
        gte(agencyOpsMemberCapacity.weekStart, weekStarts[0]!),
        lte(agencyOpsMemberCapacity.weekStart, weekStarts[weekStarts.length - 1]!),
      ),
    );

  const lastWeekEnd = new Date(weekStarts[weekStarts.length - 1]!);
  lastWeekEnd.setUTCDate(lastWeekEnd.getUTCDate() + 7);

  const loggedRows = await db
    .select({
      userId: agencyOpsTimeEntry.userId,
      weekStart:
        sql<Date>`date_trunc('week', ${agencyOpsTimeEntry.startedAt} AT TIME ZONE 'UTC')`.as(
          "week_start",
        ),
      loggedSeconds: sum(agencyOpsTimeEntry.durationSeconds).as("logged_seconds"),
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        isNull(agencyOpsTimeEntry.deletedAt),
        inArray(agencyOpsTimeEntry.userId, userIds),
        gte(agencyOpsTimeEntry.startedAt, weekStarts[0]!),
        lt(agencyOpsTimeEntry.startedAt, lastWeekEnd),
      ),
    )
    .groupBy(
      agencyOpsTimeEntry.userId,
      sql`date_trunc('week', ${agencyOpsTimeEntry.startedAt} AT TIME ZONE 'UTC')`,
    );

  const capacityKey = (userId: string, weekIso: string) => `${userId}:${weekIso}`;
  const capacityMap = new Map<string, number>();
  for (const row of capacityRows) {
    capacityMap.set(capacityKey(row.userId, row.weekStart.toISOString()), row.capacitySeconds);
  }

  const loggedMap = new Map<string, number>();
  for (const row of loggedRows) {
    const weekIso = new Date(row.weekStart).toISOString();
    loggedMap.set(capacityKey(row.userId, weekIso), Number(row.loggedSeconds ?? 0));
  }

  const weeks: AgencyCapacityWeek[] = weekStartStrings.map((weekIso) => ({
    weekStart: weekIso,
    members: members.map((m) => ({
      userId: m.userId,
      userName: m.userName ?? "Unknown",
      capacitySeconds: capacityMap.get(capacityKey(m.userId, weekIso)) ?? 0,
      bookedSeconds: 0,
      loggedSeconds: loggedMap.get(capacityKey(m.userId, weekIso)) ?? 0,
    })),
  }));

  return { weeks };
}

export async function setMemberCapacity(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
    weekStart: string;
    capacitySeconds: number;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const weekStartDate = parseIsoDateTime(input.weekStart, "weekStart");

  if (weekStartDate.getUTCDay() !== 1) {
    throw new ORPCError("BAD_REQUEST", { message: "weekStart must be a Monday (UTC)." });
  }

  // Require exact midnight so keys join correctly with listing functions.
  if (
    weekStartDate.getUTCHours() !== 0 ||
    weekStartDate.getUTCMinutes() !== 0 ||
    weekStartDate.getUTCSeconds() !== 0 ||
    weekStartDate.getUTCMilliseconds() !== 0
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "weekStart must be at exactly midnight UTC (e.g. 2025-05-12T00:00:00.000Z).",
    });
  }

  const now = new Date();
  const [upserted] = await db
    .insert(agencyOpsMemberCapacity)
    .values({
      id: createWorkspaceId("agency-cap"),
      teamId: input.teamId,
      userId: input.userId,
      weekStart: weekStartDate,
      capacitySeconds: input.capacitySeconds,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        agencyOpsMemberCapacity.teamId,
        agencyOpsMemberCapacity.userId,
        agencyOpsMemberCapacity.weekStart,
      ],
      set: { capacitySeconds: input.capacitySeconds, updatedAt: now },
    })
    .returning();

  if (!upserted) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return {
    userId: upserted.userId,
    weekStart: upserted.weekStart.toISOString(),
    capacitySeconds: upserted.capacitySeconds,
  };
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

type AgencyInvoiceRecord = {
  id: string;
  clientId: string;
  clientName: string;
  number: string;
  status: "draft" | "sent" | "paid";
  amountCents: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  issuedAt: string | null;
  paidAt: string | null;
};

async function getNextInvoiceNumber(
  teamId: string,
  tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db,
): Promise<string> {
  const [last] = await tx
    .select({ number: agencyOpsInvoice.number })
    .from(agencyOpsInvoice)
    .where(eq(agencyOpsInvoice.teamId, teamId))
    .orderBy(desc(agencyOpsInvoice.createdAt))
    .limit(1)
    .for("update");

  if (!last) return "INV-0001";
  const match = last.number.match(/INV-(\d+)$/);
  if (!match) return "INV-0001";
  const next = parseInt(match[1]!, 10) + 1;
  return `INV-${String(next).padStart(4, "0")}`;
}

function mapInvoiceRow(
  row: typeof agencyOpsInvoice.$inferSelect,
  clientName: string,
): AgencyInvoiceRecord {
  return {
    id: row.id,
    clientId: row.clientId,
    clientName,
    number: row.number,
    status: row.status,
    amountCents: row.amountCents,
    currency: row.currency,
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    issuedAt: row.issuedAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
  };
}

export async function listInvoices(
  actorUserId: string,
  input: { teamId: string; status?: "draft" | "sent" | "paid" },
): Promise<{ items: AgencyInvoiceRecord[] }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const filters = [eq(agencyOpsInvoice.teamId, input.teamId)];
  if (input.status) {
    filters.push(eq(agencyOpsInvoice.status, input.status));
  }

  const rows = await db
    .select({ invoice: agencyOpsInvoice, clientName: agencyOpsClient.name })
    .from(agencyOpsInvoice)
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsInvoice.clientId))
    .where(and(...filters))
    .orderBy(desc(agencyOpsInvoice.createdAt));

  return { items: rows.map((r) => mapInvoiceRow(r.invoice, r.clientName)) };
}

export async function getInvoiceSummary(actorUserId: string, input: { teamId: string }) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const rows = await db
    .select({
      status: agencyOpsInvoice.status,
      currency: agencyOpsInvoice.currency,
      amountCents: sum(agencyOpsInvoice.amountCents).as("total"),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(agencyOpsInvoice)
    .where(eq(agencyOpsInvoice.teamId, input.teamId))
    .groupBy(agencyOpsInvoice.status, agencyOpsInvoice.currency);

  let draftCount = 0;
  let sentCount = 0;
  let paidCount = 0;
  // Outstanding amounts keyed by currency (sent invoices only).
  const outstandingByCurrency: Record<string, number> = {};

  for (const row of rows) {
    const count = Number(row.count ?? 0);
    const amount = Number(row.amountCents ?? 0);
    if (row.status === "draft") draftCount += count;
    else if (row.status === "sent") {
      sentCount += count;
      outstandingByCurrency[row.currency] = (outstandingByCurrency[row.currency] ?? 0) + amount;
    } else if (row.status === "paid") paidCount += count;
  }

  // For backward-compat convenience: also expose the USD outstanding total
  // (or the single currency if the team uses only one).
  const currencies = Object.keys(outstandingByCurrency);
  const outstandingCents =
    currencies.length === 1
      ? (outstandingByCurrency[currencies[0]!] ?? 0)
      : (outstandingByCurrency["USD"] ?? 0);
  const currency = currencies.length === 1 ? currencies[0]! : "USD";

  return { draftCount, sentCount, paidCount, outstandingCents, currency, outstandingByCurrency };
}

export async function createInvoice(
  actorUserId: string,
  input: {
    teamId: string;
    clientId: string;
    periodStart: string;
    periodEnd: string;
    currency?: string;
  },
): Promise<AgencyInvoiceRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [clientRow] = await db
    .select({ id: agencyOpsClient.id, name: agencyOpsClient.name })
    .from(agencyOpsClient)
    .where(and(eq(agencyOpsClient.id, input.clientId), eq(agencyOpsClient.teamId, input.teamId)))
    .limit(1);

  if (!clientRow) {
    throw new ORPCError("NOT_FOUND", { message: "Client was not found." });
  }

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");

  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const entries = await db
    .select({
      userId: agencyOpsTimeEntry.userId,
      projectId: agencyOpsTimeEntry.projectId,
      projectName: agencyOpsProject.name,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        eq(agencyOpsProject.clientId, input.clientId),
        isNull(agencyOpsTimeEntry.deletedAt),
        gte(agencyOpsTimeEntry.startedAt, periodStart),
        lte(agencyOpsTimeEntry.startedAt, periodEnd),
      ),
    );

  // Fetch per-user billable rates so each user's work is priced correctly.
  const memberRateRows = await db
    .select({
      userId: agencyOpsMemberRate.userId,
      billableRateCents: agencyOpsMemberRate.billableRateCents,
    })
    .from(agencyOpsMemberRate)
    .where(eq(agencyOpsMemberRate.teamId, input.teamId));

  const rateByUserId = new Map(memberRateRows.map((r) => [r.userId, r.billableRateCents]));

  // Check that every user who logged time has a rate set.
  const userIdsWithEntries = [...new Set(entries.map((e) => e.userId))];
  const usersWithoutRate = userIdsWithEntries.filter(
    (uid) => (rateByUserId.get(uid) ?? null) === null,
  );
  if (usersWithoutRate.length > 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: `The following team members have no billable rate set: ${usersWithoutRate.join(", ")}. Set rates before creating an invoice.`,
    });
  }

  type ProjectBucket = { projectName: string; seconds: number; rateCents: number };
  const byProject = new Map<string, ProjectBucket>();
  for (const entry of entries) {
    const rateCents = rateByUserId.get(entry.userId) ?? 0;
    const existing = byProject.get(entry.projectId) ?? {
      projectName: entry.projectName,
      seconds: 0,
      rateCents,
    };
    existing.seconds += entry.durationSeconds;
    byProject.set(entry.projectId, existing);
  }

  const now = new Date();

  const { invoice, totalCents } = await db.transaction(async (tx) => {
    const invoiceNumber = await getNextInvoiceNumber(input.teamId, tx);

    const [inv] = await tx
      .insert(agencyOpsInvoice)
      .values({
        id: createWorkspaceId("agency-inv"),
        teamId: input.teamId,
        clientId: input.clientId,
        number: invoiceNumber,
        status: "draft",
        amountCents: 0,
        currency: input.currency ?? "USD",
        periodStart,
        periodEnd,
        createdByUserId: actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!inv) throw new ORPCError("INTERNAL_SERVER_ERROR");

    let total = 0;

    if (byProject.size > 0) {
      const lineItems = [...byProject.entries()].map(
        ([projectId, { projectName, seconds, rateCents }]) => {
          const amountCents = Math.round((seconds / 3600) * rateCents);
          total += amountCents;
          return {
            id: createWorkspaceId("agency-li"),
            invoiceId: inv.id,
            description: projectName,
            projectId,
            durationSeconds: seconds,
            rateCents,
            amountCents,
            fromTimeEntries: true,
            createdAt: now,
          };
        },
      );
      await tx.insert(agencyOpsInvoiceLineItem).values(lineItems);
    } else {
      await tx.insert(agencyOpsInvoiceLineItem).values({
        id: createWorkspaceId("agency-li"),
        invoiceId: inv.id,
        description: "Services",
        projectId: null,
        durationSeconds: 0,
        rateCents: 0,
        amountCents: 0,
        fromTimeEntries: false,
        createdAt: now,
      });
    }

    await tx
      .update(agencyOpsInvoice)
      .set({ amountCents: total, updatedAt: now })
      .where(eq(agencyOpsInvoice.id, inv.id));

    return { invoice: inv, totalCents: total };
  });

  return mapInvoiceRow({ ...invoice, amountCents: totalCents }, clientRow.name);
}

export async function updateInvoiceStatus(
  actorUserId: string,
  input: { teamId: string; invoiceId: string; status: "sent" | "paid" },
): Promise<AgencyInvoiceRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [existing] = await db
    .select({ invoice: agencyOpsInvoice, clientName: agencyOpsClient.name })
    .from(agencyOpsInvoice)
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsInvoice.clientId))
    .where(and(eq(agencyOpsInvoice.id, input.invoiceId), eq(agencyOpsInvoice.teamId, input.teamId)))
    .limit(1);

  if (!existing) {
    throw new ORPCError("NOT_FOUND", { message: "Invoice was not found." });
  }

  const validTransitions: Record<string, string[]> = {
    draft: ["sent"],
    sent: ["paid"],
    paid: [],
  };

  if (!validTransitions[existing.invoice.status]?.includes(input.status)) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Cannot transition from ${existing.invoice.status} to ${input.status}.`,
    });
  }

  const now = new Date();
  const patch: Partial<typeof agencyOpsInvoice.$inferInsert> = {
    status: input.status,
    updatedAt: now,
  };
  if (input.status === "sent") patch.issuedAt = now;
  if (input.status === "paid") patch.paidAt = now;

  const [updated] = await db
    .update(agencyOpsInvoice)
    .set(patch)
    .where(eq(agencyOpsInvoice.id, input.invoiceId))
    .returning();

  if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return mapInvoiceRow(updated, existing.clientName);
}

export async function createManualAgencyTimeEntry(
  actorUserId: string,
  input: {
    teamId: string;
    projectId?: string;
    taskId?: string;
    startAt: string;
    endAt: string;
    description?: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  let projectId = input.projectId;
  if (input.taskId) {
    const taskProjectId = await resolveTaskProjectId(input.teamId, input.taskId);
    if (projectId && projectId !== taskProjectId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "taskId does not belong to the provided projectId.",
      });
    }
    projectId = taskProjectId;
  } else if (!projectId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "projectId or taskId is required.",
    });
  }

  await getProjectByIdForTeam(input.teamId, projectId);

  const startAt = parseIsoDateTime(input.startAt, "startAt");
  const endAt = parseIsoDateTime(input.endAt, "endAt");
  validateDateRange(startAt, endAt);

  const now = new Date();
  const durationSeconds = getDurationSeconds(startAt, endAt);

  const [created] = await db
    .insert(agencyOpsTimeEntry)
    .values({
      id: createWorkspaceId("agency-time"),
      teamId: input.teamId,
      projectId,
      taskId: input.taskId ?? null,
      userId: actorUserId,
      source: "manual",
      description: input.description?.trim() ?? "",
      startedAt: startAt,
      endedAt: endAt,
      durationSeconds,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: agencyOpsTimeEntry.id });

  if (!created) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  const [row] = await db
    .select({
      id: agencyOpsTimeEntry.id,
      teamId: agencyOpsTimeEntry.teamId,
      userId: agencyOpsTimeEntry.userId,
      userName: user.name,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
      taskTitle: agencyOpsProjectTask.title,
      projectName: agencyOpsProject.name,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      source: agencyOpsTimeEntry.source,
      description: agencyOpsTimeEntry.description,
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      createdAt: agencyOpsTimeEntry.createdAt,
      updatedAt: agencyOpsTimeEntry.updatedAt,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .where(eq(agencyOpsTimeEntry.id, created.id))
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND");
  }

  return {
    id: row.id,
    teamId: row.teamId,
    userId: row.userId,
    userName: row.userName ?? "Unknown",
    projectId: row.projectId,
    taskId: row.taskId ?? null,
    taskTitle: row.taskTitle ?? null,
    projectName: row.projectName,
    clientId: row.clientId,
    clientName: row.clientName,
    source: row.source,
    description: row.description,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt.toISOString(),
    durationSeconds: row.durationSeconds,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies AgencyTimeEntryRecord;
}

export async function updateMyAgencyTimeEntry(
  actorUserId: string,
  input: {
    teamId: string;
    entryId: string;
    projectId?: string;
    taskId?: string | null;
    startAt?: string;
    endAt?: string;
    description?: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const [current] = await db
    .select({
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        eq(agencyOpsTimeEntry.id, input.entryId),
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        eq(agencyOpsTimeEntry.userId, actorUserId),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    )
    .limit(1);

  if (!current) {
    throw new ORPCError("NOT_FOUND");
  }

  if (input.projectId) {
    await getProjectByIdForTeam(input.teamId, input.projectId);
  }

  let resolvedProjectId = input.projectId;
  let taskIdUpdate: { taskId: string | null } | undefined;
  if (input.taskId !== undefined) {
    if (input.taskId === null) {
      taskIdUpdate = { taskId: null };
    } else {
      const taskProjectId = await resolveTaskProjectId(input.teamId, input.taskId);
      if (resolvedProjectId && resolvedProjectId !== taskProjectId) {
        throw new ORPCError("BAD_REQUEST", {
          message: "taskId does not belong to the provided projectId.",
        });
      }
      resolvedProjectId = taskProjectId;
      taskIdUpdate = { taskId: input.taskId };
    }
  } else if (input.projectId && input.projectId !== current.projectId && current.taskId) {
    taskIdUpdate = { taskId: null };
  }

  const nextStartedAt = input.startAt
    ? parseIsoDateTime(input.startAt, "startAt")
    : current.startedAt;
  const nextEndedAt = input.endAt ? parseIsoDateTime(input.endAt, "endAt") : current.endedAt;
  validateDateRange(nextStartedAt, nextEndedAt);

  const now = new Date();
  const durationSeconds = getDurationSeconds(nextStartedAt, nextEndedAt);

  const [updated] = await db
    .update(agencyOpsTimeEntry)
    .set({
      ...(resolvedProjectId ? { projectId: resolvedProjectId } : {}),
      ...(taskIdUpdate ? { taskId: taskIdUpdate.taskId } : {}),
      startedAt: nextStartedAt,
      endedAt: nextEndedAt,
      durationSeconds,
      description: input.description?.trim(),
      updatedAt: now,
    })
    .where(
      and(
        eq(agencyOpsTimeEntry.id, input.entryId),
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        eq(agencyOpsTimeEntry.userId, actorUserId),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    )
    .returning({ id: agencyOpsTimeEntry.id });

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }

  const [row] = await db
    .select({
      id: agencyOpsTimeEntry.id,
      teamId: agencyOpsTimeEntry.teamId,
      userId: agencyOpsTimeEntry.userId,
      userName: user.name,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
      taskTitle: agencyOpsProjectTask.title,
      projectName: agencyOpsProject.name,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      source: agencyOpsTimeEntry.source,
      description: agencyOpsTimeEntry.description,
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      createdAt: agencyOpsTimeEntry.createdAt,
      updatedAt: agencyOpsTimeEntry.updatedAt,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .where(eq(agencyOpsTimeEntry.id, updated.id))
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND");
  }

  return {
    id: row.id,
    teamId: row.teamId,
    userId: row.userId,
    userName: row.userName ?? "Unknown",
    projectId: row.projectId,
    taskId: row.taskId ?? null,
    taskTitle: row.taskTitle ?? null,
    projectName: row.projectName,
    clientId: row.clientId,
    clientName: row.clientName,
    source: row.source,
    description: row.description,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt.toISOString(),
    durationSeconds: row.durationSeconds,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies AgencyTimeEntryRecord;
}

export async function deleteMyAgencyTimeEntry(
  actorUserId: string,
  input: {
    teamId: string;
    entryId: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const now = new Date();
  const [deleted] = await db
    .update(agencyOpsTimeEntry)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(agencyOpsTimeEntry.id, input.entryId),
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        eq(agencyOpsTimeEntry.userId, actorUserId),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    )
    .returning({ id: agencyOpsTimeEntry.id });

  return {
    entryId: deleted?.id ?? input.entryId,
    deleted: Boolean(deleted),
  };
}

export async function getAgencyReportsSummary(
  actorUserId: string,
  input: {
    teamId: string;
    from: string;
    to: string;
    clientId?: string;
    projectId?: string;
    memberUserId?: string;
  },
) {
  const { rows } = await getReportRows(actorUserId, input);

  const distributionByClient = new Map<
    string,
    { clientId: string; clientName: string; seconds: number }
  >();
  const distributionByProject = new Map<
    string,
    {
      projectId: string;
      projectName: string;
      clientId: string;
      clientName: string;
      seconds: number;
    }
  >();
  const teamActivity = new Map<
    string,
    { userId: string; userName: string; userEmail: string; seconds: number }
  >();

  let totalSeconds = 0;

  for (const row of rows) {
    totalSeconds += row.durationSeconds;

    const clientEntry = distributionByClient.get(row.clientId) ?? {
      clientId: row.clientId,
      clientName: row.clientName,
      seconds: 0,
    };
    clientEntry.seconds += row.durationSeconds;
    distributionByClient.set(row.clientId, clientEntry);

    const projectEntry = distributionByProject.get(row.projectId) ?? {
      projectId: row.projectId,
      projectName: row.projectName,
      clientId: row.clientId,
      clientName: row.clientName,
      seconds: 0,
    };
    projectEntry.seconds += row.durationSeconds;
    distributionByProject.set(row.projectId, projectEntry);

    const memberEntry = teamActivity.get(row.memberEmail) ?? {
      userId: row.memberEmail,
      userName: row.memberName,
      userEmail: row.memberEmail,
      seconds: 0,
    };
    memberEntry.seconds += row.durationSeconds;
    teamActivity.set(row.memberEmail, memberEntry);
  }

  const summary: AgencyReportSummary = {
    totalHours: Number((totalSeconds / 3_600).toFixed(2)),
    totalEntries: rows.length,
    timeDistributionByClient: [...distributionByClient.values()]
      .map((entry) => ({
        clientId: entry.clientId,
        clientName: entry.clientName,
        hours: Number((entry.seconds / 3_600).toFixed(2)),
      }))
      .sort((left, right) => right.hours - left.hours),
    timeDistributionByProject: [...distributionByProject.values()]
      .map((entry) => ({
        projectId: entry.projectId,
        projectName: entry.projectName,
        clientId: entry.clientId,
        clientName: entry.clientName,
        hours: Number((entry.seconds / 3_600).toFixed(2)),
      }))
      .sort((left, right) => right.hours - left.hours),
    teamActivity: [...teamActivity.values()]
      .map((entry) => ({
        userId: entry.userId,
        userName: entry.userName,
        userEmail: entry.userEmail,
        hours: Number((entry.seconds / 3_600).toFixed(2)),
      }))
      .sort((left, right) => right.hours - left.hours),
  };

  return {
    summary,
  };
}

export async function getAgencyDashboardSummary(
  actorUserId: string,
  input: {
    teamId: string;
    from: string;
    to: string;
    clientId?: string;
    projectId?: string;
    memberUserId?: string;
  },
) {
  const { rows } = await getReportRows(actorUserId, input);

  const members = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, input.teamId))
    .orderBy(asc(user.name));

  const activeTimers = await db
    .select({
      userId: agencyOpsActiveTimer.userId,
      projectName: agencyOpsProject.name,
      clientName: agencyOpsClient.name,
      description: agencyOpsActiveTimer.description,
      startedAt: agencyOpsActiveTimer.startedAt,
    })
    .from(agencyOpsActiveTimer)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsActiveTimer.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(eq(agencyOpsActiveTimer.teamId, input.teamId));

  const activeTimerByUser = new Map(activeTimers.map((timer) => [timer.userId, timer]));
  const clientSeconds = new Map<
    string,
    { clientId: string; clientName: string; seconds: number }
  >();
  const projectSeconds = new Map<
    string,
    {
      projectId: string;
      projectName: string;
      clientId: string;
      clientName: string;
      seconds: number;
    }
  >();
  const memberSeconds = new Map<string, number>();
  const memberProjectSeconds = new Map<
    string,
    Map<string, { projectId: string; projectName: string; clientName: string; seconds: number }>
  >();
  const latestEntryByMember = new Map<
    string,
    { projectName: string; clientName: string; description: string; startedAt: string }
  >();
  const dailyBuckets = new Map<
    string,
    Map<string, { projectId: string; projectName: string; clientName: string; seconds: number }>
  >();

  let totalSeconds = 0;

  for (const row of rows) {
    totalSeconds += row.durationSeconds;

    const clientEntry = clientSeconds.get(row.clientId) ?? {
      clientId: row.clientId,
      clientName: row.clientName,
      seconds: 0,
    };
    clientEntry.seconds += row.durationSeconds;
    clientSeconds.set(row.clientId, clientEntry);

    const projectEntry = projectSeconds.get(row.projectId) ?? {
      projectId: row.projectId,
      projectName: row.projectName,
      clientId: row.clientId,
      clientName: row.clientName,
      seconds: 0,
    };
    projectEntry.seconds += row.durationSeconds;
    projectSeconds.set(row.projectId, projectEntry);

    memberSeconds.set(
      row.memberEmail,
      (memberSeconds.get(row.memberEmail) ?? 0) + row.durationSeconds,
    );

    const memberProjects = memberProjectSeconds.get(row.memberEmail) ?? new Map();
    const memberProjectEntry = memberProjects.get(row.projectId) ?? {
      projectId: row.projectId,
      projectName: row.projectName,
      clientName: row.clientName,
      seconds: 0,
    };
    memberProjectEntry.seconds += row.durationSeconds;
    memberProjects.set(row.projectId, memberProjectEntry);
    memberProjectSeconds.set(row.memberEmail, memberProjects);

    if (!latestEntryByMember.has(row.memberEmail)) {
      latestEntryByMember.set(row.memberEmail, {
        projectName: row.projectName,
        clientName: row.clientName,
        description: row.description,
        startedAt: row.startedAt.toISOString(),
      });
    }

    const dateKey = formatUtcDateKey(row.startedAt);
    const dayProjects = dailyBuckets.get(dateKey) ?? new Map();
    const dayProjectEntry = dayProjects.get(row.projectId) ?? {
      projectId: row.projectId,
      projectName: row.projectName,
      clientName: row.clientName,
      seconds: 0,
    };
    dayProjectEntry.seconds += row.durationSeconds;
    dayProjects.set(row.projectId, dayProjectEntry);
    dailyBuckets.set(dateKey, dayProjects);
  }

  const topClient =
    [...clientSeconds.values()].sort((left, right) => right.seconds - left.seconds)[0] ?? null;
  const topProject =
    [...projectSeconds.values()].sort((left, right) => right.seconds - left.seconds)[0] ?? null;
  const fromDate = parseIsoDateTime(input.from, "from");
  const toDate = parseIsoDateTime(input.to, "to");
  const filledDailyBuckets = [];
  for (
    let cursor = new Date(
      Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()),
    );
    cursor <= toDate && filledDailyBuckets.length < 370;
    cursor = addDaysUtc(cursor, 1)
  ) {
    const date = formatUtcDateKey(cursor);
    const projects = dailyBuckets.get(date) ?? new Map();
    filledDailyBuckets.push({
      date,
      totalSeconds: [...projects.values()].reduce(
        (sumSeconds, project) => sumSeconds + project.seconds,
        0,
      ),
      segments: [...projects.values()].sort((left, right) => right.seconds - left.seconds),
    });
  }

  const summary: AgencyDashboardSummary = {
    totalHours: Number((totalSeconds / 3_600).toFixed(2)),
    totalSeconds,
    totalEntries: rows.length,
    activeTimerCount: activeTimers.length,
    topClient,
    topProject,
    timeDistributionByClient: [...clientSeconds.values()]
      .map((entry) => ({
        clientId: entry.clientId,
        clientName: entry.clientName,
        hours: Number((entry.seconds / 3_600).toFixed(2)),
      }))
      .sort((left, right) => right.hours - left.hours),
    timeDistributionByProject: [...projectSeconds.values()]
      .map((entry) => ({
        projectId: entry.projectId,
        projectName: entry.projectName,
        clientId: entry.clientId,
        clientName: entry.clientName,
        hours: Number((entry.seconds / 3_600).toFixed(2)),
      }))
      .sort((left, right) => right.hours - left.hours),
    teamActivity: [...memberSeconds.entries()]
      .map(([userEmail, seconds]) => ({
        userId: userEmail,
        userName: members.find((member) => member.email === userEmail)?.name ?? "Unknown",
        userEmail,
        hours: Number((seconds / 3_600).toFixed(2)),
      }))
      .sort((left, right) => right.hours - left.hours),
    dailyBuckets: filledDailyBuckets,
    teamMembers: members
      .map((member) => {
        const activeTimer = activeTimerByUser.get(member.id);
        return {
          userId: member.id,
          userName: member.name ?? "Unknown",
          userEmail: member.email,
          avatar: formatAvatarUrl(member.image),
          isActive: activeTimerByUser.has(member.id),
          totalSeconds: memberSeconds.get(member.email) ?? 0,
          latestEntry:
            latestEntryByMember.get(member.email) ??
            (activeTimer
              ? {
                  projectName: activeTimer.projectName,
                  clientName: activeTimer.clientName,
                  description: activeTimer.description,
                  startedAt: activeTimer.startedAt.toISOString(),
                }
              : null),
          projectBreakdown: [...(memberProjectSeconds.get(member.email)?.values() ?? [])].sort(
            (left, right) => right.seconds - left.seconds,
          ),
        };
      })
      .sort(
        (left, right) =>
          Number(right.isActive) - Number(left.isActive) || right.totalSeconds - left.totalSeconds,
      ),
  };

  return { summary };
}

export async function getAgencyTimeSummary(
  actorUserId: string,
  input: {
    teamId: string;
    from: string;
    to: string;
    clientId?: string;
    projectId?: string;
    memberUserId?: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const from = parseIsoDateTime(input.from, "from");
  const to = parseIsoDateTime(input.to, "to");

  // Team members
  const members = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, input.teamId))
    .orderBy(asc(user.name));

  // Active timers for the whole team
  const activeTimers = await db
    .select({
      userId: agencyOpsActiveTimer.userId,
      projectName: agencyOpsProject.name,
      description: agencyOpsActiveTimer.description,
    })
    .from(agencyOpsActiveTimer)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsActiveTimer.projectId))
    .where(eq(agencyOpsActiveTimer.teamId, input.teamId));

  const activeTimerByUser = new Map(activeTimers.map((t) => [t.userId, t]));

  // Time entry filters
  const entryFilters = [
    eq(agencyOpsTimeEntry.teamId, input.teamId),
    isNull(agencyOpsTimeEntry.deletedAt),
    gte(agencyOpsTimeEntry.startedAt, from),
    lte(agencyOpsTimeEntry.startedAt, to),
  ];

  if (input.clientId) {
    entryFilters.push(eq(agencyOpsProject.clientId, input.clientId));
  }
  if (input.projectId) {
    entryFilters.push(eq(agencyOpsProject.id, input.projectId));
  }
  if (input.memberUserId) {
    entryFilters.push(eq(agencyOpsTimeEntry.userId, input.memberUserId));
  }

  const entries = await db
    .select({
      userId: agencyOpsTimeEntry.userId,
      projectName: agencyOpsProject.name,
      description: agencyOpsTimeEntry.description,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .where(and(...entryFilters))
    .orderBy(desc(agencyOpsTimeEntry.startedAt));

  const totalSecondsPerMember = new Map<string, number>();
  const latestEntryPerMember = new Map<string, { projectName: string; description: string }>();

  for (const entry of entries) {
    totalSecondsPerMember.set(
      entry.userId,
      (totalSecondsPerMember.get(entry.userId) ?? 0) + Number(entry.durationSeconds),
    );
    if (!latestEntryPerMember.has(entry.userId)) {
      latestEntryPerMember.set(entry.userId, {
        projectName: entry.projectName,
        description: entry.description,
      });
    }
  }

  const totalSeconds = [...totalSecondsPerMember.values()].reduce((a, b) => a + b, 0);

  return {
    summary: {
      totalSeconds,
      activeCount: activeTimers.length,
      teamMembers: members.map((member) => {
        const activeTimer = activeTimerByUser.get(member.id);
        return {
          id: member.id,
          avatar: formatAvatarUrl(member.image),
          name: member.name ?? "Unknown",
          email: member.email,
          isActive: activeTimerByUser.has(member.id),
          totalSeconds: totalSecondsPerMember.get(member.id) ?? 0,
          latestEntry:
            latestEntryPerMember.get(member.id) ??
            (activeTimer
              ? { projectName: activeTimer.projectName, description: activeTimer.description }
              : null),
        };
      }),
    },
  };
}

export async function exportAgencyReportsCsv(
  actorUserId: string,
  input: {
    teamId: string;
    from: string;
    to: string;
    clientId?: string;
    projectId?: string;
    memberUserId?: string;
  },
) {
  const { rows } = await getReportRows(actorUserId, input);

  const records = rows.map((row) => ({
    entryId: row.entryId,
    date: formatUtcDateKey(row.startedAt),
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt.toISOString(),
    durationHours: Number((row.durationSeconds / 3_600).toFixed(2)),
    memberName: row.memberName,
    memberEmail: row.memberEmail,
    clientName: row.clientName,
    projectName: row.projectName,
    source: row.source,
    description: row.description,
  }));

  const header = [
    "entry_id",
    "date",
    "started_at",
    "ended_at",
    "duration_hours",
    "member_name",
    "member_email",
    "client_name",
    "project_name",
    "source",
    "description",
  ];

  const lines = [
    header.join(","),
    ...records.map((record) =>
      [
        record.entryId,
        record.date,
        record.startedAt,
        record.endedAt,
        record.durationHours,
        record.memberName,
        record.memberEmail,
        record.clientName,
        record.projectName,
        record.source,
        record.description,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ];

  return {
    contentType: "text/csv",
    fileName: `agency-report-${input.teamId}-${Date.now()}.csv`,
    csv: `${lines.join("\n")}\n`,
    totalRows: records.length,
  };
}

export async function listAllAgencyTimeEntries(
  actorUserId: string,
  input: {
    teamId: string;
    from: string;
    to: string;
    page?: number;
    pageSize?: number;
    clientId?: string;
    projectId?: string;
    memberUserId?: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "editor");

  const from = parseIsoDateTime(input.from, "from");
  const to = parseIsoDateTime(input.to, "to");

  if (from > to) {
    throw new ORPCError("BAD_REQUEST", {
      message: "from must be before or equal to to.",
    });
  }

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  const filters = [
    eq(agencyOpsTimeEntry.teamId, input.teamId),
    isNull(agencyOpsTimeEntry.deletedAt),
    gte(agencyOpsTimeEntry.startedAt, from),
    lte(agencyOpsTimeEntry.startedAt, to),
  ];

  if (input.clientId) {
    filters.push(eq(agencyOpsProject.clientId, input.clientId));
  }

  if (input.projectId) {
    filters.push(eq(agencyOpsProject.id, input.projectId));
  }

  if (input.memberUserId) {
    filters.push(eq(agencyOpsTimeEntry.userId, input.memberUserId));
  }

  const rows = await db
    .select({
      id: agencyOpsTimeEntry.id,
      teamId: agencyOpsTimeEntry.teamId,
      userId: agencyOpsTimeEntry.userId,
      userName: user.name,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
      taskTitle: agencyOpsProjectTask.title,
      projectName: agencyOpsProject.name,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      source: agencyOpsTimeEntry.source,
      description: agencyOpsTimeEntry.description,
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      createdAt: agencyOpsTimeEntry.createdAt,
      updatedAt: agencyOpsTimeEntry.updatedAt,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .where(and(...filters))
    .orderBy(desc(agencyOpsTimeEntry.startedAt))
    .limit(pageSize)
    .offset(offset);

  const items = rows.map(
    (row) =>
      ({
        id: row.id,
        teamId: row.teamId,
        userId: row.userId,
        userName: row.userName ?? "Unknown",
        projectId: row.projectId,
        taskId: row.taskId ?? null,
        taskTitle: row.taskTitle ?? null,
        projectName: row.projectName,
        clientId: row.clientId,
        clientName: row.clientName,
        source: row.source,
        description: row.description,
        startedAt: row.startedAt.toISOString(),
        endedAt: row.endedAt.toISOString(),
        durationSeconds: row.durationSeconds,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }) satisfies AgencyTimeEntryRecord,
  );

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(and(...filters));

  const parsedTotal = Number(countRow?.count ?? 0);
  const total = Number.isFinite(parsedTotal) && parsedTotal >= 0 ? parsedTotal : 0;

  return {
    items,
    page,
    pageSize,
    total,
  };
}

export async function updateAnyAgencyTimeEntry(
  actorUserId: string,
  input: {
    teamId: string;
    entryId: string;
    startAt?: string;
    endAt?: string;
    description?: string;
    projectId?: string;
    taskId?: string | null;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [current] = await db
    .select({
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        eq(agencyOpsTimeEntry.id, input.entryId),
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    )
    .limit(1);

  if (!current) {
    throw new ORPCError("NOT_FOUND");
  }

  if (input.projectId) {
    await getProjectByIdForTeam(input.teamId, input.projectId);
  }

  let resolvedProjectId = input.projectId;
  let taskIdUpdate: { taskId: string | null } | undefined;
  if (input.taskId !== undefined) {
    if (input.taskId === null) {
      taskIdUpdate = { taskId: null };
    } else {
      const taskProjectId = await resolveTaskProjectId(input.teamId, input.taskId);
      if (resolvedProjectId && resolvedProjectId !== taskProjectId) {
        throw new ORPCError("BAD_REQUEST", {
          message: "taskId does not belong to the provided projectId.",
        });
      }
      resolvedProjectId = taskProjectId;
      taskIdUpdate = { taskId: input.taskId };
    }
  } else if (input.projectId && input.projectId !== current.projectId && current.taskId) {
    taskIdUpdate = { taskId: null };
  }

  const nextStartedAt = input.startAt
    ? parseIsoDateTime(input.startAt, "startAt")
    : current.startedAt;
  const nextEndedAt = input.endAt ? parseIsoDateTime(input.endAt, "endAt") : current.endedAt;
  validateDateRange(nextStartedAt, nextEndedAt);

  const now = new Date();
  const durationSeconds = getDurationSeconds(nextStartedAt, nextEndedAt);

  const [updated] = await db
    .update(agencyOpsTimeEntry)
    .set({
      ...(resolvedProjectId ? { projectId: resolvedProjectId } : {}),
      ...(taskIdUpdate ? { taskId: taskIdUpdate.taskId } : {}),
      startedAt: nextStartedAt,
      endedAt: nextEndedAt,
      durationSeconds,
      description: input.description?.trim(),
      updatedAt: now,
    })
    .where(
      and(
        eq(agencyOpsTimeEntry.id, input.entryId),
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    )
    .returning({ id: agencyOpsTimeEntry.id });

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }

  const [row] = await db
    .select({
      id: agencyOpsTimeEntry.id,
      teamId: agencyOpsTimeEntry.teamId,
      userId: agencyOpsTimeEntry.userId,
      userName: user.name,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
      taskTitle: agencyOpsProjectTask.title,
      projectName: agencyOpsProject.name,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      source: agencyOpsTimeEntry.source,
      description: agencyOpsTimeEntry.description,
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      createdAt: agencyOpsTimeEntry.createdAt,
      updatedAt: agencyOpsTimeEntry.updatedAt,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .where(eq(agencyOpsTimeEntry.id, updated.id))
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND");
  }

  return {
    id: row.id,
    teamId: row.teamId,
    userId: row.userId,
    userName: row.userName ?? "Unknown",
    projectId: row.projectId,
    taskId: row.taskId ?? null,
    taskTitle: row.taskTitle ?? null,
    projectName: row.projectName,
    clientId: row.clientId,
    clientName: row.clientName,
    source: row.source,
    description: row.description,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt.toISOString(),
    durationSeconds: row.durationSeconds,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies AgencyTimeEntryRecord;
}
