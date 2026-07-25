import type { NotificationRecord } from "@orch/api/schemas/notifications";
import { Bell, Settings2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Skeleton } from "@/ui/skeleton";
import {
  useAgencyNotificationPreferencesQuery,
  useAgencyNotificationsQuery,
  useAgencyNotificationUnreadCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useMarkNotificationsSeenMutation,
  useSetNotificationPreferencesMutation,
} from "@/features/notifications/notifications-queries";
import {
  canUsePushNotifications,
  dismissPushPrompt,
  isPushPromptDismissed,
  pushPermissionState,
  subscribeToPushNotifications,
} from "@/lib/push";
import { useAgencyTimeTrackingStore } from "@/features/time-tracking/stores/agency-time-tracking";
import { cn } from "@/lib/utils";

type AgencyNotificationsProps = {
  teamId: string;
};

type NotificationGroup = {
  label: "Today" | "Earlier";
  items: NotificationRecord[];
};

function formatRelativeTime(iso: string) {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function formatDigestHours(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function notificationSentence(notification: NotificationRecord) {
  const actor = notification.actorName ?? "Someone";
  const payload = notification.payload;

  switch (notification.type) {
    case "task.assigned":
      return (
        <>
          <span className="font-semibold text-foreground">{actor}</span> assigned you{" "}
          <span className="font-semibold text-foreground">{payload.taskTitle ?? "a task"}</span>
        </>
      );
    case "task.message": {
      const count = payload.messageCount ?? 1;
      if (count > 1) {
        return (
          <>
            <span className="font-semibold text-foreground">{actor}</span> sent {count} messages in{" "}
            <span className="font-semibold text-foreground">{payload.taskTitle ?? "a task"}</span>
          </>
        );
      }
      return (
        <>
          <span className="font-semibold text-foreground">{actor}</span> replied in{" "}
          <span className="font-semibold text-foreground">{payload.taskTitle ?? "a task"}</span>
        </>
      );
    }
    case "journey.milestone":
      return (
        <>
          <span className="font-semibold text-foreground">
            {payload.journeyStepLabel ?? "Milestone"}
          </span>{" "}
          completed on {payload.projectName ?? "a project"}
        </>
      );
    case "timer.activity":
      return payload.timerAction === "stopped" ? (
        <>
          <span className="font-semibold text-foreground">{actor}</span> stopped tracking on{" "}
          {payload.projectName ?? "a project"}
        </>
      ) : (
        <>
          <span className="font-semibold text-foreground">{actor}</span> started tracking
          {payload.taskTitle ? (
            <>
              {" "}
              on <span className="font-semibold text-foreground">{payload.taskTitle}</span>
            </>
          ) : (
            <> on {payload.projectName ?? "a project"}</>
          )}
        </>
      );
    case "team.digest":
      return (
        <>
          Your team logged{" "}
          <span className="font-semibold text-foreground">
            {formatDigestHours(payload.digestHoursSeconds ?? 0)}
          </span>{" "}
          yesterday, {payload.digestTasksCompleted ?? 0} task
          {(payload.digestTasksCompleted ?? 0) === 1 ? "" : "s"} completed
        </>
      );
    default: {
      const _exhaustive: never = notification.type;
      return _exhaustive;
    }
  }
}

function groupNotifications(items: NotificationRecord[]): NotificationGroup[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const today: NotificationRecord[] = [];
  const earlier: NotificationRecord[] = [];

  for (const item of items) {
    if (new Date(item.createdAt) >= startOfToday) {
      today.push(item);
    } else {
      earlier.push(item);
    }
  }

  const groups: NotificationGroup[] = [];
  if (today.length > 0) groups.push({ label: "Today", items: today });
  if (earlier.length > 0) groups.push({ label: "Earlier", items: earlier });
  return groups;
}

function buildNotificationSearchParams(notification: NotificationRecord) {
  const params = new URLSearchParams();
  const payload = notification.payload;

  switch (notification.type) {
    case "task.assigned":
    case "task.message":
      params.set("section", "work");
      if (payload.taskId) params.set("task", payload.taskId);
      break;
    case "journey.milestone":
      params.set("section", "projects");
      if (payload.projectId) params.set("project", payload.projectId);
      break;
    case "timer.activity":
      params.set("section", "dashboard");
      break;
    case "team.digest":
      params.set("section", "reports");
      break;
    default: {
      const _exhaustive: never = notification.type;
      return _exhaustive;
    }
  }

  return params;
}

export function AgencyNotifications({ teamId }: AgencyNotificationsProps) {
  const [, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushDismissed, setPushDismissed] = useState(isPushPromptDismissed);

  const notificationsQuery = useAgencyNotificationsQuery(teamId, open);
  const unreadQuery = useAgencyNotificationUnreadCountQuery(teamId);
  const preferencesQuery = useAgencyNotificationPreferencesQuery(teamId, open);
  const { mutate: markSeen } = useMarkNotificationsSeenMutation(teamId);
  const markReadMutation = useMarkNotificationReadMutation(teamId);
  const markAllReadMutation = useMarkAllNotificationsReadMutation(teamId);
  const setPreferencesMutation = useSetNotificationPreferencesMutation(teamId);
  const startTimer = useAgencyTimeTrackingStore((state) => state.startTimer);

  const unreadCount = unreadQuery.data?.count ?? 0;
  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);
  const items = notificationsQuery.data?.items ?? [];
  const hasUnread = items.some((item) => !item.readAt);
  const groups = useMemo(() => groupNotifications(items), [items]);

  useEffect(() => {
    if (!open || !teamId) return;
    markSeen();
  }, [open, teamId, markSeen]);

  if (!teamId) return null;

  const showPushPrompt =
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

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setShowSettings(false);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative size-8 rounded-full text-muted hover:text-highlighted"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className="size-4" aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
              {badgeLabel}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              aria-label="Notification settings"
              aria-pressed={showSettings}
              onClick={() => setShowSettings((value) => !value)}
            >
              <Settings2 className="size-3.5" aria-hidden />
            </Button>
          </div>
          {!showSettings ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-2 text-xs"
              disabled={!hasUnread || markAllReadMutation.isPending}
              onClick={() => void markAllReadMutation.mutateAsync()}
            >
              Mark all read
            </Button>
          ) : null}
        </div>

        {showSettings ? (
          preferencesQuery.isPending && !preferencesQuery.data ? (
            <div className="space-y-2 px-3 py-3">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : (
            <div className="max-h-[420px] space-y-2 overflow-y-auto px-3 py-3">
              {(preferencesQuery.data?.items ?? []).map((pref) => (
                <div
                  key={pref.type}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {pref.type.replace(".", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      In-app {pref.inApp ? "on" : "off"} · Push {pref.push ? "on" : "off"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={pref.inApp ? "secondary" : "ghost"}
                      className="h-7 rounded-full px-2 text-[11px]"
                      onClick={() =>
                        void setPreferencesMutation.mutateAsync([{ ...pref, inApp: !pref.inApp }])
                      }
                    >
                      In-app
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={pref.push ? "secondary" : "ghost"}
                      className="h-7 rounded-full px-2 text-[11px]"
                      onClick={() =>
                        void setPreferencesMutation.mutateAsync([{ ...pref, push: !pref.push }])
                      }
                    >
                      Push
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : notificationsQuery.isPending ? (
          <div className="space-y-2 px-3 py-3">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-semibold text-foreground">You&apos;re all caught up</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Task assignments, thread replies, milestones, and team activity will appear here.
            </p>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {group.label}
                </p>
                <ul className="divide-y divide-border/50">
                  {group.items.map((notification) => {
                    const unread = !notification.readAt;
                    const quickAction =
                      notification.type === "task.assigned" &&
                      notification.payload.taskId &&
                      notification.payload.projectId
                        ? "start-timer"
                        : notification.type === "task.message" && notification.payload.taskId
                          ? "reply"
                          : null;

                    return (
                      <li key={notification.id}>
                        <div className={cn("flex gap-2 px-3 py-2.5", unread && "bg-primary/5")}>
                          <AgencyMemberAvatar
                            name={notification.actorName ?? "Team"}
                            avatarUrl={notification.actorAvatar}
                            size="md"
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              className="w-full text-left"
                              onClick={() => openNotification(notification)}
                            >
                              <p className="text-sm leading-snug text-foreground">
                                {notificationSentence(notification)}
                              </p>
                              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                                {formatRelativeTime(notification.createdAt)}
                              </p>
                            </button>
                            {quickAction ? (
                              <div className="mt-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 rounded-full px-2.5 text-xs"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (quickAction === "start-timer") {
                                      void handleStartTimer(notification);
                                      return;
                                    }
                                    openNotification(notification);
                                  }}
                                >
                                  {quickAction === "start-timer" ? "Start timer" : "Reply"}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                          {unread ? (
                            <span
                              className="mt-2 size-2 shrink-0 rounded-full bg-primary"
                              aria-hidden
                            />
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}

        {showPushPrompt ? (
          <div className="border-t border-border/60 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Get notified when this tab is closed.</p>
            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-full px-3 text-xs"
                disabled={pushBusy}
                onClick={() => void handleEnablePush()}
              >
                Enable
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => {
                  dismissPushPrompt();
                  setPushDismissed(true);
                }}
              >
                Not now
              </Button>
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
