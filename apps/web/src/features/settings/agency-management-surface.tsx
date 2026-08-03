import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { AgencyResourcingSurface } from "@/features/resourcing/agency-resourcing-surface";
import { AgencySettingsTenurePane } from "@/features/resourcing/tenure/agency-settings-tenure-pane";
import {
  agencyManagementPaneLabel,
  isAgencyManagementPaneId,
  type AgencyManagementPaneId,
} from "@/features/shared/agency-management-sections";
import { agencySectionTitleClass } from "@/features/shared/agency-ui";
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

  const activeLabel = agencyManagementPaneLabel(activePane);

  return (
    <main
      className="bg-background flex min-h-0 min-w-0 flex-1 flex-col overflow-auto px-5 py-6 sm:px-8 sm:py-7"
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
  );
}
