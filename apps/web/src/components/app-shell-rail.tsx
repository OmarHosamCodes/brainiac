import {
  Briefcase,
  CreditCard,
  LayoutDashboard,
  Moon,
  Search,
  Settings,
  ShoppingBag,
  Sun,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { AppShellAccountMenu } from "@/components/app-shell-account-menu";
import { AppShellRailToggle } from "@/components/app-shell-rail-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/stores/theme";
import { useAppShellStore } from "@/stores/app-shell";
import { APP_NAV_ITEMS } from "@/lib/utils/app-navigation";
import {
  shellFocusRingClass,
  shellRailExpandedLinkActiveClass,
  shellRailExpandedLinkClass,
  shellRailFooterClass,
  shellRailIconClass,
  shellRailLinkActiveClass,
  shellRailLinkBaseClass,
} from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";

const NAV_ICONS = {
  "/dashboard": LayoutDashboard,
  "/agency": Briefcase,
  "/marketplace": ShoppingBag,
  "/billing": CreditCard,
} as const;

type AppShellRailProps = {
  onOpenSearch: () => void;
};

export function AppShellRail({ onOpenSearch }: AppShellRailProps) {
  const location = useLocation();
  const railExpanded = useAppShellStore((s) => s.railExpanded);
  const toggleRail = useAppShellStore((s) => s.toggleRail);
  const { isDark, toggle: toggleTheme } = useTheme();

  return (
    <aside
      className={cn(
        "app-shell__rail hidden flex-col border-r border-default bg-default md:flex",
        railExpanded ? "app-shell__rail--expanded" : "app-shell__rail--collapsed",
      )}
      aria-label="Main navigation"
      aria-expanded={railExpanded}
    >
      <div
        className={cn(
          "app-shell__rail-inner flex min-h-0 flex-1 flex-col gap-1.5 py-2.5",
          railExpanded ? "px-2" : "items-center px-1",
        )}
      >
        <div
          className={cn(
            "flex w-full items-center gap-2",
            railExpanded ? "px-0.5" : "justify-center",
          )}
        >
          <AppShellRailToggle expanded={railExpanded} onClick={toggleRail} />
          <span
            className={cn(
              "app-shell__rail-label truncate text-[13px] font-semibold text-highlighted",
              !railExpanded && "sr-only",
            )}
          >
            Brainiac
          </span>
        </div>

        <button
          type="button"
          className={cn(
            railExpanded ? shellRailExpandedLinkClass : shellRailLinkBaseClass,
            shellFocusRingClass,
            "border border-transparent",
            railExpanded ? "text-left" : "",
          )}
          aria-label="Search navigation"
          title={railExpanded ? undefined : "Search"}
          onClick={onOpenSearch}
        >
          <Search className={shellRailIconClass} />
          <span
            className={cn("app-shell__rail-label truncate", !railExpanded && "sr-only")}
          >
            Search
          </span>
        </button>

        <nav
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-0.5",
            railExpanded ? "w-full" : "items-center",
          )}
          aria-label="Sections"
        >
          {APP_NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.to as keyof typeof NAV_ICONS] ?? LayoutDashboard;
            const active = item.matches(location.pathname);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  railExpanded ? shellRailExpandedLinkClass : shellRailLinkBaseClass,
                  shellFocusRingClass,
                  active
                    ? railExpanded
                      ? shellRailExpandedLinkActiveClass
                      : shellRailLinkActiveClass
                    : "border border-transparent",
                )}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                title={railExpanded ? undefined : item.label}
              >
                <Icon className={shellRailIconClass} />
                <span
                  className={cn("app-shell__rail-label truncate", !railExpanded && "sr-only")}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            shellRailFooterClass,
            railExpanded ? "px-0.5" : "items-center",
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  railExpanded ? shellRailExpandedLinkClass : shellRailLinkBaseClass,
                  shellFocusRingClass,
                  "border border-transparent",
                  railExpanded ? "text-left" : "",
                )}
                aria-label="Settings"
                title={railExpanded ? undefined : "Settings"}
              >
                <Settings className={shellRailIconClass} />
                <span
                  className={cn("app-shell__rail-label truncate", !railExpanded && "sr-only")}
                >
                  Settings
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-52">
              <DropdownMenuItem onSelect={toggleTheme}>
                {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {isDark ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/billing">
                  <CreditCard className="size-4" />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/agency?section=settings">
                  <Settings className="size-4" />
                  Agency settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AppShellAccountMenu variant="rail" expanded={railExpanded} />
        </div>
      </div>
    </aside>
  );
}
