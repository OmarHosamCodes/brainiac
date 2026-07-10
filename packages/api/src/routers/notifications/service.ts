import { db } from "@brainiac/db";
import {
  agencyOpsTaskMessage,
  agencyOpsTaskThread,
  notification,
  notificationPreference,
  pushSubscription,
  type NotificationPayload,
  type NotificationType,
  user,
  workspaceTeamMember,
} from "@brainiac/db/schema";
import { createWorkspaceId } from "@brainiac/workspace";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";

import type { NotificationRecord } from "../../schemas/notifications";
import { getUserAvatarPublicUrl } from "../../storage";
import { env } from "@brainiac/env/server";
import { requireTeamMembership } from "../agency-ops/shared/membership";
import { defaultNotificationChannels, excludeActor, messageCoalesceTaskId } from "./fanout-helpers";
import { deliverNotificationPush } from "./delivery";
import { isUserLiveOnTeam, publishNotificationCreated } from "./live-bridge";

const AVATAR_KEY_PREFIX = "user-avatars/";

const NOTIFICATION_TYPES: NotificationType[] = [
  "task.assigned",
  "task.message",
  "journey.milestone",
  "timer.activity",
  "team.digest",
];

function formatAvatarUrl(image: string | null): string | null {
  if (!image || !image.startsWith(AVATAR_KEY_PREFIX)) return image;
  const parts = image.split("/");
  const userId = parts[1];
  if (!userId) return null;
  return getUserAvatarPublicUrl({
    baseUrl: env.BETTER_AUTH_URL,
    userId,
  });
}

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

export type { NotificationRecord } from "../../schemas/notifications";

async function mapNotificationRows(
  rows: Array<{
    id: string;
    teamId: string;
    recipientUserId: string;
    actorUserId: string | null;
    actorName: string | null;
    actorImage: string | null;
    type: NotificationType;
    payload: NotificationPayload;
    readAt: Date | null;
    seenAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>,
): Promise<NotificationRecord[]> {
  return rows.map((row) => ({
    id: row.id,
    teamId: row.teamId,
    recipientUserId: row.recipientUserId,
    actorUserId: row.actorUserId,
    actorName: row.actorName,
    actorAvatar: formatAvatarUrl(row.actorImage),
    type: row.type,
    payload: row.payload,
    readAt: toIso(row.readAt),
    seenAt: toIso(row.seenAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

async function getPreferenceMap(userId: string, teamId: string) {
  const rows = await db
    .select({
      type: notificationPreference.type,
      inApp: notificationPreference.inApp,
      push: notificationPreference.push,
    })
    .from(notificationPreference)
    .where(
      and(eq(notificationPreference.userId, userId), eq(notificationPreference.teamId, teamId)),
    );

  const map = new Map<NotificationType, { inApp: boolean; push: boolean }>();
  for (const type of NOTIFICATION_TYPES) {
    map.set(type, defaultNotificationChannels(type));
  }
  for (const row of rows) {
    map.set(row.type, { inApp: row.inApp, push: row.push });
  }
  return map;
}

export async function listNotifications(
  actorUserId: string,
  input: { teamId: string; cursor?: string; limit?: number },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const limit = input.limit ?? 30;
  const conditions = [
    eq(notification.teamId, input.teamId),
    eq(notification.recipientUserId, actorUserId),
  ];

  if (input.cursor) {
    conditions.push(lt(notification.createdAt, new Date(input.cursor)));
  }

  const rows = await db
    .select({
      id: notification.id,
      teamId: notification.teamId,
      recipientUserId: notification.recipientUserId,
      actorUserId: notification.actorUserId,
      actorName: user.name,
      actorImage: user.image,
      type: notification.type,
      payload: notification.payload,
      readAt: notification.readAt,
      seenAt: notification.seenAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    })
    .from(notification)
    .leftJoin(user, eq(user.id, notification.actorUserId))
    .where(and(...conditions))
    .orderBy(desc(notification.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const items = await mapNotificationRows(pageRows);
  const nextCursor = hasMore ? (items.at(-1)?.createdAt ?? null) : null;

  return { items, nextCursor };
}

export async function getUnreadNotificationCount(actorUserId: string, input: { teamId: string }) {
  const { teamId } = input;
  await requireTeamMembership(actorUserId, teamId, "viewer");

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notification)
    .where(
      and(
        eq(notification.teamId, teamId),
        eq(notification.recipientUserId, actorUserId),
        isNull(notification.seenAt),
      ),
    );

  return { count: row?.count ?? 0 };
}

export async function markNotificationsSeen(actorUserId: string, input: { teamId: string }) {
  const { teamId } = input;
  await requireTeamMembership(actorUserId, teamId, "viewer");

  const now = new Date();
  await db
    .update(notification)
    .set({ seenAt: now, updatedAt: now })
    .where(
      and(
        eq(notification.teamId, teamId),
        eq(notification.recipientUserId, actorUserId),
        isNull(notification.seenAt),
      ),
    );

  return { updated: true };
}

export async function markNotificationRead(
  actorUserId: string,
  input: { teamId: string; notificationId: string },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const now = new Date();
  const [updated] = await db
    .update(notification)
    .set({ readAt: now, seenAt: sql`coalesce(${notification.seenAt}, ${now})`, updatedAt: now })
    .where(
      and(
        eq(notification.id, input.notificationId),
        eq(notification.teamId, input.teamId),
        eq(notification.recipientUserId, actorUserId),
      ),
    )
    .returning({ id: notification.id });

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }

  return { notificationId: updated.id, read: true };
}

export async function markAllNotificationsRead(actorUserId: string, input: { teamId: string }) {
  const { teamId } = input;
  await requireTeamMembership(actorUserId, teamId, "viewer");

  const now = new Date();
  await db
    .update(notification)
    .set({
      readAt: now,
      seenAt: sql`coalesce(${notification.seenAt}, ${now})`,
      updatedAt: now,
    })
    .where(
      and(
        eq(notification.teamId, teamId),
        eq(notification.recipientUserId, actorUserId),
        isNull(notification.readAt),
      ),
    );

  return { updated: true };
}

export async function getNotificationPreferences(actorUserId: string, input: { teamId: string }) {
  const { teamId } = input;
  await requireTeamMembership(actorUserId, teamId, "viewer");
  const map = await getPreferenceMap(actorUserId, teamId);

  return {
    items: NOTIFICATION_TYPES.map((type) => ({
      type,
      inApp: map.get(type)?.inApp ?? true,
      push: map.get(type)?.push ?? true,
    })),
  };
}

export async function setNotificationPreferences(
  actorUserId: string,
  input: {
    teamId: string;
    preferences: Array<{ type: NotificationType; inApp: boolean; push: boolean }>;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const now = new Date();
  for (const pref of input.preferences) {
    await db
      .insert(notificationPreference)
      .values({
        id: createWorkspaceId("notification-pref"),
        userId: actorUserId,
        teamId: input.teamId,
        type: pref.type,
        inApp: pref.inApp,
        push: pref.push,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          notificationPreference.userId,
          notificationPreference.teamId,
          notificationPreference.type,
        ],
        set: {
          inApp: pref.inApp,
          push: pref.push,
          updatedAt: now,
        },
      });
  }

  return getNotificationPreferences(actorUserId, { teamId: input.teamId });
}

export async function subscribePush(
  actorUserId: string,
  input: { endpoint: string; p256dh: string; auth: string },
) {
  const now = new Date();
  const [subscription] = await db
    .insert(pushSubscription)
    .values({
      id: createWorkspaceId("push-sub"),
      userId: actorUserId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: pushSubscription.endpoint,
      set: {
        p256dh: input.p256dh,
        auth: input.auth,
        updatedAt: now,
      },
      setWhere: eq(pushSubscription.userId, actorUserId),
    })
    .returning({ userId: pushSubscription.userId });

  if (!subscription) {
    throw new ORPCError("CONFLICT");
  }

  return { subscribed: true };
}

export async function unsubscribePush(actorUserId: string, input: { endpoint: string }) {
  await db
    .delete(pushSubscription)
    .where(
      and(eq(pushSubscription.userId, actorUserId), eq(pushSubscription.endpoint, input.endpoint)),
    );

  return { unsubscribed: true };
}

export async function listPushSubscriptionsForUser(
  actorUserId: string,
  _input: Record<string, never>,
) {
  return db
    .select({
      id: pushSubscription.id,
      endpoint: pushSubscription.endpoint,
      p256dh: pushSubscription.p256dh,
      auth: pushSubscription.auth,
    })
    .from(pushSubscription)
    .where(eq(pushSubscription.userId, actorUserId));
}

async function shouldDeliver(
  userId: string,
  teamId: string,
  type: NotificationType,
  channel: "inApp" | "push",
) {
  const prefs = await getPreferenceMap(userId, teamId);
  const pref = prefs.get(type) ?? defaultNotificationChannels(type);
  return channel === "inApp" ? pref.inApp : pref.push;
}

async function upsertNotificationForRecipient(input: {
  teamId: string;
  recipientUserId: string;
  actorUserId: string | null;
  type: NotificationType;
  payload: NotificationPayload;
  coalesceTaskId?: string | null;
}) {
  const now = new Date();
  const coalesceTaskId =
    input.coalesceTaskId ?? messageCoalesceTaskId(input.type, input.payload.taskId);

  if (coalesceTaskId) {
    const [existing] = await db
      .select({ id: notification.id, payload: notification.payload })
      .from(notification)
      .where(
        and(
          eq(notification.teamId, input.teamId),
          eq(notification.recipientUserId, input.recipientUserId),
          eq(notification.type, input.type),
          isNull(notification.readAt),
          sql`${notification.payload}->>'taskId' = ${coalesceTaskId}`,
        ),
      )
      .orderBy(desc(notification.createdAt))
      .limit(1);

    if (existing) {
      const nextCount = (existing.payload.messageCount ?? 1) + 1;
      const [updated] = await db
        .update(notification)
        .set({
          actorUserId: input.actorUserId,
          payload: {
            ...existing.payload,
            ...input.payload,
            messageCount: nextCount,
          },
          seenAt: null,
          updatedAt: now,
        })
        .where(eq(notification.id, existing.id))
        .returning({
          id: notification.id,
          teamId: notification.teamId,
          recipientUserId: notification.recipientUserId,
          actorUserId: notification.actorUserId,
          type: notification.type,
          payload: notification.payload,
          readAt: notification.readAt,
          seenAt: notification.seenAt,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt,
        });

      if (!updated) return null;

      const [actor] = input.actorUserId
        ? await db
            .select({ name: user.name, image: user.image })
            .from(user)
            .where(eq(user.id, input.actorUserId))
            .limit(1)
        : [];

      const record: NotificationRecord = {
        id: updated.id,
        teamId: updated.teamId,
        recipientUserId: updated.recipientUserId,
        actorUserId: updated.actorUserId,
        actorName: actor?.name ?? null,
        actorAvatar: formatAvatarUrl(actor?.image ?? null),
        type: updated.type,
        payload: updated.payload,
        readAt: toIso(updated.readAt),
        seenAt: toIso(updated.seenAt),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };

      await publishNotificationCreated(input.teamId, record);
      if (
        !(await shouldDeliver(input.recipientUserId, input.teamId, input.type, "push")) ||
        isUserLiveOnTeam(input.recipientUserId, input.teamId)
      ) {
        return record;
      }
      await deliverNotificationPush(record);
      return record;
    }
  }

  const id = createWorkspaceId("notification");
  const [created] = await db
    .insert(notification)
    .values({
      id,
      teamId: input.teamId,
      recipientUserId: input.recipientUserId,
      actorUserId: input.actorUserId,
      type: input.type,
      payload: input.payload,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: notification.id,
      teamId: notification.teamId,
      recipientUserId: notification.recipientUserId,
      actorUserId: notification.actorUserId,
      type: notification.type,
      payload: notification.payload,
      readAt: notification.readAt,
      seenAt: notification.seenAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    });

  if (!created) return null;

  const [actor] = input.actorUserId
    ? await db
        .select({ name: user.name, image: user.image })
        .from(user)
        .where(eq(user.id, input.actorUserId))
        .limit(1)
    : [];

  const record: NotificationRecord = {
    id: created.id,
    teamId: created.teamId,
    recipientUserId: created.recipientUserId,
    actorUserId: created.actorUserId,
    actorName: actor?.name ?? null,
    actorAvatar: formatAvatarUrl(actor?.image ?? null),
    type: created.type,
    payload: created.payload,
    readAt: toIso(created.readAt),
    seenAt: toIso(created.seenAt),
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };

  await publishNotificationCreated(input.teamId, record);

  if (
    (await shouldDeliver(input.recipientUserId, input.teamId, input.type, "push")) &&
    !isUserLiveOnTeam(input.recipientUserId, input.teamId)
  ) {
    await deliverNotificationPush(record);
  }

  return record;
}

export async function fanOutNotification(
  actorUserId: string | null,
  input: {
    teamId: string;
    recipientUserIds: string[];
    type: NotificationType;
    payload: NotificationPayload;
  },
) {
  const recipients = excludeActor(input.recipientUserIds, actorUserId);
  const created: NotificationRecord[] = [];

  for (const recipientUserId of recipients) {
    const inApp = await shouldDeliver(recipientUserId, input.teamId, input.type, "inApp");
    if (!inApp) continue;

    const record = await upsertNotificationForRecipient({
      teamId: input.teamId,
      recipientUserId,
      actorUserId,
      type: input.type,
      payload: input.payload,
    });
    if (record) created.push(record);
  }

  return created;
}

export async function listTeamMemberUserIds(actorUserId: string | null, input: { teamId: string }) {
  if (actorUserId) await requireTeamMembership(actorUserId, input.teamId, "viewer");
  const rows = await db
    .select({ userId: workspaceTeamMember.userId })
    .from(workspaceTeamMember)
    .where(eq(workspaceTeamMember.teamId, input.teamId));

  return rows.map((row) => row.userId);
}

export async function listTaskThreadParticipantUserIds(
  actorUserId: string | null,
  input: { teamId: string; taskId: string },
) {
  if (actorUserId) await requireTeamMembership(actorUserId, input.teamId, "viewer");
  const rows = await db
    .selectDistinct({ userId: agencyOpsTaskMessage.userId })
    .from(agencyOpsTaskMessage)
    .innerJoin(agencyOpsTaskThread, eq(agencyOpsTaskThread.id, agencyOpsTaskMessage.threadId))
    .where(
      and(
        eq(agencyOpsTaskThread.teamId, input.teamId),
        eq(agencyOpsTaskThread.taskId, input.taskId),
      ),
    );

  return rows.map((row) => row.userId);
}

export async function emitTeamDigestNotification(
  actorUserId: string | null,
  input: {
    teamId: string;
    recipientUserId: string;
    digestDate: string;
    digestHoursSeconds: number;
    digestTasksCompleted: number;
  },
) {
  return fanOutNotification(actorUserId, {
    teamId: input.teamId,
    recipientUserIds: [input.recipientUserId],
    type: "team.digest",
    payload: {
      digestDate: input.digestDate,
      digestHoursSeconds: input.digestHoursSeconds,
      digestTasksCompleted: input.digestTasksCompleted,
    },
  });
}
