import { useAgencyReportActivityMenu } from "../hooks/use-agency-report-activity-menu";
import { AgencyReportActivityMenuView } from "../agency-report-activity-menu-view";

export type AgencyReportActivityMenuContainerProps = {
  teamId: string;
  reportId: string;
  align?: "start" | "center" | "end";
};

export function AgencyReportActivityMenuContainer({
  teamId,
  reportId,
  align = "start",
}: AgencyReportActivityMenuContainerProps) {
  const vm = useAgencyReportActivityMenu({ teamId, reportId });
  return <AgencyReportActivityMenuView align={align} vm={vm} />;
}
