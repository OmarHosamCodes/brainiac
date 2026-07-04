import { Bell } from "lucide-react";
import { useMemo, useState } from "react";

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
import { useAgencyNotificationsStore } from "@/stores/agency-notifications";

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
  const [pushState, setPushState] = useState<"idle" | "pending" | "denied" | "enabled">("idle");
  const items = useAgencyNotificationsStore((state) => state.itemsByTeam[teamId] ?? []);
  const unreadCount = useAgencyNotificationsStore((state) => state.unreadCountByTeam[teamId] ?? 0);

  const visibleItems = useMemo(() => items.slice(0, 8), [items]);
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
    setPushState("idle");
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
              className="absolute right-1 top-1 size-2 rounded-full bg-primary ring-2 ring-default"
              aria-hidden
            />
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
            <p className="px-3 py-6 text-center text-sm text-muted">No notifications yet</p>
          ) : (
            visibleItems.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className={cn(
                  "cursor-pointer rounded-none border-b border-border/60 px-3 py-3 focus:bg-muted/40",
                  !item.readAt && "bg-muted/20",
                )}
                onClick={() => {
                  if (!item.readAt) {
                    void onMarkRead([item.id]);
                  }
                  onOpenTask(item.taskId);
                }}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-highlighted">{item.title}</p>
                    <span className="shrink-0 font-mono text-[10px] text-muted">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-default">{item.body}</p>
                  <p className="text-[11px] text-muted">{item.description}</p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <div className="px-3 py-2">
          {pushPermission === "granted" || pushState === "enabled" ? (
            <p className="text-xs text-muted">Browser notifications enabled</p>
          ) : pushState === "denied" || pushPermission === "denied" ? (
            <p className="text-xs text-muted">
              Browser notifications blocked. In-app alerts still work.
            </p>
          ) : (
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
              disabled={pushState === "pending"}
              onClick={() => void handleEnablePush()}
            >
              {pushState === "pending" ? "Enabling…" : "Enable browser notifications"}
            </button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
