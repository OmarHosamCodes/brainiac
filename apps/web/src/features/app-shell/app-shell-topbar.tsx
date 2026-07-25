import { Menu, Search } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { AppShellAccountMenu } from "@/features/app-shell/app-shell-account-menu";
import {
  APP_SHELL_SUBTITLE_SLOT_ID,
  AppShellTopbarPageCrumb,
  AppShellTopbarSubtitle,
} from "@/features/app-shell/app-shell-breadcrumbs";
import { AppShellCommandPalette } from "@/features/app-shell/app-shell-command-palette";
import { APP_NAV_ITEMS } from "@/features/app-shell/app-navigation";
import { AppShellNotifications } from "@/features/app-shell/app-shell-notifications";
import { AppShellPortal } from "@/features/app-shell/app-shell-portal";
import { BrandMark } from "@/features/app-shell/components/brand-mark";
import { AppShellTeamControl } from "@/features/app-shell/app-shell-team-control";
import { Button } from "@/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/ui/sheet";
import {
  useAppShellStore,
  useHasContextContent,
  useHasSubtitleContent,
  useShellMode,
} from "@/features/app-shell/app-shell-store";
import {
  shellActionsSlotClass,
  shellContextSlotClass,
  shellFocusRingClass,
  shellHeaderCenterRegionClass,
  shellHeaderContextRegionClass,
  shellHeaderUtilityActionClass,
  shellNavLinkActiveClass,
  shellNavLinkClass,
  shellSearchPillClass,
  shellTopbarBaseClass,
  shellTopbarExecutionClass,
  shellTopbarSpatialClass,
  shellUtilityClusterClass,
} from "@/features/app-shell/app-shell-ui";
import { useBilling } from "@/features/billing/billing-queries";
import { cn } from "@/lib/utils";

export { AppShellTopbarPageCrumb, AppShellTopbarSubtitle };

export const APP_SHELL_CONTEXT_SLOT_ID = "app-shell-context";
export const APP_SHELL_ACTIONS_SLOT_ID = "app-shell-actions";
export const APP_SHELL_TRAILING_SLOT_ID = "app-shell-trailing";

/** @deprecated Prefer left-cluster portals; utilities only host notifications + avatar. */
export function AppShellTopbarContext({ children }: { children: ReactNode }) {
  return (
    <AppShellPortal targetId={APP_SHELL_CONTEXT_SLOT_ID}>
      <div className="flex min-w-0 items-center gap-2">{children}</div>
    </AppShellPortal>
  );
}

/** @deprecated Utilities no longer host page actions. */
export function AppShellTopbarActions({ children }: { children: ReactNode }) {
  return (
    <AppShellPortal targetId={APP_SHELL_ACTIONS_SLOT_ID}>
      <div className={shellActionsSlotClass}>{children}</div>
    </AppShellPortal>
  );
}

/** @deprecated Utilities no longer host trailing actions; use shell notifications. */
export function AppShellTopbarTrailing({ children }: { children: ReactNode }) {
  return (
    <AppShellPortal targetId={APP_SHELL_TRAILING_SLOT_ID}>
      <div className={shellActionsSlotClass}>{children}</div>
    </AppShellPortal>
  );
}

export function AppShellTopbarSkeleton() {
  return (
    <header className={cn(shellTopbarBaseClass, shellTopbarExecutionClass)} aria-hidden="true">
      <div className={shellHeaderContextRegionClass}>
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted/50" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted/50" />
      </div>
      <div className={shellUtilityClusterClass}>
        <div className="size-8 animate-pulse rounded-full bg-muted/40" />
        <div className="size-8 animate-pulse rounded-full bg-muted/40" />
      </div>
    </header>
  );
}

function isMacPlatform() {
  return /mac|iphone|ipad/i.test(navigator.platform);
}

export function AppShellTopbar() {
  const location = useLocation();
  const hasContextContent = useHasContextContent();
  const hasSubtitleContent = useHasSubtitleContent();
  const shellMode = useShellMode();
  const setCommandPaletteOpen = useAppShellStore((s) => s.setCommandPaletteOpen);
  const isSpatialMode = shellMode === "spatial";
  const { isPro, checkout, billingQuery } = useBilling();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const showUpgrade = !isPro && !billingQuery.isPending;
  const modKey = isMacPlatform() ? "⌘" : "Ctrl";

  return (
    <>
      <header
        className={cn(
          shellTopbarBaseClass,
          isSpatialMode ? shellTopbarSpatialClass : shellTopbarExecutionClass,
        )}
        role="banner"
        aria-label="Application header"
      >
        <div className={shellHeaderContextRegionClass}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(shellHeaderUtilityActionClass, "md:hidden")}
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="size-4" />
          </Button>

          <Link
            to="/dashboard"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90",
              shellFocusRingClass,
            )}
            aria-label="Orch home"
          >
            <BrandMark className="size-7" />
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Sections">
            {APP_NAV_ITEMS.map((item) => {
              const active = item.matches(location.pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(shellNavLinkClass, active && shellNavLinkActiveClass)}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {hasContextContent ? (
            <div id={APP_SHELL_CONTEXT_SLOT_ID} className={shellContextSlotClass} />
          ) : null}

          {hasSubtitleContent ? (
            <div
              id={APP_SHELL_SUBTITLE_SLOT_ID}
              className="min-w-0 max-w-[min(20rem,42vw)] flex-1 overflow-hidden"
            />
          ) : null}
        </div>

        <div className={shellHeaderCenterRegionClass}>
          <button
            type="button"
            className={shellSearchPillClass}
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="Search"
            aria-keyshortcuts="Control+K Meta+K"
          >
            <Search className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">Search…</span>
            <kbd className="hidden shrink-0 rounded-md border border-default bg-default px-1.5 py-0.5 font-mono text-[10px] font-medium text-dimmed sm:inline">
              {modKey}K
            </kbd>
          </button>
        </div>

        <div className={shellUtilityClusterClass}>
          <AppShellTeamControl />
          <AppShellNotifications />
          <AppShellAccountMenu />
        </div>
      </header>

      <AppShellCommandPalette />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[min(100vw,20rem)] gap-4">
          <SheetHeader>
            <SheetTitle>Orch</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1" aria-label="Sections">
            {APP_NAV_ITEMS.map((item) => {
              const active = item.matches(location.pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    shellNavLinkClass,
                    "w-full justify-start",
                    active && shellNavLinkActiveClass,
                  )}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {showUpgrade ? (
            <Button
              type="button"
              className="w-full rounded-full"
              onClick={() => {
                setMobileNavOpen(false);
                void checkout("pro");
              }}
            >
              Get Pro
            </Button>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
