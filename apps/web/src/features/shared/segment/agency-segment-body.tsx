import { AgencyClientsSurface } from "@/features/clients/agency-clients-surface";
import { AgencyDashboardSurface } from "@/features/dashboard/agency-dashboard-surface";
import { AgencyProjectDetail } from "@/features/projects/agency-project-detail";
import { AgencyProjectsTable } from "@/features/projects/agency-projects-table";
import { AgencyReportsSurface } from "@/features/reports/agency-reports-surface";
import type { AgencySegmentId } from "@/features/shared/agency-segments";
import { useAgencySegmentSurfaceFilters } from "@/features/shared/agency-segment-filters";

type AgencySegmentBodyProps = {
  segment: AgencySegmentId;
  teamId: string;
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCloseProject: () => void;
};

export function AgencySegmentBody({
  segment,
  teamId,
  selectedProjectId,
  onSelectProject,
  onCloseProject,
}: AgencySegmentBodyProps) {
  const surfaceFilters = useAgencySegmentSurfaceFilters();

  if (segment === "dashboard" && surfaceFilters.kind === "timeRange") {
    return <AgencyDashboardSurface teamId={teamId} filters={surfaceFilters.applied} />;
  }

  if (segment === "reports" && surfaceFilters.kind === "timeRange") {
    return <AgencyReportsSurface teamId={teamId} filters={surfaceFilters.applied} />;
  }

  if (segment === "clients" && surfaceFilters.kind === "list") {
    return <AgencyClientsSurface teamId={teamId} filters={surfaceFilters.applied} />;
  }

  if (segment === "projects") {
    if (selectedProjectId) {
      return (
        <AgencyProjectDetail
          teamId={teamId}
          projectId={selectedProjectId}
          onBack={onCloseProject}
        />
      );
    }
    if (surfaceFilters.kind === "list") {
      return (
        <AgencyProjectsTable
          teamId={teamId}
          filters={surfaceFilters.applied}
          onSelect={onSelectProject}
        />
      );
    }
  }

  return null;
}
