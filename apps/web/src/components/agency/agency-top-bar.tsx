import type { AgencySyncState } from "@/lib/queries/agency-sync";
import type { AgencySegmentId } from "@/lib/agency-segments";

import { AgencyTopBarNav } from "./agency-top-bar-nav";

type AgencyTopBarProps = {
  segment: AgencySegmentId;
  teamId: string;
  teams: Array<{ id: string; name: string }>;
  syncState?: AgencySyncState;
  onSegmentChange: (segment: AgencySegmentId) => void;
  onTeamIdChange: (teamId: string) => void;
  actions?: React.ReactNode;
};

export function AgencyTopBar({
  segment,
  teamId,
  teams,
  syncState,
  onSegmentChange,
  onTeamIdChange,
  actions,
}: AgencyTopBarProps) {
  return (
    <div className="agency-topbar space-y-2 border-b border-default pb-3">
      <AgencyTopBarNav
        segment={segment}
        teamId={teamId}
        teams={teams}
        syncState={syncState}
        onSegmentChange={onSegmentChange}
        onTeamIdChange={onTeamIdChange}
      />
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
