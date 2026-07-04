import { env } from "@brainiac/env/server";
import { db } from "@brainiac/db";
import {
  agencyOpsNotification,
  agencyOpsProject,
  agencyOpsProjectTask,
  agencyOpsProjectTaskAssignee,
  agencyOpsPushSubscription,
  agencyOpsClient,
  user,
  workspaceTeamMember,
  type AgencyOpsNotificationPayload,
  type AgencyOpsNotificationType,
  type AgencyOpsTaskMessageSenderType,
  type AgencyOpsTaskMessageType,
} from "@brainiac/db/schema";
import { createWorkspaceId, type WorkspaceTeamRole } from "@brainiac/workspace";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import webpush from "web-push";

const TEAM_ROLE_WEIGHT: Record<WorkspaceTeamRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

function hasRoleAtLeast(role: WorkspaceTeamRole, required: WorkspaceTeamRole) {
  return TEAM_ROLE_WEIGHT[role] >= TEAM_ROLE_WEIGHT[required];
}

async function requireTeamMembership(
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
}

type TaskNotificationMeta = {
  taskTitle: string;
  projectName: string;
  clientName: string;
};

function messageTypeLabel(type: AgencyOpsTaskMessageType): string {
  switch (type) {
    case "text":
      return "a message";
    case "voice":
      return "a voice note";
    case "attachment":
      return "an attachment";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function formatNotificationBody(
  type: AgencyOpsNotificationType,
  payload: AgencyOpsNotificationPayload,
): string {
  if (type === "task_assigned") {
    return `${payload.actorName} assigned you to ${payload.taskTitle}`;
  }

  if (payload.messageType && payload.actorName === "Agent") {
    return "Agent added a message to the thread";
  }

  const label = payload.messageType ? messageTypeLabel(payload.messageType) : "a message";
  return `${payload.actorName} added ${label} to the thread`;
}

export function formatNotificationTitle(payload: AgencyOpsNotificationPayload): string {
  return payload.taskTitle;
}

export function formatNotificationDescription(payload: AgencyOpsNotificationPayload): string {
  return `${payload.clientName} · ${payload.projectName}`;
}

let webPushConfigured = false;

function ensureWebPushConfigured() {
  if (webPushConfigured) return;
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  const subject = env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  webPushConfigured = true;
}

export async function loadTaskNotificationMeta(
  teamId: string,
  taskId: string,
): Promise<TaskNotificationMeta | null> {
  const [row] = await db
    .select({
      taskTitle: agencyOpsProjectTask.title,
      projectName: agencyOpsProject.name,
      clientName: agencyOpsClient.name,
    })
    .from(agencyOpsProjectTask)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsProjectTask.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(and(eq(agencyOpsProjectTask.id, taskId), eq(agencyOpsProjectTask.teamId, teamId)))
    .limit(1);

  if (!row) return null;
  return row;
}

async function loadActorName(actorUserId: string): Promise<string> {
  const [row] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, actorUserId))
    .limit(1);
  return row?.name?.trim() || "Member";
}

export async function resolveTaskWatcherUserIds(
  teamId: string,
  taskId: string,
  excludeUserId?: string,
): Promise<string[]> {
  const [task] = await db
    .select({ assignedToTeam: agencyOpsProjectTask.assignedToTeam })
    .from(agencyOpsProjectTask)
    .where(and(eq(agencyOpsProjectTask.id, taskId), eq(agencyOpsProjectTask.teamId, teamId)))
    .limit(1);

  if (!task) return [];

  let userIds: string[] = [];

  if (task.assignedToTeam) {
    const members = await db
      .select({ userId: workspaceTeamMember.userId })
      .from(workspaceTeamMember)
      .where(eq(workspaceTeamMember.teamId, teamId));
    userIds = members.map((member) => member.userId);
  } else {
    const assignees = await db
      .select({ userId: agencyOpsProjectTaskAssignee.userId })
      .from(agencyOpsProjectTaskAssignee)
      .where(eq(agencyOpsProjectTaskAssignee.taskId, taskId));
    userIds = assignees.map((assignee) => assignee.userId);
  }

  if (excludeUserId) {
    userIds = userIds.filter((userId) => userId !== excludeUserId);
  }

  return userIds;
}

async function listTeamMemberUserIds(teamId: string, excludeUserId?: string): Promise<string[]> {
  const members = await db
    .select({ userId: workspaceTeamMember.userId })
    .from(workspaceTeamMember)
    .where(eq(workspaceTeamMember.teamId, teamId));
  const userIds = members.map((member) => member.userId);
  return excludeUserId ? userIds.filter((userId) => userId !== excludeUserId) : userIds;
}

type InsertedNotification = {
  id: string;
  teamId: string;
  recipientUserId: string;
  type: AgencyOpsNotificationType;
  taskId: string;
  payload: AgencyOpsNotificationPayload;
  createdAt: Date;
};

async function insertNotifications(
  rows: Array<{
    teamId: string;
    recipientUserId: string;
    type: AgencyOpsNotificationType;
    actorUserId: string | null;
    taskId: string;
    messageId?: string;
    payload: AgencyOpsNotificationPayload;
  }>,
): Promise<InsertedNotification[]> {
  if (rows.length === 0) return [];

  const now = new Date();
  const values = rows.map((row) => ({
    id: createWorkspaceId("agency-notification"),
    teamId: row.teamId,
    recipientUserId: row.recipientUserId,
    type: row.type,
    actorUserId: row.actorUserId,
    taskId: row.taskId,
    messageId: row.messageId ?? null,
    payload: row.payload,
    createdAt: now,
  }));

  const inserted = await db.insert(agencyOpsNotification).values(values).returning({
    id: agencyOpsNotification.id,
    teamId: agencyOpsNotification.teamId,
    recipientUserId: agencyOpsNotification.recipientUserId,
    type: agencyOpsNotification.type,
    taskId: agencyOpsNotification.taskId,
    payload: agencyOpsNotification.payload,
    createdAt: agencyOpsNotification.createdAt,
  });

  return inserted;
}

async function dispatchWebPushForNotifications(notifications: InsertedNotification[]) {
  if (notifications.length === 0) return;
  ensureWebPushConfigured();
  if (!webPushConfigured) return;

  for (const notification of notifications) {
    const subscriptions = await db
      .select({
        endpoint: agencyOpsPushSubscription.endpoint,
        p256dh: agencyOpsPushSubscription.p256dh,
        auth: agencyOpsPushSubscription.auth,
      })
      .from(agencyOpsPushSubscription)
      .where(eq(agencyOpsPushSubscription.userId, notification.recipientUserId));

    if (subscriptions.length === 0) continue;

    const title = formatNotificationTitle(notification.payload);
    const body = formatNotificationBody(notification.type, notification.payload);
    const description = formatNotificationDescription(notification.payload);

    const payload = JSON.stringify({
      title,
      body,
      description,
      teamId: notification.teamId,
      taskId: notification.taskId,
      notificationId: notification.id,
      url: `/agency?section=work&task=${notification.taskId}`,
    });

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
        );
      } catch (error) {
        console.error("[agency-push] failed to send notification", error);
      }
    }
  }
}

export async function emitTaskAssignedNotifications(input: {
  teamId: string;
  taskId: string;
  actorUserId: string;
  recipientUserIds: string[];
}) {
  const recipientUserIds = [...new Set(input.recipientUserIds)].filter(
    (userId) => userId !== input.actorUserId,
  );
  if (recipientUserIds.length === 0) return;

  const meta = await loadTaskNotificationMeta(input.teamId, input.taskId);
  if (!meta) return;

  const actorName = await loadActorName(input.actorUserId);
  const payload: AgencyOpsNotificationPayload = {
    ...meta,
    actorName,
  };

  const inserted = await insertNotifications(
    recipientUserIds.map((recipientUserId) => ({
      teamId: input.teamId,
      recipientUserId,
      type: "task_assigned" as const,
      actorUserId: input.actorUserId,
      taskId: input.taskId,
      payload,
    })),
  );

  void dispatchWebPushForNotifications(inserted);
}

export async function emitTeamAssignedNotifications(input: {
  teamId: string;
  taskId: string;
  actorUserId: string;
}) {
  const recipientUserIds = await listTeamMemberUserIds(input.teamId, input.actorUserId);
  await emitTaskAssignedNotifications({
    teamId: input.teamId,
    taskId: input.taskId,
    actorUserId: input.actorUserId,
    recipientUserIds,
  });
}

export async function emitThreadMessageNotifications(input: {
  teamId: string;
  taskId: string;
  messageId: string;
  actorUserId: string;
  senderType: AgencyOpsTaskMessageSenderType;
  messageType: AgencyOpsTaskMessageType;
}) {
  const excludeUserId = input.senderType === "user" ? input.actorUserId : undefined;
  const recipientUserIds = await resolveTaskWatcherUserIds(
    input.teamId,
    input.taskId,
    excludeUserId,
  );
  if (recipientUserIds.length === 0) return;

  const meta = await loadTaskNotificationMeta(input.teamId, input.taskId);
  if (!meta) return;

  const actorName =
    input.senderType === "agent" ? "Agent" : await loadActorName(input.actorUserId);
  const payload: AgencyOpsNotificationPayload = {
    ...meta,
    actorName,
    messageType: input.messageType,
  };

  const inserted = await insertNotifications(
    recipientUserIds.map((recipientUserId) => ({
      teamId: input.teamId,
      recipientUserId,
      type: "thread_message" as const,
      actorUserId: input.senderType === "agent" ? null : input.actorUserId,
      taskId: input.taskId,
      messageId: input.messageId,
      payload,
    })),
  );

  void dispatchWebPushForNotifications(inserted);
}

function mapNotificationRow(row: {
  id: string;
  teamId: string;
  type: AgencyOpsNotificationType;
  actorUserId: string | null;
  taskId: string;
  messageId: string | null;
  payload: AgencyOpsNotificationPayload;
  readAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    teamId: row.teamId,
    type: row.type,
    actorUserId: row.actorUserId,
    taskId: row.taskId,
    messageId: row.messageId,
    payload: row.payload,
    title: formatNotificationTitle(row.payload),
    body: formatNotificationBody(row.type, row.payload),
    description: formatNotificationDescription(row.payload),
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function parseCursor(cursor: string | undefined): { createdAt: Date; id: string } | null {
  if (!cursor) return null;
  const separatorIndex = cursor.indexOf("|");
  if (separatorIndex === -1) return null;
  const createdAtRaw = cursor.slice(0, separatorIndex);
  const id = cursor.slice(separatorIndex + 1);
  const createdAt = new Date(createdAtRaw);
  if (!id || Number.isNaN(createdAt.getTime())) return null;
  return { createdAt, id };
}

function encodeCursor(createdAt: Date, id: string) {
  return `${createdAt.toISOString()}|${id}`;
}

export async function listAgencyNotifications(
  actorUserId: string,
  input: {
    teamId: string;
    cursor?: string;
    limit?: number;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const limit = Math.min(50, Math.max(1, input.limit ?? 20));
  const parsedCursor = parseCursor(input.cursor);

  const cursorFilter = parsedCursor
    ? or(
        lt(agencyOpsNotification.createdAt, parsedCursor.createdAt),
        and(
          eq(agencyOpsNotification.createdAt, parsedCursor.createdAt),
          lt(agencyOpsNotification.id, parsedCursor.id),
        ),
      )
    : undefined;

  const rows = await db
    .select({
      id: agencyOpsNotification.id,
      teamId: agencyOpsNotification.teamId,
      type: agencyOpsNotification.type,
      actorUserId: agencyOpsNotification.actorUserId,
      taskId: agencyOpsNotification.taskId,
      messageId: agencyOpsNotification.messageId,
      payload: agencyOpsNotification.payload,
      readAt: agencyOpsNotification.readAt,
      createdAt: agencyOpsNotification.createdAt,
    })
    .from(agencyOpsNotification)
    .where(
      and(
        eq(agencyOpsNotification.recipientUserId, actorUserId),
        eq(agencyOpsNotification.teamId, input.teamId),
        ...(cursorFilter ? [cursorFilter] : []),
      ),
    )
    .orderBy(desc(agencyOpsNotification.createdAt), desc(agencyOpsNotification.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = pageRows[pageRows.length - 1];

  const [unreadRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agencyOpsNotification)
    .where(
      and(
        eq(agencyOpsNotification.recipientUserId, actorUserId),
        eq(agencyOpsNotification.teamId, input.teamId),
        isNull(agencyOpsNotification.readAt),
      ),
    );

  return {
    items: pageRows.map(mapNotificationRow),
    nextCursor:
      hasMore && lastRow ? encodeCursor(lastRow.createdAt, lastRow.id) : null,
    unreadCount: unreadRow?.count ?? 0,
  };
}

export async function markAgencyNotificationsRead(
  actorUserId: string,
  input: { ids: string[] },
) {
  if (input.ids.length === 0) {
    return { updated: 0 };
  }

  const now = new Date();
  const updated = await db
    .update(agencyOpsNotification)
    .set({ readAt: now })
    .where(
      and(
        eq(agencyOpsNotification.recipientUserId, actorUserId),
        inArray(agencyOpsNotification.id, input.ids),
        isNull(agencyOpsNotification.readAt),
      ),
    )
    .returning({ id: agencyOpsNotification.id });

  return { updated: updated.length };
}

export async function markAllAgencyNotificationsRead(
  actorUserId: string,
  input: { teamId: string },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const now = new Date();
  const updated = await db
    .update(agencyOpsNotification)
    .set({ readAt: now })
    .where(
      and(
        eq(agencyOpsNotification.recipientUserId, actorUserId),
        eq(agencyOpsNotification.teamId, input.teamId),
        isNull(agencyOpsNotification.readAt),
      ),
    )
    .returning({ id: agencyOpsNotification.id });

  return { updated: updated.length };
}

export function getAgencyVapidPublicKey() {
  return { publicKey: env.VAPID_PUBLIC_KEY ?? null };
}

export async function subscribeAgencyPush(
  actorUserId: string,
  input: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Push notifications are not configured on this server.",
    });
  }

  const now = new Date();
  await db
    .insert(agencyOpsPushSubscription)
    .values({
      id: createWorkspaceId("agency-push-sub"),
      userId: actorUserId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: agencyOpsPushSubscription.endpoint,
      set: {
        userId: actorUserId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        updatedAt: now,
      },
    });

  return { subscribed: true };
}

export async function unsubscribeAgencyPush(
  actorUserId: string,
  input: { endpoint: string },
) {
  await db
    .delete(agencyOpsPushSubscription)
    .where(
      and(
        eq(agencyOpsPushSubscription.userId, actorUserId),
        eq(agencyOpsPushSubscription.endpoint, input.endpoint),
      ),
    );

  return { unsubscribed: true };
}

/** ponytail: poll-based inbox; upgrade path is SSE or websocket fan-out from emit sites. */
export async function listAgencyNotificationsSince(
  actorUserId: string,
  input: { teamId: string; since?: string },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const sinceDate = input.since ? new Date(input.since) : null;
  const sinceFilter =
    sinceDate && !Number.isNaN(sinceDate.getTime())
      ? gt(agencyOpsNotification.createdAt, sinceDate)
      : undefined;

  const rows = await db
    .select({
      id: agencyOpsNotification.id,
      teamId: agencyOpsNotification.teamId,
      type: agencyOpsNotification.type,
      actorUserId: agencyOpsNotification.actorUserId,
      taskId: agencyOpsNotification.taskId,
      messageId: agencyOpsNotification.messageId,
      payload: agencyOpsNotification.payload,
      readAt: agencyOpsNotification.readAt,
      createdAt: agencyOpsNotification.createdAt,
    })
    .from(agencyOpsNotification)
    .where(
      and(
        eq(agencyOpsNotification.recipientUserId, actorUserId),
        eq(agencyOpsNotification.teamId, input.teamId),
        ...(sinceFilter ? [sinceFilter] : []),
      ),
    )
    .orderBy(desc(agencyOpsNotification.createdAt), desc(agencyOpsNotification.id))
    .limit(50);

  const [unreadRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agencyOpsNotification)
    .where(
      and(
        eq(agencyOpsNotification.recipientUserId, actorUserId),
        eq(agencyOpsNotification.teamId, input.teamId),
        isNull(agencyOpsNotification.readAt),
      ),
    );

  return {
    items: rows.map(mapNotificationRow),
    unreadCount: unreadRow?.count ?? 0,
  };
}
