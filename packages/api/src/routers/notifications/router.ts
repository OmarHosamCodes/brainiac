import { z } from "zod";

import { protectedProProcedure } from "../../procedures";
import {
  notificationListInputSchema,
  notificationMarkReadInputSchema,
  notificationPreferenceSchema,
  notificationRecordSchema,
  pushSubscribeInputSchema,
  pushUnsubscribeInputSchema,
  teamScopedNotificationInputSchema,
} from "./schemas";
import {
  getNotificationPreferences,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationsSeen,
  setNotificationPreferences,
  subscribePush,
  unsubscribePush,
} from "./service";

export const notificationsRouter = {
  list: protectedProProcedure
    .input(notificationListInputSchema)
    .handler(async ({ context, input }) => {
      const result = await listNotifications(context.session.user.id, input);
      return z
        .object({
          items: z.array(notificationRecordSchema),
          nextCursor: z.string().datetime().nullable(),
        })
        .parse(result);
    }),
  unreadCount: protectedProProcedure
    .input(teamScopedNotificationInputSchema)
    .handler(async ({ context, input }) => {
      return z
        .object({ count: z.number().int().nonnegative() })
        .parse(await getUnreadNotificationCount(context.session.user.id, input));
    }),
  markSeen: protectedProProcedure
    .input(teamScopedNotificationInputSchema)
    .handler(async ({ context, input }) => {
      return z
        .object({ updated: z.boolean() })
        .parse(await markNotificationsSeen(context.session.user.id, input));
    }),
  markRead: protectedProProcedure
    .input(notificationMarkReadInputSchema)
    .handler(async ({ context, input }) => {
      return z
        .object({ notificationId: z.string().min(1), read: z.boolean() })
        .parse(await markNotificationRead(context.session.user.id, input));
    }),
  markAllRead: protectedProProcedure
    .input(teamScopedNotificationInputSchema)
    .handler(async ({ context, input }) => {
      return z
        .object({ updated: z.boolean() })
        .parse(await markAllNotificationsRead(context.session.user.id, input));
    }),
  preferences: {
    get: protectedProProcedure
      .input(teamScopedNotificationInputSchema)
      .handler(async ({ context, input }) => {
        const result = await getNotificationPreferences(context.session.user.id, input);
        return z.object({ items: z.array(notificationPreferenceSchema) }).parse(result);
      }),
    set: protectedProProcedure
      .input(
        teamScopedNotificationInputSchema.extend({
          preferences: z.array(notificationPreferenceSchema).min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        const result = await setNotificationPreferences(context.session.user.id, input);
        return z.object({ items: z.array(notificationPreferenceSchema) }).parse(result);
      }),
  },
  push: {
    subscribe: protectedProProcedure
      .input(pushSubscribeInputSchema)
      .handler(async ({ context, input }) => {
        return z
          .object({ subscribed: z.boolean() })
          .parse(await subscribePush(context.session.user.id, input));
      }),
    unsubscribe: protectedProProcedure
      .input(pushUnsubscribeInputSchema)
      .handler(async ({ context, input }) => {
        return z
          .object({ unsubscribed: z.boolean() })
          .parse(await unsubscribePush(context.session.user.id, input));
      }),
  },
};
