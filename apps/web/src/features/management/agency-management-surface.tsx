import { useEffect } from "react";
import { useSearchParams } from "@/lib/navigation";

import { AgencyMoneySurface } from "@/features/money/agency-money-surface";
import { AgencyResourcingSurface } from "@/features/resourcing/agency-resourcing-surface";
import { AgencySettingsTenurePane } from "@/features/people/agency-settings-tenure-pane";
import {
  agencyManagementPaneLabel,
  isAgencyManagementPaneId,
  type AgencyManagementPaneId,
} from "@/features/shared/agency-management-sections";

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
    const manage = searchParams.get("manage");
    if (section === "management" && (manage === "invoices" || manage === "billing")) {
      const next = new URLSearchParams(searchParams);
      next.set("manage", "money");
      setSearchParams(next, { replace: true });
      return;
    }
    if (section === "management" && !isAgencyManagementPaneId(manage)) {
      const next = new URLSearchParams(searchParams);
      next.set("manage", "resourcing");
      setSearchParams(next, { replace: true });
      return;
    }
    if (section !== "management" && manage) {
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
        <AgencyMoneySurface teamId={teamId} />
      )}
    </main>
  );
}
