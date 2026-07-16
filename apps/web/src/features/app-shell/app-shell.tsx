import { Briefcase, LayoutDashboard } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import { AppShellRail } from "@/features/app-shell/app-shell-rail";
import { AppShellTopbar } from "@/features/app-shell/app-shell-topbar";
import { LogoLoader } from "@/features/app-shell/components/logo-loader";
import { useAppUpdateStore } from "@/features/app-shell/app-update-store";
import { useAppUpdateWatcher } from "@/features/app-shell/hooks/use-app-update-watcher";
import {
  APP_SHELL_RAIL_WIDTH_COLLAPSED,
  APP_SHELL_RAIL_WIDTH_EXPANDED,
  useAppShellStore,
  useShellMode,
} from "@/features/app-shell/app-shell-store";
import { APP_NAV_ITEMS } from "@/features/app-shell/app-navigation";
import {
  shellMobileNavClass,
  shellMobileNavInnerClass,
  shellMobileNavLinkActiveClass,
  shellMobileNavLinkClass,
  shellMobileNavLinkIdleClass,
} from "@/features/app-shell/app-shell-ui";
import { useAgencyTrackingFavicon } from "@/features/time-tracking/hooks/use-agency-time-tracker";
import { useAgencyActiveTimerQuery } from "@/features/shared/agency-queries";
import { cn } from "@/lib/utils";
import { useCurrentAgencyTeamStore } from "@/features/time-tracking/stores/agency-timer";

const NAV_ICONS = {
  "/dashboard": LayoutDashboard,
  "/agency": Briefcase,
} as const;

export function AppShell({ children }: { children: ReactNode }) {
  const agencyTeamId = useCurrentAgencyTeamStore((s) => s.currentAgencyTeamId) ?? "";
  const activeTimer = useAgencyActiveTimerQuery(agencyTeamId).data?.timer ?? null;
  useAgencyTrackingFavicon(Boolean(activeTimer));
  useAppUpdateWatcher();
  const isRefreshing = useAppUpdateStore((s) => s.isRefreshing);

  const location = useLocation();
  const setCurrentPath = useAppShellStore((s) => s.setCurrentPath);
  const shellMode = useShellMode();

  const agentDockOpen = useAppShellStore((s) => s.agentDockOpen);
  const agentDockWidth = useAppShellStore((s) => s.agentDockWidth);
  const railExpanded = useAppShellStore((s) => s.railExpanded);
  const setAgentDockOpen = useAppShellStore((s) => s.setAgentDockOpen);
  const toggleAgentDock = useAppShellStore((s) => s.toggleAgentDock);

  const isSpatialMode = shellMode === "spatial";

  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location.pathname, setCurrentPath]);

  useEffect(() => {
    function handleShellShortcuts(event: KeyboardEvent) {
      const isMac = /mac|iphone|ipad/i.test(navigator.platform);
      const modifier = isMac ? event.metaKey : event.ctrlKey;
      if (!modifier || event.shiftKey || event.altKey) return;
      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        toggleAgentDock();
      }
    }

    window.addEventListener("keydown", handleShellShortcuts);
    return () => window.removeEventListener("keydown", handleShellShortcuts);
  }, [toggleAgentDock]);

  return (
    <div
      className={cn(
        "app-shell bg-default text-default",
        isSpatialMode ? "app-shell--spatial" : "app-shell--execution",
      )}
      style={
        {
          "--app-shell-dock-width": agentDockOpen ? `${agentDockWidth}px` : "0px",
          "--app-shell-rail-width": railExpanded
            ? APP_SHELL_RAIL_WIDTH_EXPANDED
            : APP_SHELL_RAIL_WIDTH_COLLAPSED,
        } as React.CSSProperties
      }
    >
      <AppShellRail />

      <AppShellTopbar />

      {agentDockOpen ? (
        <div
          className="app-shell__mobile-backdrop bg-inverted/30 md:hidden"
          aria-hidden="true"
          onClick={() => setAgentDockOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "app-shell__dock border-l border-default bg-default",
          agentDockOpen ? "app-shell__dock--open" : "app-shell__dock--closed",
        )}
        aria-hidden={!agentDockOpen}
        role="complementary"
        aria-label="Agent panel"
      >
        <div className="app-shell__dock-inner">
          <div id="app-shell-dock-content" className="min-h-0 flex-1" />
        </div>
      </aside>

      <nav className={shellMobileNavClass} aria-label="Mobile navigation">
        <div className={shellMobileNavInnerClass}>
          {APP_NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.to as keyof typeof NAV_ICONS] ?? LayoutDashboard;
            const active = item.matches(location.pathname);
            return (
              <Link
                key={`mobile-${item.to}`}
                to={item.to}
                className={cn(
                  shellMobileNavLinkClass,
                  active ? shellMobileNavLinkActiveClass : shellMobileNavLinkIdleClass,
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="app-shell__main">{children}</main>
      {isRefreshing ? <LogoLoader label="Updating" /> : null}
    </div>
  );
}
