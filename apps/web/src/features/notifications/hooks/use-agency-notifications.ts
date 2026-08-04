import type { NotificationRecord } from "@orch/api/schemas/notifications";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  useAgencyNotificationPreferencesQuery,
  useAgencyNotificationUnreadCountQuery,
  useAgencyNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useMarkNotificationsSeenMutation,
  useSetNotificationDeliverySettingsMutation,
  useSetNotificationPreferencesMutation,
  type NotificationPreferenceItem,
} from "@/features/notifications/notifications-queries";
import {
  buildNotificationSearchParams,
  formatDigestHours,
  formatRelativeTime,
  groupNotificationSections,
  notificationPreferenceLabel,
} from "@/features/notifications/notification-presentation";
import { useAgencyTimeTrackingStore } from "@/features/time-tracking/stores/agency-time-tracking";
import {
  canUsePushNotifications,
  dismissPushPrompt,
  isPushPromptDismissed,
  pushPermissionState,
  subscribeToPushNotifications,
} from "@/lib/push";

export type AgencyNotificationsVariant = "icon" | "sidebar";

export type AgencyNotificationsInput = {
  teamId: string;
  variant?: AgencyNotificationsVariant;
};

export function notificationSentenceParts(notification: NotificationRecord) {
  const actor = notification.actorName ?? "Someone";
  const payload = notification.payload;

  switch (notification.type) {
    case "task.assigned":
      return {
        kind: "assigned" as const,
        actor,
        taskTitle: payload.taskTitle ?? "a task",
      };
    case "task.message": {
      const count = payload.messageCount ?? 1;
      return {
        kind: "message" as const,
        actor,
        count,
        taskTitle: payload.taskTitle ?? "a task",
      };
    }
    case "journey.milestone":
      return {
        kind: "milestone" as const,
        stepLabel: payload.journeyStepLabel ?? "Milestone",
        projectName: payload.projectName ?? "a project",
      };
    case "timer.activity":
      return {
        kind: "timer" as const,
        actor,
        timerAction:
          payload.timerAction === "stopped" ? ("stopped" as const) : ("started" as const),
        taskTitle: payload.taskTitle ?? null,
        projectName: payload.projectName ?? "a project",
      };
    case "team.digest":
      return {
        kind: "digest" as const,
        hoursLabel: formatDigestHours(payload.digestHoursSeconds ?? 0),
        tasksCompleted: payload.digestTasksCompleted ?? 0,
      };
    default: {
      const _exhaustive: never = notification.type;
      return _exhaustive;
    }
  }
}

export function useAgencyNotifications(input: AgencyNotificationsInput) {
  const teamId = input.teamId;
  const variant = input.variant ?? "icon";
  const [, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushDismissed, setPushDismissed] = useState(isPushPromptDismissed);
  const [timezoneDraft, setTimezoneDraft] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );

  const notificationsQuery = useAgencyNotificationsQuery(teamId, open);
  const unreadQuery = useAgencyNotificationUnreadCountQuery(teamId);
  const preferencesQuery = useAgencyNotificationPreferencesQuery(teamId, open);
  const { mutate: markSeen } = useMarkNotificationsSeenMutation(teamId);
  const markReadMutation = useMarkNotificationReadMutation(teamId);
  const markAllReadMutation = useMarkAllNotificationsReadMutation(teamId);
  const setPreferencesMutation = useSetNotificationPreferencesMutation(teamId);
  const setDeliveryMutation = useSetNotificationDeliverySettingsMutation(teamId);
  const startTimer = useAgencyTimeTrackingStore((state) => state.startTimer);

  const unreadCount = unreadQuery.data?.count ?? 0;
  const actionCount = unreadQuery.data?.actionCount ?? 0;
  const badgeCount = actionCount > 0 ? actionCount : unreadCount;
  const badgeLabel = badgeCount > 9 ? "9+" : String(badgeCount);

  const [sidebarUnread, setSidebarUnread] = useState(badgeCount);
  useEffect(() => {
    if (badgeCount > 0) setSidebarUnread(badgeCount);
  }, [badgeCount]);

  const items = notificationsQuery.data?.items ?? [];
  const hasUnread = items.some((item) => !item.readAt);
  const sections = useMemo(() => groupNotificationSections(items), [items]);

  useEffect(() => {
    if (!open || !teamId) return;
    markSeen();
  }, [open, teamId, markSeen]);

  useEffect(() => {
    if (preferencesQuery.data?.delivery.timezone) {
      setTimezoneDraft(preferencesQuery.data.delivery.timezone);
    }
  }, [preferencesQuery.data?.delivery.timezone]);

  const showPushPrompt =
    Boolean(teamId) &&
    canUsePushNotifications() &&
    !pushDismissed &&
    pushPermissionState() === "default" &&
    !showSettings;

  function openNotification(notification: NotificationRecord) {
    void markReadMutation.mutateAsync(notification.id);
    setOpen(false);
    setSearchParams(buildNotificationSearchParams(notification), { replace: false });
  }

  async function handleStartTimer(notification: NotificationRecord) {
    const payload = notification.payload;
    if (!payload.projectId || !payload.taskId || !payload.taskTitle || !payload.projectName) return;

    await startTimer({
      teamId,
      project: { id: payload.projectId, name: payload.projectName },
      task: { id: payload.taskId, title: payload.taskTitle },
      description: payload.taskTitle,
      successDescription: "Timer started from notification.",
    });
    void markReadMutation.mutateAsync(notification.id);
    setOpen(false);
    setSearchParams(new URLSearchParams({ section: "work", task: payload.taskId }));
  }

  async function handleEnablePush() {
    setPushBusy(true);
    try {
      await subscribeToPushNotifications();
      setPushDismissed(true);
      dismissPushPrompt();
    } catch {
      // quiet by default: user can retry from settings later
    } finally {
      setPushBusy(false);
    }
  }

  function togglePreferenceChannel(pref: NotificationPreferenceItem, channel: "inApp" | "push") {
    void setPreferencesMutation.mutateAsync([
      {
        ...pref,
        [channel]: !pref[channel],
      },
    ]);
  }

  function setFocusMode(focusMode: boolean) {
    void setDeliveryMutation.mutateAsync({ focusMode });
  }

  function setQuietHours(quietHoursStart: string | null, quietHoursEnd: string | null) {
    void setDeliveryMutation.mutateAsync({ quietHoursStart, quietHoursEnd });
  }

  function commitTimezone() {
    const next = timezoneDraft.trim();
    if (!next || next === preferencesQuery.data?.delivery.timezone) return;
    void setDeliveryMutation.mutateAsync({ timezone: next });
  }

  const delivery = preferencesQuery.data?.delivery ?? {
    timezone: timezoneDraft,
    quietHoursStart: null,
    quietHoursEnd: null,
    focusUntil: null,
    focusMode: false,
  };

  return {
    teamId,
    variant,
    open,
    setOpen,
    showSettings,
    setShowSettings,
    pushBusy,
    showPushPrompt,
    unreadCount,
    actionCount,
    badgeCount,
    badgeLabel,
    sidebarUnread,
    items,
    sections,
    hasUnread,
    listPending: notificationsQuery.isPending,
    preferencesPending: preferencesQuery.isPending && !preferencesQuery.data,
    preferences: preferencesQuery.data?.items ?? [],
    delivery,
    timezoneDraft,
    preferencesSaving: setPreferencesMutation.isPending || setDeliveryMutation.isPending,
    markAllReadPending: markAllReadMutation.isPending,
    formatRelativeTime,
    notificationSentenceParts,
    notificationPreferenceLabel,
    onMarkAllRead: () => void markAllReadMutation.mutateAsync(),
    onOpenNotification: openNotification,
    onStartTimer: (notification: NotificationRecord) => void handleStartTimer(notification),
    onEnablePush: () => void handleEnablePush(),
    onDismissPushPrompt: () => {
      dismissPushPrompt();
      setPushDismissed(true);
    },
    onTogglePreferenceChannel: togglePreferenceChannel,
    onSetFocusMode: setFocusMode,
    onSetQuietHours: setQuietHours,
    onTimezoneDraftChange: setTimezoneDraft,
    onTimezoneCommit: commitTimezone,
  };
}

export type AgencyNotificationsViewModel = ReturnType<typeof useAgencyNotifications>;
