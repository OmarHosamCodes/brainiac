import { Briefcase, Building2, FolderKanban } from "lucide-react";

import { Button } from "@/components/ui/button";
import { agencyEmptyPanelClass } from "@/lib/utils/agency-ui";

type AgencyWorkSurfaceEmptyViewProps = {
  onGoToClients: () => void;
  onGoToProjects: () => void;
};

export function AgencyWorkSurfaceEmptyView({
  onGoToClients,
  onGoToProjects,
}: AgencyWorkSurfaceEmptyViewProps) {
  return (
    <div className={agencyEmptyPanelClass}>
      <Briefcase className="mx-auto size-7 text-muted" />
      <p className="mt-4 text-sm font-bold text-highlighted">No projects yet.</p>
      <p className="mt-1 text-xs text-muted">
        Go to Clients to add a client, then Projects to create your first project and start
        tracking work and time.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button variant="secondary" size="sm" onClick={onGoToClients}>
          <Building2 className="size-4" />
          Add client
        </Button>
        <Button variant="secondary" size="sm" onClick={onGoToProjects}>
          <FolderKanban className="size-4" />
          New project
        </Button>
      </div>
    </div>
  );
}
