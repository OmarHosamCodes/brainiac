import type { NotificationRecord } from "@orch/api/schemas/notifications";
import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";

export const NOTIFICATION_LIST_LIMIT = 40;

export type NotificationPreferenceType =
  | "task.assigned"
  | "task.message"
  | "journey.milestone"
  | "timer.activity"
  | "team.digest";

export type NotificationPreferenceItem = {
  type: NotificationPreferenceType;
  inApp: boolean;
  push: boolean;
};

export type NotificationDeliverySettings = {
  timezone: string;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  focusUntil: string | null;
  focusMode: boolean;
};

function notificationListQueryKey(teamId: string) {
  return orpc.notifications.list.queryKey({
    input: { teamId, limit: NOTIFICATION_LIST_LIMIT },
  });
}

function notificationUnreadCountQueryKey(teamId: string) {
  return orpc.notifications.unreadCount.queryKey({ input: { teamId } });
}

function notificationPreferencesQueryKey(teamId: string) {
  return orpc.notifications.preferences.get.queryKey({ input: { teamId } });
}

function patchNotificationList(
  queryClient: QueryClient,
  teamId: string,
  updater: (items: NotificationRecord[]) => NotificationRecord[],
) {
  queryClient.setQueryData(
    notificationListQueryKey(teamId),
    (current: { items: NotificationRecord[]; nextCursor: string | null } | undefined) => {
      if (!current?.items) return current;
      return { ...current, items: updater(current.items) };
    },
  );
}

function isActionItem(notification: NotificationRecord) {
  if (notification.deliveryClass === "interrupt" || notification.deliveryClass === "breakpoint") {
    return true;
  }
  return notification.type === "task.assigned" || notification.type === "task.message";
}

export function applyNotificationCreatedToCache(
  queryClient: QueryClient,
  teamId: string,
  notification: NotificationRecord,
) {
  queryClient.setQueryData(
    notificationListQueryKey(teamId),
    (current: { items: NotificationRecord[]; nextCursor: string | null } | undefined) => {
      if (!current?.items) return current;
      const withoutDuplicate = current.items.filter((item) => item.id !== notification.id);
      return {
        ...current,
        items: [notification, ...withoutDuplicate].slice(0, NOTIFICATION_LIST_LIMIT),
      };
    },
  );

  queryClient.setQueryData(
    notificationUnreadCountQueryKey(teamId),
    (current: { count: number; actionCount?: number } | undefined) => {
      const base = current?.count ?? 0;
      const actionBase = current?.actionCount ?? 0;
      const nextCount = notification.seenAt ? base : base + 1;
      const nextAction =
        !notification.readAt && isActionItem(notification) ? actionBase + 1 : actionBase;
      return { count: nextCount, actionCount: nextAction };
    },
  );
}

function markAllReadInCache(queryClient: QueryClient, teamId: string) {
  const now = new Date().toISOString();
  patchNotificationList(queryClient, teamId, (items) =>
    items.map((item) =>
      item.readAt ? item : { ...item, readAt: now, seenAt: item.seenAt ?? now },
    ),
  );
  queryClient.setQueryData(notificationUnreadCountQueryKey(teamId), {
    count: 0,
    actionCount: 0,
  });
}

function markOneReadInCache(queryClient: QueryClient, teamId: string, notificationId: string) {
  const now = new Date().toISOString();
  let wasUnreadAction = false;
  patchNotificationList(queryClient, teamId, (items) =>
    items.map((item) => {
      if (item.id !== notificationId) return item;
      if (!item.readAt && isActionItem(item)) wasUnreadAction = true;
      return { ...item, readAt: now, seenAt: item.seenAt ?? now };
    }),
  );
  if (wasUnreadAction) {
    queryClient.setQueryData(
      notificationUnreadCountQueryKey(teamId),
      (current: { count: number; actionCount?: number } | undefined) => ({
        count: current?.count ?? 0,
        actionCount: Math.max(0, (current?.actionCount ?? 0) - 1),
      }),
    );
  }
}

function markSeenInCache(queryClient: QueryClient, teamId: string) {
  const now = new Date().toISOString();
  patchNotificationList(queryClient, teamId, (items) =>
    items.map((item) => (item.seenAt ? item : { ...item, seenAt: now })),
  );
  queryClient.setQueryData(
    notificationUnreadCountQueryKey(teamId),
    (current: { count: number; actionCount?: number } | undefined) => ({
      count: 0,
      actionCount: current?.actionCount ?? 0,
    }),
  );
}

async function invalidateNotificationQueries(queryClient: QueryClient, teamId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: notificationUnreadCountQueryKey(teamId) }),
    queryClient.invalidateQueries({ queryKey: notificationListQueryKey(teamId) }),
  ]);
}

export function useAgencyNotificationsQuery(teamId: string, enabled = true) {
  return useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.notifications.list.queryOptions({
          input: { teamId, limit: NOTIFICATION_LIST_LIMIT },
        }),
        enabled: Boolean(teamId) && enabled,
      },
      "warm",
    ),
  );
}

export function useAgencyNotificationUnreadCountQuery(teamId: string, enabled = true) {
  return useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.notifications.unreadCount.queryOptions({
          input: { teamId },
        }),
        enabled: Boolean(teamId) && enabled,
      },
      // Live `notification.created` already patches the badge; cold poll is a backstop only.
      "cold",
    ),
  );
}

export function useAgencyNotificationPreferencesQuery(teamId: string, enabled = false) {
  return useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.notifications.preferences.get.queryOptions({
          input: { teamId },
        }),
        enabled: Boolean(teamId) && enabled,
      },
      "cold",
    ),
  );
}

export function useMarkNotificationsSeenMutation(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => orpc.notifications.markSeen.call({ teamId }),
    onMutate: () => {
      markSeenInCache(queryClient, teamId);
    },
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient, teamId);
    },
  });
}

export function useMarkNotificationReadMutation(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      orpc.notifications.markRead.call({ teamId, notificationId }),
    onMutate: (notificationId) => {
      markOneReadInCache(queryClient, teamId, notificationId);
    },
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient, teamId);
    },
  });
}

export function useMarkAllNotificationsReadMutation(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => orpc.notifications.markAllRead.call({ teamId }),
    onMutate: () => {
      markAllReadInCache(queryClient, teamId);
    },
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient, teamId);
    },
  });
}

export function useSetNotificationPreferencesMutation(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: NotificationPreferenceItem[]) =>
      orpc.notifications.preferences.set.call({ teamId, preferences }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: notificationPreferencesQueryKey(teamId),
      });
    },
  });
}

export function useSetNotificationDeliverySettingsMutation(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      timezone?: string;
      quietHoursStart?: string | null;
      quietHoursEnd?: string | null;
      focusMode?: boolean;
      focusUntil?: string | null;
    }) => orpc.notifications.preferences.setDelivery.call({ teamId, ...input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: notificationPreferencesQueryKey(teamId),
      });
    },
  });
}
