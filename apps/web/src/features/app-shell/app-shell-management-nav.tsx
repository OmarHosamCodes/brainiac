import { ArrowLeft } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useLocation } from "@/lib/navigation";

import { useAppShellStore } from "@/features/app-shell/app-shell-store";
import {
  shellRailIconClass,
  shellRailLinkActiveClass,
  shellRailLinkClass,
} from "@/features/app-shell/app-shell-ui";
import {
  AGENCY_MANAGEMENT_PANES,
  agencyManagementHref,
  agencyManagementPaneFromPathname,
  agencyManagementPaneTabId,
} from "@/features/shared/agency-management-sections";
import { agencySegmentFromPathname } from "@/features/shared/agency-segments";
import { LucideIcon } from "@/lib/lucide-icon";
import { cn } from "@/lib/utils";

type AppShellManagementNavProps = {
  onNavigate?: () => void;
};

/** Sync Management rail drill-in with Agency segment URL transitions. */
export function useAgencyManagementRailSync() {
  const location = useLocation();
  const setManagementNavOpen = useAppShellStore((s) => s.setManagementNavOpen);
  const prevSegmentRef = useRef<string | null>(null);

  const currentSegment = agencySegmentFromPathname(location.pathname);

  useEffect(() => {
    const prev = prevSegmentRef.current;
    prevSegmentRef.current = currentSegment;
    if (currentSegment === "management" && prev !== "management") {
      setManagementNavOpen(true);
    } else if (currentSegment !== "management") {
      setManagementNavOpen(false);
    }
  }, [currentSegment, setManagementNavOpen]);
}

/** Full-rail Management list: Back + panes (replaces Canvas / Agency while drilled in). */
export function AppShellManagementNav({ onNavigate }: AppShellManagementNavProps) {
  const location = useLocation();
  const setManagementNavOpen = useAppShellStore((s) => s.setManagementNavOpen);
  const currentManagePane = agencyManagementPaneFromPathname(location.pathname);

  return (
    <div className="flex min-h-0 flex-col gap-0.5" role="group" aria-label="Management sections">
      <button
        type="button"
        className={cn(
          shellRailLinkClass,
          "app-shell__rail-back text-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
        title="Back to Agency"
        aria-label="Back to Agency"
        onClick={() => {
          setManagementNavOpen(false);
          onNavigate?.();
        }}
      >
        <ArrowLeft className={cn(shellRailIconClass, "rail-icon")} aria-hidden />
        <span className="rail-label">Agency</span>
      </button>

      {AGENCY_MANAGEMENT_PANES.map((pane) => {
        const selected = currentManagePane === pane.id;
        return (
          <Link
            key={pane.id}
            id={agencyManagementPaneTabId(pane.id)}
            to={agencyManagementHref(pane.id)}
            title={pane.label}
            className={cn(shellRailLinkClass, selected && shellRailLinkActiveClass)}
            aria-current={selected ? "page" : undefined}
            onClick={onNavigate}
          >
            <LucideIcon name={pane.icon} className={cn(shellRailIconClass, "rail-icon")} />
            <span className="rail-label">{pane.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
