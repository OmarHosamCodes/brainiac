import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { AgencyResourcingSurface } from "@/features/resourcing/agency-resourcing-surface";
import { AgencySettingsTenurePane } from "@/features/resourcing/tenure/agency-settings-tenure-pane";
import {
  AGENCY_MANAGEMENT_HUBS,
  agencyManagementPaneLabel,
  isAgencyManagementPaneId,
  type AgencyManagementPaneId,
} from "@/features/shared/agency-management-sections";
import { agencyLabelClass, agencySectionTitleClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyManagementSurfaceProps = {
  teamId: string;
};

export function AgencyManagementSurface({ teamId }: AgencyManagementSurfaceProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const activePane: AgencyManagementPaneId = isAgencyManagementPaneId(searchParams.get("manage"))
    ? (searchParams.get("manage") as AgencyManagementPaneId)
    : "resourcing";

  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "management" && !isAgencyManagementPaneId(searchParams.get("manage"))) {
      const next = new URLSearchParams(searchParams);
      next.set("manage", "resourcing");
      setSearchParams(next, { replace: true });
      return;
    }
    if (section !== "management" && searchParams.get("manage")) {
      const next = new URLSearchParams(searchParams);
      next.delete("manage");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  function setActivePane(nextPane: AgencyManagementPaneId) {
    const next = new URLSearchParams(searchParams);
    next.set("section", "management");
    next.set("manage", nextPane);
    next.delete("project");
    next.delete("view");
    setSearchParams(next, { replace: true });
  }

  const activeLabel = agencyManagementPaneLabel(activePane);

  return (
    <div className="bg-background flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[13rem_minmax(0,1fr)]">
      <nav
        className={cn(
          "border-border bg-card flex shrink-0 gap-1 overflow-x-auto border-b px-2 py-2",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "md:flex-col md:gap-0.5 md:overflow-y-auto md:overflow-x-hidden md:border-r md:border-b-0 md:px-3 md:py-4",
        )}
        aria-label="Management sections"
      >
        {AGENCY_MANAGEMENT_HUBS.map((hub, hubIndex) => (
          <div
            key={hub.id}
            className={cn(
              "flex shrink-0 items-center gap-1",
              "md:flex-col md:items-stretch md:gap-0.5",
              hubIndex > 0 && "md:mt-3",
            )}
          >
            <div
              className={cn(
                agencyLabelClass,
                "hidden px-2.5 pb-1.5 md:block",
                hubIndex === 0 && "pt-0.5",
              )}
            >
              {hub.label}
            </div>
            {hub.panes.map((pane) => {
              const isActive = pane.id === activePane;
              return (
                <button
                  key={pane.id}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setActivePane(pane.id)}
                  className={cn(
                    "rounded-lg px-2.5 text-start text-sm font-medium whitespace-nowrap",
                    "min-h-9 transition-colors duration-150 ease-out",
                    "md:w-full md:whitespace-normal",
                    shellFocusRingClass,
                    isActive
                      ? "bg-sidebar-primary/10 text-sidebar-primary"
                      : "text-muted hover:bg-elevated hover:text-highlighted",
                  )}
                >
                  {pane.label}
                </button>
              );
            })}
            {hubIndex < AGENCY_MANAGEMENT_HUBS.length - 1 ? (
              <div
                className="bg-border mx-1 hidden h-5 w-px shrink-0 sm:block md:hidden"
                aria-hidden="true"
              />
            ) : null}
          </div>
        ))}
      </nav>

      <main
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto px-5 py-6 sm:px-8 sm:py-7"
        aria-label={activeLabel}
      >
        {activePane === "resourcing" ? (
          <AgencyResourcingSurface teamId={teamId} />
        ) : activePane === "tenure" ? (
          <AgencySettingsTenurePane teamId={teamId} active />
        ) : (
          <h1 className={cn(agencySectionTitleClass, "text-balance")}>{activeLabel}</h1>
        )}
      </main>
    </div>
  );
}
