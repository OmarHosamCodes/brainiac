import { useAgencyReportCreatorSurface } from "../hooks/use-agency-report-creator-surface";
import { AgencyReportCreatorSurfaceView } from "../agency-report-creator-surface-view";
import { AgencyReportActivityMenu } from "../agency-report-activity-menu";

export type AgencyReportCreatorSurfaceContainerProps = {
  teamId: string;
};

export function AgencyReportCreatorSurfaceContainer({
  teamId,
}: AgencyReportCreatorSurfaceContainerProps) {
  const vm = useAgencyReportCreatorSurface({ teamId });
  const activityMenu = vm.reportId ? (
    <AgencyReportActivityMenu teamId={teamId} reportId={vm.reportId} align="end" />
  ) : null;

  return <AgencyReportCreatorSurfaceView vm={vm} activityMenu={activityMenu} />;
}
