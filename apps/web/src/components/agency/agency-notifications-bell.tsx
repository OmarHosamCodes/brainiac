import { Bell } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  useAgencyNotificationsStore,
  type AgencyNotificationItem,
} from "@/stores/agency-notifications";

const EMPTY_NOTIFICATION_ITEMS: AgencyNotificationItem[] = [];
const INBOX_DISPLAY_LIMIT = 20;

type PushUiState = "idle" | "pending" | "enabled" | "denied" | "unsupported" | "not-configured";

function formatRelativeTime(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatUnreadBadge(count: number): string {
  return count > 9 ? "9+" : String(count);
}

function notificationTypeBadge(item: AgencyNotificationItem) {
  if (item.type === "task_assigned") {
    return { label: "Assigned", variant: "default" as const };
  }
  if (item.body.startsWith("Agent ")) {
    return { label: "Agent", variant: "secondary" as const };
  }
  return { label: "Thread", variant: "outline" as const };
}

type AgencyNotificationsBellProps = {
  teamId: string;
  onOpenTask: (taskId: string) => void;
  onMarkRead: (ids: string[]) => void;
  onMarkAllRead: () => void;
  onOpenChange: (open: boolean) => void;
  onEnablePush: () => Promise<{ ok: boolean; reason?: string }>;
  isMarkingAllRead?: boolean;
};

export function AgencyNotificationsBell({
  teamId,
  onOpenTask,
  onMarkRead,
  onMarkAllRead,
  onOpenChange,
  onEnablePush,
  isMarkingAllRead = false,
}: AgencyNotificationsBellProps) {
  const [pushState, setPushState] = useState<PushUiState>("idle");
  const items = useAgencyNotificationsStore(
    (state) => state.itemsByTeam[teamId] ?? EMPTY_NOTIFICATION_ITEMS,
  );
  const unreadCount = useAgencyNotificationsStore((state) => state.unreadCountByTeam[teamId] ?? 0);

  const visibleItems = useMemo(() => items.slice(0, INBOX_DISPLAY_LIMIT), [items]);
  const pushPermission =
    typeof Notification !== "undefined" ? Notification.permission : "default";

  async function handleEnablePush() {
    setPushState("pending");
    const result = await onEnablePush();
    if (result.ok) {
      setPushState("enabled");
      return;
    }
    if (result.reason === "denied") {
      setPushState("denied");
      return;
    }
    if (result.reason === "unsupported") {
      setPushState("unsupported");
      return;
    }
    if (result.reason === "not-configured") {
      setPushState("not-configured");
      return;
    }
    setPushState("idle");
  }

  function renderPushFooter() {
    if (pushPermission === "granted" || pushState === "enabled") {
      return <p className="text-xs text-muted">Browser notifications enabled</p>;
    }
    if (pushState === "denied" || pushPermission === "denied") {
      return (
        <p className="text-xs text-muted">
          Browser notifications blocked. In-app alerts still work.
        </p>
      );
    }
    if (pushState === "unsupported") {
      return (
        <p className="text-xs text-muted">
          Browser notifications are not supported here. In-app alerts still work.
        </p>
      );
    }
    if (pushState === "not-configured") {
      return (
        <p className="text-xs text-muted">
          Browser notifications are not set up on this server yet. In-app alerts still work.
        </p>
      );
    }
    return (
      <button
        type="button"
        className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
        disabled={pushState === "pending"}
        onClick={() => void handleEnablePush()}
      >
        {pushState === "pending" ? "Enabling…" : "Enable browser notifications"}
      </button>
    );
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        onOpenChange(open);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 shrink-0"
          aria-label={
            unreadCount > 0
              ? `${unreadCount} unread agency notifications`
              : "Agency notifications"
          }
        >
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-default"
              aria-hidden
            >
              {formatUnreadBadge(unreadCount)}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <DropdownMenuLabel className="p-0 text-xs font-bold uppercase tracking-[0.18em] text-muted">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 ? (
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
              disabled={isMarkingAllRead}
              onClick={() => void onMarkAllRead()}
            >
              Mark all read
            </button>
          ) : null}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {visibleItems.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">
              Task assignments and thread replies appear here.
            </p>
          ) : (
            visibleItems.map((item) => {
              const typeBadge = notificationTypeBadge(item);
              return (
                <DropdownMenuItem
                  key={item.id}
                  className={cn(
                    "cursor-pointer rounded-none border-b border-border/60 px-3 py-3 focus:bg-muted/40",
                    !item.readAt && "bg-muted/20",
                  )}
                  aria-describedby={`agency-notification-${item.id}-body`}
                  onClick={() => {
                    if (!item.readAt) {
                      void onMarkRead([item.id]);
                    }
                    onOpenTask(item.taskId);
                  }}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge
                          variant={typeBadge.variant}
                          className="shrink-0 px-1.5 py-0 text-[10px] uppercase tracking-wide"
                        >
                          {typeBadge.label}
                        </Badge>
                        <p className="truncate text-sm font-semibold text-highlighted">
                          {item.title}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-muted">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    <p id={`agency-notification-${item.id}-body`} className="text-xs text-default">
                      {item.body}
                    </p>
                    <p className="text-[11px] text-muted">{item.description}</p>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <div className="px-3 py-2">{renderPushFooter()}</div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
