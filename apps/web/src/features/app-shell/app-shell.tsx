import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { AppShellTopbar } from "@/features/app-shell/app-shell-topbar";
import { LogoLoader } from "@/features/app-shell/components/logo-loader";
import { useAppUpdateStore } from "@/features/app-shell/app-update-store";
import { useAppUpdateWatcher } from "@/features/app-shell/hooks/use-app-update-watcher";
import { useAppShellStore, useShellMode } from "@/features/app-shell/app-shell-store";
import { useAgencyTrackingFavicon } from "@/features/time-tracking/hooks/use-agency-time-tracker";
import { useAgencyActiveTimerQuery } from "@/features/shared/agency-queries";
import { cn } from "@/lib/utils";
import { useCurrentAgencyTeamStore } from "@/features/time-tracking/stores/agency-timer";

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
  const setAgentDockOpen = useAppShellStore((s) => s.setAgentDockOpen);
  const toggleAgentDock = useAppShellStore((s) => s.toggleAgentDock);
  const toggleCommandPalette = useAppShellStore((s) => s.toggleCommandPalette);

  const isSpatialMode = shellMode === "spatial";

  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location.pathname, setCurrentPath]);

  useEffect(() => {
    function handleShellShortcuts(event: KeyboardEvent) {
      const isMac = /mac|iphone|ipad/i.test(navigator.platform);
      const modifier = isMac ? event.metaKey : event.ctrlKey;
      if (!modifier || event.shiftKey || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === "j") {
        event.preventDefault();
        toggleAgentDock();
        return;
      }
      if (key === "k") {
        event.preventDefault();
        toggleCommandPalette();
      }
    }

    window.addEventListener("keydown", handleShellShortcuts);
    return () => window.removeEventListener("keydown", handleShellShortcuts);
  }, [toggleAgentDock, toggleCommandPalette]);

  return (
    <div
      className={cn(
        "app-shell bg-default text-default",
        isSpatialMode ? "app-shell--spatial" : "app-shell--execution",
      )}
      style={
        {
          "--app-shell-dock-width": agentDockOpen ? `${agentDockWidth}px` : "0px",
        } as React.CSSProperties
      }
    >
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

      <main className="app-shell__main">{children}</main>
      {isRefreshing ? <LogoLoader label="Updating" /> : null}
    </div>
  );
}
