import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Camera, Circle, CreditCard, Loader2, LogIn, LogOut } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useBilling } from "@/lib/queries/billing";
import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/env";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { shellFocusRingClass, shellRailAvatarClass, shellRailAvatarCollapsedClass, shellRailExpandedLinkClass } from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";

function getInitials(name: string | undefined | null): string {
  const fullName = name?.trim();
  if (!fullName) {
    return "B";
  }

  const parts = fullName.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "B";
}

type AppShellAccountMenuProps = {
  variant?: "topbar" | "rail";
  expanded?: boolean;
};

export function AppShellAccountMenu({
  variant = "topbar",
  expanded = false,
}: AppShellAccountMenuProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const { tier, isPro } = useBilling();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const user = session.data?.user;
  const userName = user?.name?.trim() || "Workspace";
  const userEmail = user?.email?.trim();
  const serverUrl = getServerUrl();
  const avatarUrl =
    user?.image && user.id && serverUrl ? `${serverUrl}/api/user-avatars/${user.id}` : null;
  const initials = getInitials(user?.name);

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
    return (
      <Skeleton
        className={cn(
          "rounded-full",
          variant === "rail" && expanded ? "h-8 w-full" : "size-8",
        )}
      />
    );
  }

  if (!user) {
    if (variant === "rail" && expanded) {
      return (
        <Button
          asChild
          variant="secondary"
          className={cn("h-8 w-full justify-start rounded-full px-2.5 text-[13px]", shellFocusRingClass)}
        >
          <Link to="/login">
            <LogIn className="size-3.5" />
            Sign in
          </Link>
        </Button>
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

  const isRail = variant === "rail";
  const dropdownSide = isRail ? "right" : "bottom";
  const dropdownAlign = isRail ? "end" : "end";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {isRail && expanded ? (
            <button
              type="button"
              className={cn(
                shellRailExpandedLinkClass,
                "border border-transparent text-left text-highlighted",
              )}
              aria-label={`Account menu for ${userName}`}
            >
              <span className={shellRailAvatarClass}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={userName} className="size-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
                {isPro ? (
                  <span
                    className="absolute right-[0.2rem] top-[0.2rem] size-[0.28rem] rounded-full bg-primary shadow-[0_0_0_2px_var(--background)]"
                    aria-hidden="true"
                  />
                ) : null}
              </span>
              <span className="app-shell__rail-label truncate">{userName}</span>
            </button>
          ) : isRail ? (
            <button
              type="button"
              className={cn(shellRailAvatarCollapsedClass, shellFocusRingClass)}
              aria-label={`Account menu for ${userName}`}
              title={userName}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="size-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
              {isPro ? (
                <span
                  className="absolute right-[0.35rem] top-[0.35rem] size-[0.3rem] rounded-full bg-primary shadow-[0_0_0_2px_var(--background)]"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          ) : (
            <button
              type="button"
              className={cn(
                "group relative flex size-8 items-center justify-center overflow-hidden rounded-full border border-default bg-default text-[11px] font-semibold text-highlighted transition-colors hover:border-accented hover:bg-elevated focus-visible:border-accented focus-visible:bg-elevated active:scale-95",
                shellFocusRingClass,
              )}
              aria-label={`Account menu for ${userName}`}
              title={userName}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="size-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
              {isPro ? (
                <span
                  className="absolute right-[0.35rem] top-[0.35rem] size-[0.3rem] rounded-full bg-primary shadow-[0_0_0_2px_var(--background)]"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align={dropdownAlign} side={dropdownSide} className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="truncate font-semibold text-highlighted">{userName}</span>
              {userEmail ? <span className="truncate text-xs text-muted">{userEmail}</span> : null}
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem disabled>
            {isPro ? <BadgeCheck className="text-primary" /> : <Circle />}
            {tier === "pro" ? "Pro plan" : "Free plan"}
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link to="/billing">
              <CreditCard />
              Billing
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
