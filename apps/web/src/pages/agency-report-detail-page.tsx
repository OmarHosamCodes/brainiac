import { AgencyReportCreatorSurface } from "@/features/reports/creator/agency-report-creator-surface";
import { useTeamStore } from "@/features/team/team-store";

export function AgencyReportDetailPage() {
  const teamId = useTeamStore((s) => s.selectedTeamId);
  return <AgencyReportCreatorSurface teamId={teamId} />;
}
