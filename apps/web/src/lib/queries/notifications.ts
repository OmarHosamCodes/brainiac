import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { withAgencySyncQueryOptions } from "@/lib/utils/agency-query-options";

export function useAgencyNotificationsQuery(teamId: string, enabled = true) {
  return useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.notifications.list.queryOptions({
          input: { teamId, limit: 40 },
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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.notifications.unreadCount.key({ input: { teamId } }),
        }),
        queryClient.invalidateQueries({
          queryKey: orpc.notifications.list.key({ input: { teamId } }),
        }),
      ]);
    },
  });
}

export function useMarkNotificationReadMutation(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      orpc.notifications.markRead.call({ teamId, notificationId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.notifications.unreadCount.key({ input: { teamId } }),
        }),
        queryClient.invalidateQueries({
          queryKey: orpc.notifications.list.key({ input: { teamId } }),
        }),
      ]);
    },
  });
}

export function useMarkAllNotificationsReadMutation(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => orpc.notifications.markAllRead.call({ teamId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.notifications.unreadCount.key({ input: { teamId } }),
        }),
        queryClient.invalidateQueries({
          queryKey: orpc.notifications.list.key({ input: { teamId } }),
        }),
      ]);
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
        queryKey: orpc.notifications.preferences.get.key({ input: { teamId } }),
      });
    },
  });
}
