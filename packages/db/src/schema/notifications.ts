import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { workspaceTeam } from "./team";

export type NotificationType =
  | "task.assigned"
  | "task.message"
  | "journey.milestone"
  | "timer.activity"
  | "team.digest"
  | "member.alert";

export type NotificationDeliveryClass = "interrupt" | "breakpoint" | "center" | "digest";

export type NotificationPayload = {
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  messageId?: string;
  messagePreview?: string;
  messageCount?: number;
  journeyStepId?: string;
  journeyStepLabel?: string;
  timerAction?: "started" | "stopped";
  digestHoursSeconds?: number;
  digestTasksCompleted?: number;
  digestDate?: string;
  subjectUserId?: string;
  alertId?: string;
  alertTitle?: string;
  notePreview?: string;
};

export const notification = pgTable(
  "notification",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    type: text("type").$type<NotificationType>().notNull(),
    deliveryClass: text("delivery_class").$type<NotificationDeliveryClass>(),
    payload: jsonb("payload").$type<NotificationPayload>().notNull(),
    readAt: timestamp("read_at"),
    seenAt: timestamp("seen_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("notification_recipient_created_idx").on(table.recipientUserId, table.createdAt),
    index("notification_team_recipient_idx").on(table.teamId, table.recipientUserId),
    index("notification_recipient_unread_idx").on(table.recipientUserId, table.readAt),
  ],
);

export const notificationPreference = pgTable(
  "notification_preference",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    type: text("type").$type<NotificationType>().notNull(),
    inApp: boolean("in_app").notNull().default(true),
    push: boolean("push").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("notification_preference_user_team_type_unique").on(
      table.userId,
      table.teamId,
      table.type,
    ),
  ],
);

export const notificationDeliverySettings = pgTable(
  "notification_delivery_settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    timezone: text("timezone").notNull().default("UTC"),
    quietHoursStart: text("quiet_hours_start"),
    quietHoursEnd: text("quiet_hours_end"),
    focusUntil: timestamp("focus_until"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("notification_delivery_settings_user_team_unique").on(table.userId, table.teamId),
  ],
);

export const notificationDeferredPush = pgTable(
  "notification_deferred_push",
  {
    id: text("id").primaryKey(),
    notificationId: text("notification_id")
      .notNull()
      .references(() => notification.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    deliverAfter: timestamp("deliver_after").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("notification_deferred_push_notification_unique").on(table.notificationId),
    index("notification_deferred_push_recipient_deliver_idx").on(
      table.recipientUserId,
      table.deliverAfter,
    ),
  ],
);

export const notificationDigestSent = pgTable(
  "notification_digest_sent",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    digestDate: text("digest_date").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("notification_digest_sent_team_recipient_date_unique").on(
      table.teamId,
      table.recipientUserId,
      table.digestDate,
    ),
  ],
);

export const pushSubscription = pgTable(
  "push_subscription",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("push_subscription_endpoint_unique").on(table.endpoint),
    index("push_subscription_user_idx").on(table.userId),
  ],
);
