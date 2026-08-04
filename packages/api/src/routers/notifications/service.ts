import { db } from "@orch/db";
import {
  agencyOpsActiveTimer,
  notification,
  notificationDeferredPush,
  notificationDeliverySettings,
  notificationPreference,
  pushSubscription,
  type NotificationDeliveryClass,
  type NotificationPayload,
  type NotificationType,
  user,
  workspaceTeamMember,
} from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, inArray, isNull, lte, lt, or, sql } from "drizzle-orm";

import type { NotificationRecord } from "../../schemas/notifications";
import { getUserAvatarPublicUrl } from "../../storage";
import { env } from "@orch/env/server";
import { requireTeamMembership } from "../agency-ops/shared/membership";
import {
  BREAKPOINT_PUSH_MAX_DEFER_MS,
  isActionNotificationType,
  isWithinQuietHours,
  resolveDeliveryDecision,
} from "./delivery-policy";
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

const DEFAULT_TIMEZONE = "UTC";

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

type NotificationRow = {
  id: string;
  teamId: string;
  recipientUserId: string;
  actorUserId: string | null;
  actorName: string | null;
  actorImage: string | null;
  type: NotificationType;
  deliveryClass: NotificationDeliveryClass | null;
  payload: NotificationPayload;
  readAt: Date | null;
  seenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

async function mapNotificationRows(rows: NotificationRow[]): Promise<NotificationRecord[]> {
  return rows.map((row) => ({
    id: row.id,
    teamId: row.teamId,
    recipientUserId: row.recipientUserId,
    actorUserId: row.actorUserId,
    actorName: row.actorName,
    actorAvatar: formatAvatarUrl(row.actorImage),
    type: row.type,
    deliveryClass: row.deliveryClass,
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

async function getDeliverySettingsRow(userId: string, teamId: string) {
  const [row] = await db
    .select({
      timezone: notificationDeliverySettings.timezone,
      quietHoursStart: notificationDeliverySettings.quietHoursStart,
      quietHoursEnd: notificationDeliverySettings.quietHoursEnd,
      focusUntil: notificationDeliverySettings.focusUntil,
    })
    .from(notificationDeliverySettings)
    .where(
      and(
        eq(notificationDeliverySettings.userId, userId),
        eq(notificationDeliverySettings.teamId, teamId),
      ),
    )
    .limit(1);

  return (
    row ?? {
      timezone: DEFAULT_TIMEZONE,
      quietHoursStart: null as string | null,
      quietHoursEnd: null as string | null,
      focusUntil: null as Date | null,
    }
  );
}

function isFocusActive(focusUntil: Date | null, now = new Date()) {
  return Boolean(focusUntil && focusUntil.getTime() > now.getTime());
}

async function recipientHasActiveTimer(userId: string) {
  const [row] = await db
    .select({ id: agencyOpsActiveTimer.id })
    .from(agencyOpsActiveTimer)
    .where(eq(agencyOpsActiveTimer.userId, userId))
    .limit(1);
  return Boolean(row);
}

async function resolveRecipientDelivery(input: {
  recipientUserId: string;
  teamId: string;
  type: NotificationType;
  assignedToTeam?: boolean;
}) {
  const settings = await getDeliverySettingsRow(input.recipientUserId, input.teamId);
  const now = new Date();
  const quietOrFocusActive =
    isFocusActive(settings.focusUntil, now) ||
    isWithinQuietHours(now, settings.timezone, settings.quietHoursStart, settings.quietHoursEnd);
  const hasActiveTimer = await recipientHasActiveTimer(input.recipientUserId);
  return resolveDeliveryDecision({
    type: input.type,
    assignedToTeam: input.assignedToTeam,
    hasActiveTimer,
    quietOrFocusActive,
  });
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
      deliveryClass: notification.deliveryClass,
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

  const [unseenRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notification)
    .where(
      and(
        eq(notification.teamId, teamId),
        eq(notification.recipientUserId, actorUserId),
        isNull(notification.seenAt),
      ),
    );

  const [actionRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notification)
    .where(
      and(
        eq(notification.teamId, teamId),
        eq(notification.recipientUserId, actorUserId),
        isNull(notification.readAt),
        or(
          eq(notification.type, "task.assigned"),
          eq(notification.type, "task.message"),
          inArray(notification.deliveryClass, ["interrupt", "breakpoint"]),
        ),
      ),
    );

  return {
    count: unseenRow?.count ?? 0,
    actionCount: actionRow?.count ?? 0,
  };
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
  const settings = await getDeliverySettingsRow(actorUserId, teamId);

  return {
    items: NOTIFICATION_TYPES.map((type) => ({
      type,
      inApp: map.get(type)?.inApp ?? true,
      push: map.get(type)?.push ?? true,
    })),
    delivery: {
      timezone: settings.timezone,
      quietHoursStart: settings.quietHoursStart,
      quietHoursEnd: settings.quietHoursEnd,
      focusUntil: toIso(settings.focusUntil),
      focusMode: isFocusActive(settings.focusUntil),
    },
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

export async function setNotificationDeliverySettings(
  actorUserId: string,
  input: {
    teamId: string;
    timezone?: string;
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
    focusMode?: boolean;
    focusUntil?: string | null;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const existing = await getDeliverySettingsRow(actorUserId, input.teamId);
  const now = new Date();

  let focusUntil = existing.focusUntil;
  if (input.focusUntil !== undefined) {
    focusUntil = input.focusUntil ? new Date(input.focusUntil) : null;
  } else if (input.focusMode === true) {
    // Default focus block: end of local day + 8h buffer via 8h from now
    focusUntil = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  } else if (input.focusMode === false) {
    focusUntil = null;
  }

  const timezone = input.timezone ?? existing.timezone;
  const quietHoursStart =
    input.quietHoursStart !== undefined ? input.quietHoursStart : existing.quietHoursStart;
  const quietHoursEnd =
    input.quietHoursEnd !== undefined ? input.quietHoursEnd : existing.quietHoursEnd;

  await db
    .insert(notificationDeliverySettings)
    .values({
      id: createWorkspaceId("notification-delivery"),
      userId: actorUserId,
      teamId: input.teamId,
      timezone,
      quietHoursStart,
      quietHoursEnd,
      focusUntil,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [notificationDeliverySettings.userId, notificationDeliverySettings.teamId],
      set: {
        timezone,
        quietHoursStart,
        quietHoursEnd,
        focusUntil,
        updatedAt: now,
      },
    });

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

async function scheduleDeferredPush(input: {
  notificationId: string;
  teamId: string;
  recipientUserId: string;
  deliverAfter: Date;
}) {
  const now = new Date();
  await db
    .insert(notificationDeferredPush)
    .values({
      id: createWorkspaceId("notification-deferred"),
      notificationId: input.notificationId,
      teamId: input.teamId,
      recipientUserId: input.recipientUserId,
      deliverAfter: input.deliverAfter,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: notificationDeferredPush.notificationId,
      set: {
        deliverAfter: input.deliverAfter,
      },
    });
}

async function maybeDeliverPush(
  record: NotificationRecord,
  decision: { pushNow: boolean; deferPush: boolean; forceSuppressPush: boolean },
) {
  if (decision.forceSuppressPush) return;
  if (!(await shouldDeliver(record.recipientUserId, record.teamId, record.type, "push"))) {
    return;
  }

  if (decision.deferPush) {
    await scheduleDeferredPush({
      notificationId: record.id,
      teamId: record.teamId,
      recipientUserId: record.recipientUserId,
      deliverAfter: new Date(Date.now() + BREAKPOINT_PUSH_MAX_DEFER_MS),
    });
    return;
  }

  if (!decision.pushNow) return;
  if (isUserLiveOnTeam(record.recipientUserId, record.teamId)) return;
  await deliverNotificationPush(record);
}

async function loadNotificationRecord(notificationId: string): Promise<NotificationRecord | null> {
  const [row] = await db
    .select({
      id: notification.id,
      teamId: notification.teamId,
      recipientUserId: notification.recipientUserId,
      actorUserId: notification.actorUserId,
      actorName: user.name,
      actorImage: user.image,
      type: notification.type,
      deliveryClass: notification.deliveryClass,
      payload: notification.payload,
      readAt: notification.readAt,
      seenAt: notification.seenAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    })
    .from(notification)
    .leftJoin(user, eq(user.id, notification.actorUserId))
    .where(eq(notification.id, notificationId))
    .limit(1);

  if (!row) return null;
  const [mapped] = await mapNotificationRows([row]);
  return mapped ?? null;
}

/** Flush deferred pushes for a user (timer stop). Pass `onlyDue: true` to honor deliverAfter. */
export async function flushDeferredNotificationPushes(
  actorUserId: string,
  input: { onlyDue?: boolean } = {},
) {
  const now = new Date();
  const conditions = [eq(notificationDeferredPush.recipientUserId, actorUserId)];
  const rows = await db
    .select({
      id: notificationDeferredPush.id,
      notificationId: notificationDeferredPush.notificationId,
      teamId: notificationDeferredPush.teamId,
      recipientUserId: notificationDeferredPush.recipientUserId,
      deliverAfter: notificationDeferredPush.deliverAfter,
    })
    .from(notificationDeferredPush)
    .where(
      input.onlyDue
        ? and(...conditions, lte(notificationDeferredPush.deliverAfter, now))
        : and(...conditions),
    );

  for (const row of rows) {
    const record = await loadNotificationRecord(row.notificationId);
    await db.delete(notificationDeferredPush).where(eq(notificationDeferredPush.id, row.id));
    if (!record) continue;

    const settings = await getDeliverySettingsRow(row.recipientUserId, row.teamId);
    const quietOrFocusActive =
      isFocusActive(settings.focusUntil, now) ||
      isWithinQuietHours(now, settings.timezone, settings.quietHoursStart, settings.quietHoursEnd);
    if (quietOrFocusActive) continue;
    if (!(await shouldDeliver(row.recipientUserId, row.teamId, record.type, "push"))) continue;
    if (isUserLiveOnTeam(row.recipientUserId, row.teamId)) continue;
    await deliverNotificationPush(record);
  }

  return { flushed: rows.length };
}

/** Flush deferred pushes that hit the max deferral cap (scheduler / digest tick). */
export async function flushDueDeferredNotificationPushes(
  _actorUserId: string | null,
  _input: Record<string, never> = {},
) {
  const now = new Date();
  const rows = await db
    .select({
      id: notificationDeferredPush.id,
      notificationId: notificationDeferredPush.notificationId,
      teamId: notificationDeferredPush.teamId,
      recipientUserId: notificationDeferredPush.recipientUserId,
    })
    .from(notificationDeferredPush)
    .where(lte(notificationDeferredPush.deliverAfter, now));

  for (const row of rows) {
    const record = await loadNotificationRecord(row.notificationId);
    await db.delete(notificationDeferredPush).where(eq(notificationDeferredPush.id, row.id));
    if (!record) continue;

    const settings = await getDeliverySettingsRow(row.recipientUserId, row.teamId);
    const quietOrFocusActive =
      isFocusActive(settings.focusUntil, now) ||
      isWithinQuietHours(now, settings.timezone, settings.quietHoursStart, settings.quietHoursEnd);
    if (quietOrFocusActive) continue;
    if (!(await shouldDeliver(row.recipientUserId, row.teamId, record.type, "push"))) continue;
    if (isUserLiveOnTeam(row.recipientUserId, row.teamId)) continue;
    await deliverNotificationPush(record);
  }

  return { flushed: rows.length };
}

async function upsertNotificationForRecipient(input: {
  teamId: string;
  recipientUserId: string;
  actorUserId: string | null;
  type: NotificationType;
  payload: NotificationPayload;
  assignedToTeam?: boolean;
  coalesceTaskId?: string | null;
}) {
  const now = new Date();
  const coalesceTaskId =
    input.coalesceTaskId ?? messageCoalesceTaskId(input.type, input.payload.taskId);
  const decision = await resolveRecipientDelivery({
    recipientUserId: input.recipientUserId,
    teamId: input.teamId,
    type: input.type,
    assignedToTeam: input.assignedToTeam,
  });

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
          deliveryClass: decision.deliveryClass,
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
          deliveryClass: notification.deliveryClass,
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
        deliveryClass: updated.deliveryClass,
        payload: updated.payload,
        readAt: toIso(updated.readAt),
        seenAt: toIso(updated.seenAt),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };

      await publishNotificationCreated(input.teamId, record);
      await maybeDeliverPush(record, decision);
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
      deliveryClass: decision.deliveryClass,
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
      deliveryClass: notification.deliveryClass,
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
    deliveryClass: created.deliveryClass,
    payload: created.payload,
    readAt: toIso(created.readAt),
    seenAt: toIso(created.seenAt),
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };

  await publishNotificationCreated(input.teamId, record);
  await maybeDeliverPush(record, decision);
  return record;
}

export async function fanOutNotification(
  actorUserId: string | null,
  input: {
    teamId: string;
    recipientUserIds: string[];
    type: NotificationType;
    payload: NotificationPayload;
    assignedToTeam?: boolean;
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
      assignedToTeam: input.assignedToTeam,
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

export async function getNotificationDeliverySettingsForUser(
  actorUserId: string | null,
  input: { userId: string; teamId: string },
) {
  if (actorUserId) await requireTeamMembership(actorUserId, input.teamId, "viewer");
  return getDeliverySettingsRow(input.userId, input.teamId);
}

export { isActionNotificationType };
