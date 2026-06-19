import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { AgencyBillingSurface } from "@/components/agency/agency-billing-surface";
import { AgencyResourcingSurface } from "@/components/agency/agency-resourcing-surface";
import { AgencySettingsRatesPane } from "@/components/agency/settings/agency-settings-rates-pane";
import { AgencySettingsTenurePane } from "@/components/agency/settings/agency-settings-tenure-pane";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AGENCY_MANAGEMENT_PANES,
  isAgencyManagementPaneId,
  type AgencyManagementPaneId,
} from "@/lib/agency-management-sections";
import type { AgencySegmentId } from "@/lib/agency-segments";
import { LucideIcon } from "@/lib/lucide-icon";

type AgencyManagementSurfaceProps = {
  teamId: string;
  onSegmentChange: (segment: AgencySegmentId) => void;
};

export function AgencyManagementSurface({ teamId, onSegmentChange }: AgencyManagementSurfaceProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const paneFromRoute: AgencyManagementPaneId = isAgencyManagementPaneId(searchParams.get("manage"))
    ? (searchParams.get("manage") as AgencyManagementPaneId)
    : "resourcing";

  const activePane = paneFromRoute;

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Tabs
        value={activePane}
        onValueChange={(value) => {
          if (isAgencyManagementPaneId(value)) setActivePane(value);
        }}
      >
        <TabsList className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {AGENCY_MANAGEMENT_PANES.map((pane) => (
            <TabsTrigger key={pane.id} value={pane.id}>
              <LucideIcon name={pane.icon} className="size-3.5" />
              <span>{pane.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="min-h-0 flex-1 pb-4">
          <TabsContent value="resourcing">
            <AgencyResourcingSurface teamId={teamId} onSegmentChange={onSegmentChange} />
          </TabsContent>
          <TabsContent value="invoices">
            <AgencyBillingSurface teamId={teamId} />
          </TabsContent>
          <TabsContent value="rates">
            <AgencySettingsRatesPane teamId={teamId} active={activePane === "rates"} />
          </TabsContent>
          <TabsContent value="tenure">
            <AgencySettingsTenurePane teamId={teamId} active={activePane === "tenure"} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
