import {
  BarChart3,
  BrainCircuit,
  Briefcase,
  Building2,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AppShellAccountMenu } from "@/components/app-shell-account-menu";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useTheme } from "@/stores/theme";
import { useAppShellStore, useHasContextContent, useShellMode } from "@/stores/app-shell";
import { APP_NAV_ITEMS, findActiveNavItem } from "@/lib/utils/app-navigation";
import {
  shellBreadcrumbCurrentClass,
  shellBreadcrumbMutedClass,
  shellBreadcrumbSeparatorClass,
  shellBreadcrumbTrailClass,
  shellContextSlotClass,
  shellFocusRingClass,
  shellContextDividerClass,
  shellContentInClass,
  shellHeaderActionsRegionClass,
  shellHeaderContextRegionClass,
  shellHeaderUtilityActionClass,
  shellHeaderUtilityButtonClass,
  shellMobileNavClass,
  shellMobileNavInnerClass,
  shellMobileNavLinkActiveClass,
  shellMobileNavLinkClass,
  shellMobileNavLinkIdleClass,
  shellRailLinkActiveClass,
  shellRailLinkBaseClass,
  shellTopbarBaseClass,
  shellTopbarExecutionClass,
  shellTopbarSpatialClass,
  shellUtilityClusterClass,
} from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";

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
    description: "Project list under Work",
    to: "/agency?section=work&view=projects",
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
  {
    label: "Settings",
    description: "Workspace preferences",
    to: "/agency?section=settings",
    icon: Settings,
  },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const setCurrentPath = useAppShellStore((s) => s.setCurrentPath);
  const shellMode = useShellMode();
  const hasContextContent = useHasContextContent();
  const [commandOpen, setCommandOpen] = useState(false);

  const { isDark, toggle: toggleTheme } = useTheme();
  const agentDockOpen = useAppShellStore((s) => s.agentDockOpen);
  const agentDockWidth = useAppShellStore((s) => s.agentDockWidth);
  const pageTitle = useAppShellStore((s) => s.pageTitle);
  const setAgentDockOpen = useAppShellStore((s) => s.setAgentDockOpen);
  const toggleAgentDock = useAppShellStore((s) => s.toggleAgentDock);
  const hasPageActions = useAppShellStore((s) => s.actionsOwnerCount > 0);

  const isSpatialMode = shellMode === "spatial";
  const activeNavigationItem = useMemo(
    () => findActiveNavItem(location.pathname),
    [location.pathname],
  );
  const activeNavigationLabel = activeNavigationItem?.label ?? "Workspace";

  const breadcrumbItems = useMemo(() => {
    if (isSpatialMode) return [] as string[];
    const items = [activeNavigationLabel];
    const detailTitle = pageTitle?.trim();
    if (detailTitle && detailTitle !== activeNavigationLabel) {
      items.push(detailTitle);
    }
    return items;
  }, [activeNavigationLabel, isSpatialMode, pageTitle]);

  const showBreadcrumbs = !isSpatialMode && breadcrumbItems.length > 0 && !hasContextContent;

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
        } as React.CSSProperties
      }
    >
      <aside
        className="app-shell__rail hidden border-r border-default bg-muted md:flex"
        aria-label="Main navigation"
      >
        <div className="flex flex-1 flex-col items-center gap-4 py-4">
          <Link
            to="/dashboard"
            className={cn(
              shellRailLinkBaseClass,
              shellFocusRingClass,
              "border border-default bg-default text-highlighted hover:bg-elevated",
            )}
            aria-label="Open dashboard"
            title="Dashboard"
          >
            <BrainCircuit className="size-5" />
          </Link>

          <button
            type="button"
            className={cn(shellRailLinkBaseClass, shellFocusRingClass, "border border-transparent")}
            aria-label="Search navigation"
            title="Search"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="size-4.5" />
          </button>

          <nav className="flex flex-1 flex-col items-center gap-2" aria-label="Sections">
            {APP_NAV_ITEMS.map((item) => {
              const Icon = NAV_ICONS[item.to as keyof typeof NAV_ICONS] ?? LayoutDashboard;
              const active = item.matches(location.pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    shellRailLinkBaseClass,
                    shellFocusRingClass,
                    active ? shellRailLinkActiveClass : "border border-transparent",
                  )}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                >
                  <Icon className="size-4.5" />
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

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

      <header
        className={cn(
          shellTopbarBaseClass,
          isSpatialMode ? shellTopbarSpatialClass : shellTopbarExecutionClass,
          hasContextContent ? "app-shell__topbar--owned" : "",
        )}
        role="banner"
        aria-label="Application header"
      >
        <div className={shellHeaderContextRegionClass}>
          <div id="app-shell-context" className={shellContextSlotClass} />
          {showBreadcrumbs ? (
            <nav
              key={`${location.pathname}-${pageTitle ?? ""}`}
              className={cn("hidden min-w-0 md:flex", shellContentInClass)}
              aria-label="Breadcrumb"
            >
              <ol className={shellBreadcrumbTrailClass}>
                {breadcrumbItems.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "truncate whitespace-nowrap",
                        index === breadcrumbItems.length - 1
                          ? shellBreadcrumbCurrentClass
                          : shellBreadcrumbMutedClass,
                      )}
                    >
                      {item}
                    </span>
                    {index < breadcrumbItems.length - 1 ? (
                      <span className={shellBreadcrumbSeparatorClass} aria-hidden="true">
                        /
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
        </div>

        <div className={shellUtilityClusterClass}>
          <div id="app-shell-actions" className={shellHeaderActionsRegionClass} />
          {hasPageActions ? <span className={shellContextDividerClass} aria-hidden="true" /> : null}
          <AppShellAccountMenu />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={shellHeaderUtilityButtonClass}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button
            type="button"
            variant={agentDockOpen ? "secondary" : "ghost"}
            size="sm"
            className={shellHeaderUtilityActionClass}
            aria-label={agentDockOpen ? "Close agent dock" : "Open agent dock"}
            aria-keyshortcuts="Control+J Meta+J"
            onClick={() => setAgentDockOpen(!agentDockOpen)}
          >
            {agentDockOpen ? (
              <PanelRightClose className="size-4" />
            ) : (
              <PanelRightOpen className="size-4" />
            )}
            <span className="hidden sm:inline">{agentDockOpen ? "Close" : "Agent"}</span>
          </Button>
        </div>
      </header>

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
