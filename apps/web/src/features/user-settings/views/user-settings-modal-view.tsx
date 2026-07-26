import { type ReactNode } from "react";
import {
  CreditCard,
  Loader2,
  LogOut,
  Moon,
  RefreshCw,
  Settings2,
  Sun,
  UserRound,
} from "lucide-react";

import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import type { UserSettingsModalViewModel } from "@/features/user-settings/hooks/use-user-settings-modal-actions";
import type { UserSettingsPane } from "@/features/user-settings/hooks/use-user-settings-modal-state";
import { cn } from "@/lib/utils";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

type UserSettingsModalViewProps = {
  viewModel: UserSettingsModalViewModel;
};

type NavItem = {
  id: UserSettingsPane;
  label: string;
  icon: typeof UserRound;
};

function SettingsRow({
  label,
  children,
  htmlFor,
  description,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div className="min-w-0 shrink-0">
        <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">{children}</div>
    </div>
  );
}

const navItems: NavItem[] = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "preferences", label: "Preferences", icon: Settings2 },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "account", label: "Account", icon: LogOut },
];

export function UserSettingsModalView({ viewModel }: UserSettingsModalViewProps) {
  const {
    open,
    userId,
    userName,
    userEmail,
    avatarUrl,
    pane,
    nameDraft,
    nameDirty,
    savingName,
    uploadingImage,
    signingOut,
    isDark,
    tier,
    isPro,
    updateAvailable,
    isRefreshing,
    onOpenChange,
    onPaneChange,
    onNameDraftChange,
    onSaveName,
    onPickImage,
    onToggleTheme,
    onBillingAction,
    onSignOut,
    onRefresh,
  } = viewModel;

  if (!userId) return null;

  const activePane = navItems.some((item) => item.id === pane) ? pane : "profile";

  const paneTitle =
    activePane === "profile"
      ? "Profile"
      : activePane === "preferences"
        ? "Preferences"
        : activePane === "billing"
          ? "Billing"
          : "Account";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogTitle className="sr-only">User settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage your profile, preferences, billing, and account.
        </DialogDescription>

        <div className="flex h-[min(32rem,85vh)] overflow-hidden">
          <nav
            className="flex w-48 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-muted/30 p-3"
            aria-label="User settings sections"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePane === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                    shellFocusRingClass,
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onPaneChange(item.id)}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain p-6 pr-14">
            <h2 className="text-xl font-semibold tracking-tight text-balance text-foreground">
              {paneTitle}
            </h2>

            {activePane === "profile" ? (
              <div className="mt-6 flex flex-col">
                <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">Profile photo</p>
                    <p className="text-xs text-muted-foreground">
                      Shown in the sidebar and across Orch.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <AgencyMemberAvatar
                      name={userName}
                      userId={userId}
                      avatarUrl={avatarUrl}
                      size="md"
                      alt={userName}
                      className="size-14 rounded-xl"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={uploadingImage}
                      onClick={onPickImage}
                    >
                      {uploadingImage ? <Loader2 className="size-4 animate-spin" /> : null}
                      Change
                    </Button>
                  </div>
                </div>

                <SettingsRow label="Display name" htmlFor="user-display-name">
                  <Input
                    id="user-display-name"
                    value={nameDraft || userName}
                    placeholder="Your name"
                    className={cn("max-w-56", shellFocusRingClass)}
                    onChange={(e) => onNameDraftChange(e.target.value)}
                    onFocus={() => {
                      if (!nameDraft) onNameDraftChange(userName);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && nameDirty) onSaveName();
                    }}
                  />
                  {nameDirty ? (
                    <Button size="sm" disabled={savingName} onClick={onSaveName}>
                      {savingName ? <Loader2 className="size-4 animate-spin" /> : null}
                      Save
                    </Button>
                  ) : null}
                </SettingsRow>

                <SettingsRow label="Email">
                  <span className="truncate text-sm text-muted-foreground">
                    {userEmail || "No email"}
                  </span>
                </SettingsRow>
              </div>
            ) : null}

            {activePane === "preferences" ? (
              <div className="mt-6 flex flex-col">
                <SettingsRow
                  label="Appearance"
                  description={isDark ? "Dark mode is on." : "Light mode is on."}
                >
                  <Button type="button" size="sm" variant="outline" onClick={onToggleTheme}>
                    {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    {isDark ? "Light mode" : "Dark mode"}
                  </Button>
                </SettingsRow>
              </div>
            ) : null}

            {activePane === "billing" ? (
              <div className="mt-6 flex flex-col">
                <SettingsRow label="Plan">
                  <Badge variant={isPro ? "default" : "secondary"}>
                    {tier === "pro" ? "Pro" : "Free"}
                  </Badge>
                </SettingsRow>

                <SettingsRow
                  label="Subscription"
                  description={
                    isPro
                      ? "Manage billing, invoices, and plan changes."
                      : "Unlock Agency Ops and higher workspace limits."
                  }
                >
                  <Button type="button" size="sm" onClick={onBillingAction}>
                    <CreditCard className="size-4" />
                    {isPro ? "Manage subscription" : "Upgrade to Pro"}
                  </Button>
                </SettingsRow>
              </div>
            ) : null}

            {activePane === "account" ? (
              <div className="mt-6 flex flex-col">
                {updateAvailable && !isRefreshing ? (
                  <SettingsRow label="App update" description="A newer version of Orch is ready.">
                    <Button type="button" size="sm" variant="outline" onClick={onRefresh}>
                      <RefreshCw className="size-4 text-primary" />
                      Update now
                    </Button>
                  </SettingsRow>
                ) : null}

                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Sign out</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    End your session on this device.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="mt-3"
                    disabled={signingOut}
                    onClick={onSignOut}
                  >
                    {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut />}
                    Sign out
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
