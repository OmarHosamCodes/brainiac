import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

import { AgencyProjectCreateDialog } from "@/features/projects/agency-project-create-dialog";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { Input } from "@/ui/input";
import { type AgencyProjectManagerViewModel } from "./hooks/use-agency-project-manager";

type AgencyProjectManagerViewProps = {
  viewModel: AgencyProjectManagerViewModel;
};

export function AgencyProjectManagerView({ viewModel }: AgencyProjectManagerViewProps) {
  const {
    teamId,
    selectedClientId,
    newClientName,
    createProjectOpen,
    isClientMutationPending,
    clients,
    projects,
    selectedClient,
    setSelectedClientId,
    setNewClientName,
    setCreateProjectOpen,
    createClient,
  } = viewModel;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-4 text-sm font-semibold text-highlighted">Clients</h3>
          <div className="mb-4 flex gap-2">
            <Input
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Client name"
              disabled={!teamId || isClientMutationPending}
              onKeyDown={(e) => {
                if (e.key === "Enter") void createClient();
              }}
            />
            <Button
              size="sm"
              disabled={!newClientName.trim() || !teamId || isClientMutationPending}
              onClick={() => void createClient()}
            >
              Add
            </Button>
          </div>
          {clients.length > 0 ? (
            <div className="space-y-2">
              {clients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  className={cn(
                    "w-full rounded-lg border border-default bg-elevated/50 px-3 py-2 text-left text-sm transition-colors hover:bg-elevated",
                    selectedClientId === client.id ? "border-primary/50 bg-primary/10" : "",
                  )}
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <p className="font-medium text-highlighted">{client.name}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-muted/30 p-4 text-center">
              <p className="text-xs text-muted">Add your first client to get started</p>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-4 flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-highlighted">
              Projects
              {selectedClient ? (
                <span className="ml-1 text-xs font-normal text-muted">
                  for {selectedClient.name}
                </span>
              ) : null}
            </h3>
            {selectedClientId ? (
              <Button size="sm" onClick={() => setCreateProjectOpen(true)}>
                <Plus />
                New project
              </Button>
            ) : null}
          </div>
          {selectedClientId && projects.length > 0 ? (
            <div className="space-y-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-lg border border-default bg-elevated/50 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-highlighted">{project.name}</p>
                </div>
              ))}
            </div>
          ) : selectedClientId ? (
            <div className="rounded-lg border border-dashed border-muted/30 p-4 text-center">
              <p className="text-xs text-muted">No projects for this client yet</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => setCreateProjectOpen(true)}
              >
                <Plus />
                New project
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-muted/30 p-4 text-center">
              <p className="text-xs text-muted">Select a client to see projects</p>
            </div>
          )}
        </Card>
      </div>

      <AgencyProjectCreateDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        teamId={teamId}
        clients={clients}
        lockClientId={selectedClientId || undefined}
      />
    </div>
  );
}
