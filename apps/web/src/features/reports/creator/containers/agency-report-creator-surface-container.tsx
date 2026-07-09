import { useAgencyReportCreatorSurface } from "../hooks/use-agency-report-creator-surface";
import { AgencyReportCreatorSurfaceView } from "../agency-report-creator-surface-view";

export type AgencyReportCreatorSurfaceContainerProps = {
  teamId: string;
};

export function AgencyReportCreatorSurfaceContainer({
  teamId,
}: AgencyReportCreatorSurfaceContainerProps) {
  const vm = useAgencyReportCreatorSurface({ teamId });
  return <AgencyReportCreatorSurfaceView teamId={teamId} vm={vm} />;
}
