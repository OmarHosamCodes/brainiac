import { Bell, LogIn, Settings, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "@/lib/navigation";

import { useAppUpdateStore } from "@/features/app-shell/app-update-store";
import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { useBilling } from "@/features/billing/billing-queries";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { UserSettingsModal } from "@/features/user-settings/user-settings-modal";
import { useAuthSession } from "@/lib/auth-session";
import { getServerUrl } from "@/lib/env";
import { getUserAvatarPublicUrl } from "@/lib/user-avatar-url";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Skeleton } from "@/ui/skeleton";

type AppShellAccountMenuProps = {
  /** `icon` round avatar trigger, or a full-width `sidebar` profile row. */
  variant?: "icon" | "sidebar";
};

export function AppShellAccountMenu({ variant = "icon" }: AppShellAccountMenuProps) {
  const { user, isPending } = useAuthSession();
  const { isPro } = useBilling();
  const updateAvailable = useAppUpdateStore((s) => s.updateAvailable);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const userName = user?.name?.trim() || "Workspace";
  const serverUrl = getServerUrl();
  const avatarUrl =
    user?.image && user.id && serverUrl
      ? getUserAvatarPublicUrl({ baseUrl: serverUrl, userId: user.id, storageKey: user.image })
      : null;

  if (isPending) {
    return variant === "sidebar" ? (
      <Skeleton className="h-11 w-full rounded-[10px]" />
    ) : (
      <Skeleton className="size-8 rounded-full" />
    );
  }

  if (!user) {
    if (variant === "sidebar") {
      return (
        <Link
          to="/login"
          className={cn(
            "app-shell__rail-link text-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            shellFocusRingClass,
          )}
          aria-label="Sign in"
          title="Sign in"
        >
          <LogIn className="size-4 shrink-0" aria-hidden="true" />
          <span className="rail-label min-w-0 flex-1 truncate text-left">Sign in</span>
        </Link>
      );
    }
    return (
      <Button
        asChild
        variant="secondary"
        size="icon"
        className={cn("size-8 rounded-full", shellFocusRingClass)}
        aria-label="Sign in"
      >
        <Link to="/login">
          <LogIn className="size-3.5" />
        </Link>
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {variant === "sidebar" ? (
            <button
              type="button"
              className={cn(
                "app-shell__rail-link app-shell__rail-header text-muted transition-colors hover:bg-sidebar-accent",
                shellFocusRingClass,
              )}
              aria-label={`Account menu for ${userName}`}
              title={userName}
            >
              <span className="relative shrink-0">
                <AgencyMemberAvatar
                  name={userName}
                  userId={user.id}
                  avatarUrl={avatarUrl}
                  size="md"
                  alt={userName}
                  className="size-7 rounded-lg"
                />
                {updateAvailable ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary shadow-[0_0_0_2px_var(--background)]"
                    aria-hidden="true"
                  />
                ) : null}
              </span>
              <span className="rail-label flex min-w-0 flex-1 flex-col text-left leading-tight">
                <span className="truncate text-[13px] font-semibold text-highlighted">
                  {userName}
                </span>
                <span className="truncate text-[11px] font-medium text-muted">
                  {isPro ? "Pro plan" : "Free plan"}
                </span>
              </span>
            </button>
          ) : (
            <button
              type="button"
              className={cn(
                "group relative flex size-8 items-center justify-center overflow-hidden rounded-full border border-default bg-default text-[11px] font-semibold text-highlighted transition-colors hover:border-ring hover:bg-elevated focus-visible:border-ring focus-visible:bg-elevated active:scale-95",
                shellFocusRingClass,
              )}
              aria-label={`Account menu for ${userName}`}
              title={userName}
            >
              <AgencyMemberAvatar
                name={userName}
                userId={user.id}
                avatarUrl={avatarUrl}
                size="md"
                alt={userName}
                className="size-full rounded-full"
              />
              {updateAvailable || isPro ? (
                <span
                  className="absolute right-[0.35rem] top-[0.35rem] size-[0.3rem] rounded-full bg-primary shadow-[0_0_0_2px_var(--background)]"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-52">
          <DropdownMenuItem asChild>
            <Link to="/agency/me">
              <UserRound className="size-4" aria-hidden />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/agency/me?focus=alerts">
              <Bell className="size-4" aria-hidden />
              Alerts
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
            <Settings className="size-4" aria-hidden />
            Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
