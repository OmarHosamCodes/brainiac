import { type ReactNode } from "react";
import { CreditCard, Loader2, LogOut, Moon, RefreshCw, Settings2, Sun } from "lucide-react";

import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import type {
  NotificationPreferenceItem,
  NotificationPreferenceType,
  UserSettingsModalViewModel,
} from "@/features/user-settings/hooks/use-user-settings-modal-actions";
import type { UserSettingsPane } from "@/features/user-settings/hooks/use-user-settings-modal-state";
import { cn } from "@/lib/utils";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/ui/dialog";
import { Label } from "@/ui/label";
import { Skeleton } from "@/ui/skeleton";

type UserSettingsModalViewProps = {
  viewModel: UserSettingsModalViewModel;
};

type NavItem = {
  id: UserSettingsPane;
  label: string;
  icon: typeof Settings2;
};

const NOTIFICATION_TYPE_LABELS: Record<NotificationPreferenceType, string> = {
  "task.assigned": "Task assignments",
  "task.message": "Task messages",
  "journey.milestone": "Milestones",
  "timer.activity": "Timer activity",
  "team.digest": "Daily digest",
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
  { id: "preferences", label: "Preferences", icon: Settings2 },
  { id: "billing", label: "Billing", icon: CreditCard },
];

function preferenceLabel(type: NotificationPreferenceType) {
  return NOTIFICATION_TYPE_LABELS[type];
}

export function UserSettingsModalView({ viewModel }: UserSettingsModalViewProps) {
  const {
    open,
    userId,
    pane,
    signingOut,
    isDark,
    tier,
    isPro,
    updateAvailable,
    isRefreshing,
    hasTeam,
    notificationPreferences,
    notificationPreferencesLoading,
    notificationPreferencesSaving,
    onOpenChange,
    onPaneChange,
    onToggleTheme,
    onBillingAction,
    onSignOut,
    onRefresh,
    onTogglePreferenceChannel,
  } = viewModel;

  if (!userId) return null;

  const activePane = navItems.some((item) => item.id === pane) ? pane : "preferences";

  const paneTitle = activePane === "preferences" ? "Preferences" : "Billing";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage your preferences and billing.
        </DialogDescription>

        <div className="flex h-[min(32rem,85vh)] overflow-hidden">
          <nav
            className="flex w-48 shrink-0 flex-col border-r border-border bg-muted/30"
            aria-label="Settings sections"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
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
            </div>

            <div className="shrink-0 border-t border-border p-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={signingOut}
                onClick={onSignOut}
              >
                {signingOut ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogOut className="size-4" />
                )}
                Sign out
              </Button>
            </div>
          </nav>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain p-6 pr-14">
            <h2 className="text-xl font-semibold tracking-tight text-balance text-foreground">
              {paneTitle}
            </h2>

            {activePane === "preferences" ? (
              <div className="mt-6 flex flex-col gap-8">
                <div className="flex flex-col">
                  <SettingsRow
                    label="Appearance"
                    description={isDark ? "Dark mode is on." : "Light mode is on."}
                  >
                    <Button type="button" size="sm" variant="outline" onClick={onToggleTheme}>
                      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                      {isDark ? "Light mode" : "Dark mode"}
                    </Button>
                  </SettingsRow>

                  {updateAvailable && !isRefreshing ? (
                    <SettingsRow label="App update" description="A newer version of Orch is ready.">
                      <Button type="button" size="sm" variant="outline" onClick={onRefresh}>
                        <RefreshCw className="size-4 text-primary" />
                        Update now
                      </Button>
                    </SettingsRow>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Choose which alerts you receive for the selected team.
                    </p>
                  </div>

                  {!hasTeam ? (
                    <p className="text-sm text-muted-foreground">
                      Select a team to manage notification preferences.
                    </p>
                  ) : notificationPreferencesLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-14 w-full rounded-xl" />
                      <Skeleton className="h-14 w-full rounded-xl" />
                      <Skeleton className="h-14 w-full rounded-xl" />
                    </div>
                  ) : notificationPreferences.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No preference types available yet.
                    </p>
                  ) : (
                    notificationPreferences.map((pref: NotificationPreferenceItem) => (
                      <div
                        key={pref.type}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {preferenceLabel(pref.type)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            In-app {pref.inApp ? "on" : "off"} · Push {pref.push ? "on" : "off"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant={pref.inApp ? "secondary" : "ghost"}
                            className="h-7 rounded-full px-2 text-[11px]"
                            disabled={notificationPreferencesSaving}
                            onClick={() => onTogglePreferenceChannel(pref, "inApp")}
                          >
                            In-app
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={pref.push ? "secondary" : "ghost"}
                            className="h-7 rounded-full px-2 text-[11px]"
                            disabled={notificationPreferencesSaving}
                            onClick={() => onTogglePreferenceChannel(pref, "push")}
                          >
                            Push
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
