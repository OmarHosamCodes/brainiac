import { AgencyClientsSurface } from "@/components/agency/agency-clients-surface";
import { AgencyDashboardSurface } from "@/components/agency/agency-dashboard-surface";
import { AgencyProjectDetail } from "@/components/agency/agency-project-detail";
import { AgencyProjectsTable } from "@/components/agency/agency-projects-table";
import { AgencyReportsSurface } from "@/components/agency/agency-reports-surface";
import type { AgencySegmentId } from "@/lib/agency-segments";
import { useAgencySegmentSurfaceFilters } from "@/lib/agency/agency-segment-filters";

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
      return <AgencyProjectsTable teamId={teamId} filters={surfaceFilters.applied} onSelect={onSelectProject} />;
    }
  }

  return null;
}
