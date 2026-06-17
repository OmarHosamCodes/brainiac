import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { AgencySettingsColorsPane } from "@/components/agency/settings/agency-settings-colors-pane";
import { AgencySettingsIntegrationsPane } from "@/components/agency/settings/agency-settings-integrations-pane";
import { AgencySettingsRatesPane } from "@/components/agency/settings/agency-settings-rates-pane";
import { AgencySettingsTenurePane } from "@/components/agency/settings/agency-settings-tenure-pane";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AGENCY_SETTINGS_PANES,
  isAgencySettingsPaneId,
  type AgencySettingsPaneId,
} from "@/lib/agency-settings-sections";
import { LucideIcon } from "@/lib/lucide-icon";

type AgencySettingsSurfaceProps = {
  teamId: string;
};

export function AgencySettingsSurface({ teamId }: AgencySettingsSurfaceProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const paneFromRoute: AgencySettingsPaneId = isAgencySettingsPaneId(searchParams.get("pane"))
    ? (searchParams.get("pane") as AgencySettingsPaneId)
    : "rates";

  const activePane = paneFromRoute;

  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "settings" && !isAgencySettingsPaneId(searchParams.get("pane"))) {
      const next = new URLSearchParams(searchParams);
      next.set("pane", "rates");
      setSearchParams(next, { replace: true });
      return;
    }
    if (section !== "settings" && searchParams.get("pane")) {
      const next = new URLSearchParams(searchParams);
      next.delete("pane");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  function setActivePane(nextPane: AgencySettingsPaneId) {
    const next = new URLSearchParams(searchParams);
    next.set("pane", nextPane);
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Tabs
        value={activePane}
        onValueChange={(value) => {
          if (isAgencySettingsPaneId(value)) setActivePane(value);
        }}
      >
        <TabsList>
          {AGENCY_SETTINGS_PANES.map((pane) => (
            <TabsTrigger key={pane.id} value={pane.id}>
              <LucideIcon name={pane.icon} className="size-3.5" />
              <span>{pane.label}</span>
              {pane.status === "soon" ? (
                <Badge variant="secondary" className="ml-1 rounded-full px-1.5 py-0 text-[10px]">
                  Soon
                </Badge>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="min-h-0 flex-1 pb-4">
          <TabsContent value="rates">
            <AgencySettingsRatesPane teamId={teamId} active={activePane === "rates"} />
          </TabsContent>
          <TabsContent value="tenure">
            <AgencySettingsTenurePane teamId={teamId} active={activePane === "tenure"} />
          </TabsContent>
          <TabsContent value="integrations">
            <AgencySettingsIntegrationsPane teamId={teamId} active={activePane === "integrations"} />
          </TabsContent>
          <TabsContent value="colors">
            <AgencySettingsColorsPane />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
