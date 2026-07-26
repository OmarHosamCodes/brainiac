import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Camera,
  ChevronsUpDown,
  Circle,
  CreditCard,
  Loader2,
  LogIn,
  LogOut,
  Moon,
  RefreshCw,
  Settings,
  Sun,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Skeleton } from "@/ui/skeleton";
import { useAppUpdateStore } from "@/features/app-shell/app-update-store";
import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { useBilling } from "@/features/billing/billing-queries";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/env";
import { getUserAvatarPublicUrl } from "@/lib/user-avatar-url";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useTheme } from "@/stores/theme";

type AppShellAccountMenuProps = {
  /** `icon` round avatar trigger, or a full-width `sidebar` profile row. */
  variant?: "icon" | "sidebar";
};

export function AppShellAccountMenu({ variant = "icon" }: AppShellAccountMenuProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const { tier, isPro, checkout, openPortal } = useBilling();
  const { isDark, toggle: toggleTheme } = useTheme();
  const updateAvailable = useAppUpdateStore((s) => s.updateAvailable);
  const isRefreshing = useAppUpdateStore((s) => s.isRefreshing);
  const beginRefresh = useAppUpdateStore((s) => s.beginRefresh);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const user = session.data?.user;
  const userName = user?.name?.trim() || "Workspace";
  const userEmail = user?.email?.trim();
  const serverUrl = getServerUrl();
  const avatarUrl =
    user?.image && user.id && serverUrl
      ? getUserAvatarPublicUrl({ baseUrl: serverUrl, userId: user.id, storageKey: user.image })
      : null;

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${serverUrl}/uploads/user-avatar`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => ({ error: "Upload failed" }))) as {
          error?: string;
        };
        throw new Error(err.error ?? "Upload failed");
      }

      const { storageKey } = (await response.json()) as { storageKey: string };
      await authClient.updateUser({ image: storageKey });
      toast.success("Avatar updated");
    } catch (error) {
      toast.error("Couldn't update avatar", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function handleSignOut() {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            queryClient.clear();
            toast.success("Signed out successfully");
            navigate("/", { replace: true });
          },
          onError: (error) => {
            toast.error("Sign out failed", {
              description: error.error?.message ?? "Unknown error",
            });
          },
        },
      });
    } catch (error) {
      toast.error("An unexpected error occurred during sign out", {
        description: getErrorMessage(error, "Please try again."),
      });
    }
  }

  if (session.isPending) {
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
            "app-shell__rail-link text-muted transition-colors hover:bg-elevated hover:text-highlighted",
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
                "app-shell__rail-link app-shell__rail-header text-muted transition-colors hover:bg-elevated",
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
              <span className="rail-label flex min-w-0 flex-1 items-center gap-1.5">
                <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
                  <span className="truncate text-[13px] font-semibold text-highlighted">
                    {userName}
                  </span>
                  <span className="truncate text-[11px] font-medium text-muted">
                    {isPro ? "Pro plan" : "Free plan"}
                  </span>
                </span>
                <ChevronsUpDown className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
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

        <DropdownMenuContent
          align="end"
          side={variant === "sidebar" ? "right" : "bottom"}
          className="w-56"
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="truncate font-semibold text-highlighted">{userName}</span>
              {userEmail ? <span className="truncate text-xs text-muted">{userEmail}</span> : null}
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {updateAvailable && !isRefreshing ? (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                void beginRefresh();
              }}
            >
              <RefreshCw className="text-primary" />
              Update available
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuItem disabled>
            {isPro ? <BadgeCheck className="text-primary" /> : <Circle />}
            {tier === "pro" ? "Pro plan" : "Free plan"}
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={toggleTheme}>
            {isDark ? <Sun /> : <Moon />}
            {isDark ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              void (isPro ? openPortal() : checkout());
            }}
          >
            <CreditCard />
            {isPro ? "Manage subscription" : "Upgrade to Pro"}
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link to="/agency?section=management">
              <Settings />
              Agency settings
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={isUploading}
            onSelect={(event) => {
              event.preventDefault();
              fileInputRef.current?.click();
            }}
          >
            {isUploading ? <Loader2 className="animate-spin" /> : <Camera />}
            Update avatar
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            onSelect={() => {
              void handleSignOut();
            }}
          >
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleFileSelect(event)}
      />
    </>
  );
}
