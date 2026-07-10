import {
  BarChart3,
  Briefcase,
  Building2,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  ShoppingBag,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AppShellRail } from "@/components/app-shell-rail";
import { AppShellTopbar } from "@/components/app-shell-topbar";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  APP_SHELL_RAIL_WIDTH_COLLAPSED,
  APP_SHELL_RAIL_WIDTH_EXPANDED,
  useAppShellStore,
  useShellMode,
} from "@/stores/app-shell";
import { APP_NAV_ITEMS } from "@/lib/utils/app-navigation";
import {
  shellMobileNavClass,
  shellMobileNavInnerClass,
  shellMobileNavLinkActiveClass,
  shellMobileNavLinkClass,
  shellMobileNavLinkIdleClass,
} from "@/lib/utils/app-shell-ui";
import { useAgencyTrackingFavicon } from "@/lib/agency/work/hooks/use-agency-time-tracker";
import { useAgencyActiveTimerQuery } from "@/lib/queries/agency";
import { cn } from "@/lib/utils";
import { useCurrentAgencyTeamStore } from "@/stores/agency-timer";

const NAV_ICONS = {
  "/dashboard": LayoutDashboard,
  "/agency": Briefcase,
  "/marketplace": ShoppingBag,
  "/billing": CreditCard,
} as const;

const AGENCY_COMMAND_ITEMS = [
  {
    label: "Work",
    description: "Tasks, projects, and time",
    to: "/agency?section=work",
    icon: Briefcase,
  },
  {
    label: "Projects",
    description: "Project list and delivery health",
    to: "/agency?section=projects",
    icon: FolderKanban,
  },
  {
    label: "Clients",
    description: "Clients and contacts",
    to: "/agency?section=clients",
    icon: Building2,
  },
  {
    label: "Reports",
    description: "Hours and breakdowns",
    to: "/agency?section=reports",
    icon: BarChart3,
  },
  {
    label: "Management",
    description: "Resourcing, invoices, rates, tenure",
    to: "/agency?section=management",
    icon: SlidersHorizontal,
  },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const agencyTeamId = useCurrentAgencyTeamStore((s) => s.currentAgencyTeamId) ?? "";
  const activeTimer = useAgencyActiveTimerQuery(agencyTeamId).data?.timer ?? null;
  useAgencyTrackingFavicon(Boolean(activeTimer));

  const location = useLocation();
  const navigate = useNavigate();
  const setCurrentPath = useAppShellStore((s) => s.setCurrentPath);
  const shellMode = useShellMode();
  const [commandOpen, setCommandOpen] = useState(false);

  const agentDockOpen = useAppShellStore((s) => s.agentDockOpen);
  const agentDockWidth = useAppShellStore((s) => s.agentDockWidth);
  const railExpanded = useAppShellStore((s) => s.railExpanded);
  const setAgentDockOpen = useAppShellStore((s) => s.setAgentDockOpen);
  const toggleAgentDock = useAppShellStore((s) => s.toggleAgentDock);

  const isSpatialMode = shellMode === "spatial";

  function runCommand(to: string) {
    setCommandOpen(false);
    navigate(to);
  }

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
      <AppShellRail onOpenSearch={() => setCommandOpen(true)} />

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen} title="Search navigation">
        <Command>
          <CommandInput placeholder="Search Brainiac" />
          <CommandList>
            <CommandEmpty>No matching destination.</CommandEmpty>
            <CommandGroup heading="App">
              {APP_NAV_ITEMS.map((item) => {
                const Icon = NAV_ICONS[item.to as keyof typeof NAV_ICONS] ?? LayoutDashboard;
                return (
                  <CommandItem
                    key={item.to}
                    value={`app ${item.label}`}
                    onSelect={() => runCommand(item.to)}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandGroup heading="Agency">
              {AGENCY_COMMAND_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.to}
                    value={`agency ${item.label} ${item.description}`}
                    onSelect={() => runCommand(item.to)}
                  >
                    <Icon />
                    <div className="min-w-0">
                      <p className="truncate">{item.label}</p>
                      <p className="truncate text-xs text-muted">{item.description}</p>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>

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
    </div>
  );
}
