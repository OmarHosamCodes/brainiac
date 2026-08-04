import { z } from "zod";

export const notificationTypeSchema = z.enum([
  "task.assigned",
  "task.message",
  "journey.milestone",
  "timer.activity",
  "team.digest",
]);

export const notificationDeliveryClassSchema = z.enum([
  "interrupt",
  "breakpoint",
  "center",
  "digest",
]);

export const notificationPayloadSchema = z.object({
  projectId: z.string().min(1).optional(),
  projectName: z.string().min(1).optional(),
  taskId: z.string().min(1).optional(),
  taskTitle: z.string().min(1).optional(),
  messageId: z.string().min(1).optional(),
  messagePreview: z.string().optional(),
  messageCount: z.number().int().positive().optional(),
  journeyStepId: z.string().min(1).optional(),
  journeyStepLabel: z.string().min(1).optional(),
  timerAction: z.enum(["started", "stopped"]).optional(),
  digestHoursSeconds: z.number().int().nonnegative().optional(),
  digestTasksCompleted: z.number().int().nonnegative().optional(),
  digestDate: z.string().optional(),
});

export const notificationRecordSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  recipientUserId: z.string().min(1),
  actorUserId: z.string().min(1).nullable(),
  actorName: z.string().nullable(),
  actorAvatar: z.string().nullable(),
  type: notificationTypeSchema,
  deliveryClass: notificationDeliveryClassSchema.nullable(),
  payload: notificationPayloadSchema,
  readAt: z.string().datetime().nullable(),
  seenAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type NotificationRecord = z.infer<typeof notificationRecordSchema>;

export const notificationPreferenceSchema = z.object({
  type: notificationTypeSchema,
  inApp: z.boolean(),
  push: z.boolean(),
});

const clockTimeSchema = z
  .string()
  .regex(/^([01]?\d|2[0-3]):([0-5]\d)$/, "Expected HH:mm")
  .nullable();

export const notificationDeliverySettingsSchema = z.object({
  timezone: z.string().min(1),
  quietHoursStart: clockTimeSchema,
  quietHoursEnd: clockTimeSchema,
  focusUntil: z.string().datetime().nullable(),
  focusMode: z.boolean(),
});

export const notificationDeliverySettingsSetInputSchema = z.object({
  teamId: z.string().min(1),
  timezone: z.string().min(1).optional(),
  quietHoursStart: clockTimeSchema.optional(),
  quietHoursEnd: clockTimeSchema.optional(),
  focusMode: z.boolean().optional(),
  focusUntil: z.string().datetime().nullable().optional(),
});

export const teamScopedNotificationInputSchema = z.object({
  teamId: z.string().min(1),
});

export const notificationListInputSchema = teamScopedNotificationInputSchema.extend({
  cursor: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export const notificationMarkReadInputSchema = teamScopedNotificationInputSchema.extend({
  notificationId: z.string().min(1),
});

export const notificationPreferencesSetInputSchema = teamScopedNotificationInputSchema.extend({
  preferences: z.array(notificationPreferenceSchema).min(1),
});

export const pushSubscribeInputSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export const pushUnsubscribeInputSchema = z.object({
  endpoint: z.string().url(),
});
