import type { NotificationRecord } from "@brainiac/api/schemas/notifications";
import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";

export const NOTIFICATION_LIST_LIMIT = 40;

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

function markAllReadInCache(queryClient: QueryClient, teamId: string) {
  const now = new Date().toISOString();
  patchNotificationList(queryClient, teamId, (items) =>
    items.map((item) =>
      item.readAt ? item : { ...item, readAt: now, seenAt: item.seenAt ?? now },
    ),
  );
}

function markOneReadInCache(queryClient: QueryClient, teamId: string, notificationId: string) {
  const now = new Date().toISOString();
  patchNotificationList(queryClient, teamId, (items) =>
    items.map((item) =>
      item.id === notificationId ? { ...item, readAt: now, seenAt: item.seenAt ?? now } : item,
    ),
  );
}

function markSeenInCache(queryClient: QueryClient, teamId: string) {
  const now = new Date().toISOString();
  patchNotificationList(queryClient, teamId, (items) =>
    items.map((item) => (item.seenAt ? item : { ...item, seenAt: now })),
  );
  queryClient.setQueryData(notificationUnreadCountQueryKey(teamId), { count: 0 });
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
      "hot",
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
    mutationFn: (
      preferences: Array<{
        type:
          | "task.assigned"
          | "task.message"
          | "journey.milestone"
          | "timer.activity"
          | "team.digest";
        inApp: boolean;
        push: boolean;
      }>,
    ) => orpc.notifications.preferences.set.call({ teamId, preferences }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: notificationPreferencesQueryKey(teamId),
      });
    },
  });
}
