import { AgencyClientDetail } from "@/features/clients/agency-client-detail";
import { AgencyClientsTable } from "@/features/clients/agency-clients-table";
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
  selectedClientId: string;
  onSelectProject: (projectId: string) => void;
  onSelectClient: (clientId: string) => void;
  onSelectMember: (userId: string) => void;
  onCloseProject: () => void;
  onCloseClient: () => void;
};

export function AgencySegmentBody({
  segment,
  teamId,
  selectedProjectId,
  selectedClientId,
  onSelectProject,
  onSelectClient,
  onSelectMember,
  onCloseProject,
  onCloseClient,
}: AgencySegmentBodyProps) {
  const surfaceFilters = useAgencySegmentSurfaceFilters();

  if (segment === "dashboard" && surfaceFilters.kind === "timeRange") {
    return (
      <AgencyDashboardSurface
        teamId={teamId}
        filters={surfaceFilters.applied}
        onSelectProject={onSelectProject}
        onSelectClient={onSelectClient}
        onSelectMember={onSelectMember}
      />
    );
  }

  if (segment === "reports" && surfaceFilters.kind === "timeRange") {
    return <AgencyReportsSurface teamId={teamId} filters={surfaceFilters.applied} />;
  }

  if (segment === "clients") {
    if (selectedClientId) {
      return (
        <AgencyClientDetail
          teamId={teamId}
          clientId={selectedClientId}
          onBack={onCloseClient}
          onSelectProject={onSelectProject}
        />
      );
    }
    if (surfaceFilters.kind === "list") {
      return (
        <AgencyClientsTable
          teamId={teamId}
          filters={surfaceFilters.applied}
          onSelect={onSelectClient}
        />
      );
    }
  }

  if (segment === "projects") {
    if (selectedProjectId) {
      return (
        <AgencyProjectDetail
          teamId={teamId}
          projectId={selectedProjectId}
          onBack={onCloseProject}
          onSelectClient={onSelectClient}
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
