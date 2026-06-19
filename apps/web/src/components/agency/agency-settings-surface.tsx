import { Settings } from "lucide-react";

import { agencyEmptyPanelClass, agencySectionTitleClass } from "@/lib/utils/agency-ui";

type AgencySettingsSurfaceProps = {
  teamId: string;
};

export function AgencySettingsSurface({ teamId: _teamId }: AgencySettingsSurfaceProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pb-4">
      <div>
        <h2 className={agencySectionTitleClass}>Settings</h2>
        <p className="mt-1 text-sm text-muted">
          Team operations now live in Management. Workspace-level preferences stay here.
        </p>
      </div>

      <div className={agencyEmptyPanelClass}>
        <Settings className="mx-auto size-6 text-muted" />
        <p className="mt-3 text-sm font-bold text-highlighted">No visible settings panes</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted">
          Rates and tenure moved to Management. Integrations and colors are hidden from navigation.
        </p>
      </div>
    </div>
  );
}
