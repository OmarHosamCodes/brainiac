import type { NotificationRecord } from "@orch/api/schemas/notifications";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAppShellStore } from "@/features/app-shell/app-shell-store";
import {
  useAgencyNotificationsQuery,
  useMarkNotificationReadMutation,
} from "@/features/notifications/notifications-queries";
import {
  buildNotificationSearchParams,
  featuredNotificationBody,
  featuredNotificationCta,
  featuredNotificationTitle,
  formatRelativeTime,
  notificationHref,
  pickFeaturedNeedsAction,
} from "@/features/notifications/notification-presentation";
import { useNotificationsInboxUiStore } from "@/features/notifications/stores/notifications-inbox-ui";
import { useTeamStore } from "@/features/team/team-store";
import { useAgencyTimeTrackingStore } from "@/features/time-tracking/stores/agency-time-tracking";

export type FeaturedRailNotificationInput = {
  /** Mobile drawer is always wide enough for the card. */
  forceExpanded?: boolean;
};

export function useFeaturedRailNotification(input: FeaturedRailNotificationInput = {}) {
  const teamId = useTeamStore((s) => s.selectedTeamId) ?? "";
  const railPinned = useAppShellStore((s) => s.railPinned);
  const expanded = input.forceExpanded || railPinned;
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const requestOpenInbox = useNotificationsInboxUiStore((s) => s.requestOpen);
  const startTimer = useAgencyTimeTrackingStore((state) => state.startTimer);
  const listQuery = useAgencyNotificationsQuery(teamId, Boolean(teamId));
  const markReadMutation = useMarkNotificationReadMutation(teamId);
  const [actionPending, setActionPending] = useState(false);

  const items = listQuery.data?.items ?? [];
  const { featured, count } = useMemo(() => pickFeaturedNeedsAction(items), [items]);

  const title = featured ? featuredNotificationTitle(featured) : "";
  const body = featured ? featuredNotificationBody(featured) : "";
  const cta = featured
    ? featuredNotificationCta(featured)
    : { kind: "open" as const, label: "Open" };
  const moreCount = Math.max(0, count - 1);
  const badgeLabel = count > 9 ? "9+" : String(count);
  const actorName = featured?.actorName?.trim() || "Team";
  const actorAvatar = featured?.actorAvatar ?? null;
  const relativeTime = featured ? formatRelativeTime(featured.createdAt) : "";
  const moreLabel =
    moreCount === 1 ? "1 waiting in inbox" : moreCount > 1 ? `${moreCount} waiting in inbox` : null;

  async function markRead(notification: NotificationRecord) {
    await markReadMutation.mutateAsync(notification.id);
  }

  async function openNotification(notification: NotificationRecord) {
    await markRead(notification);
    const href = notificationHref(notification);
    if (href) {
      navigate(href);
      return;
    }
    setSearchParams(buildNotificationSearchParams(notification), { replace: false });
  }

  async function handlePrimaryCta() {
    if (!featured || !teamId || actionPending) return;
    setActionPending(true);
    try {
      if (cta.kind === "start-timer") {
        const payload = featured.payload;
        if (!payload.projectId || !payload.taskId || !payload.taskTitle || !payload.projectName) {
          await openNotification(featured);
          return;
        }
        await startTimer({
          teamId,
          project: { id: payload.projectId, name: payload.projectName },
          task: { id: payload.taskId, title: payload.taskTitle },
          description: payload.taskTitle,
          successDescription: "Timer started from notification.",
        });
        await markRead(featured);
        setSearchParams(new URLSearchParams({ section: "work", task: payload.taskId }));
        return;
      }
      await openNotification(featured);
    } finally {
      setActionPending(false);
    }
  }

  return {
    teamId,
    expanded,
    featured,
    count,
    moreCount,
    moreLabel,
    badgeLabel,
    title,
    body,
    ctaLabel: cta.label,
    actorName,
    actorAvatar,
    relativeTime,
    listPending: listQuery.isPending && !listQuery.data,
    actionPending,
    onDismiss: () => {
      if (!featured || actionPending) return;
      void markRead(featured);
    },
    onPrimaryCta: () => void handlePrimaryCta(),
    onOpenInbox: () => requestOpenInbox(),
  };
}

export type FeaturedRailNotificationViewModel = ReturnType<typeof useFeaturedRailNotification>;
