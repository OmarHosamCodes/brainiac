import type { AgencyProject } from "@/features/task-management/agency-work";
import { AgencyWorkSurfaceCreateTaskPopoverView } from "../agency-work-surface-create-task-popover-view";
import { useAgencyWorkSurfaceCreateTaskPopover } from "../hooks/use-agency-work-surface-create-task-popover";
export function AgencyWorkSurfaceCreateTaskPopoverContainer({
  teamId,
  projects,
}: {
  teamId: string;
  projects: Array<Pick<AgencyProject, "id" | "clientName" | "name">>;
}) {
  const vm = useAgencyWorkSurfaceCreateTaskPopover(teamId, projects);
  return <AgencyWorkSurfaceCreateTaskPopoverView {...vm} projects={projects} />;
}
