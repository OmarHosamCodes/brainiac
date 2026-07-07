import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { AgencyProjectCreateDialog } from "@/components/agency/agency-project-create-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { orpc } from "@/lib/orpc";
import { selectIsClientMutationPending, useAgencyOpsStore } from "@/stores/agency-ops";

type AgencyProjectManagerProps = {
  teamId: string;
};

export function AgencyProjectManager({ teamId }: AgencyProjectManagerProps) {
  const agencyOps = useAgencyOpsStore();
  const isClientMutationPending = useAgencyOpsStore(selectIsClientMutationPending);

  const [selectedClientId, setSelectedClientId] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  useEffect(() => {
    setSelectedClientId("");
  }, [teamId]);

  const clientsQuery = useQuery({
    ...orpc.agencyOps.clients.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  const projectsQuery = useQuery({
    ...orpc.agencyOps.projects.list.queryOptions({
      input: { teamId, clientId: selectedClientId || undefined },
    }),
    enabled: Boolean(teamId),
  });

  const clientsQueryKey = orpc.agencyOps.clients.list.queryOptions({ input: { teamId } }).queryKey;
  const projectsQueryKey = orpc.agencyOps.projects.list.queryOptions({
    input: { teamId, clientId: selectedClientId || undefined },
  }).queryKey;

  useEffect(() => {
    if (!teamId) return;
    agencyOps.registerClientsQuery({ queryKey: clientsQueryKey, teamId });
    return () => agencyOps.unregisterClientsQuery(clientsQueryKey);
  }, [teamId, clientsQueryKey, agencyOps]);

  useEffect(() => {
    if (!teamId) return;
    agencyOps.registerProjectsQuery({
      queryKey: projectsQueryKey,
      teamId,
      clientId: selectedClientId || undefined,
    });
    return () => agencyOps.unregisterProjectsQuery(projectsQueryKey);
  }, [teamId, selectedClientId, projectsQueryKey, agencyOps]);

  const clients = clientsQuery.data?.items ?? [];
  const projects = projectsQuery.data?.items ?? [];
  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;

  async function createClient() {
    const name = newClientName.trim();
    if (!name || !teamId) return;
    setNewClientName("");
    await agencyOps.createClient(
      { teamId, name },
      { onSuccess: (clientId) => setSelectedClientId(clientId) },
    );
  }

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
                  className={[
                    "w-full rounded-lg border border-default bg-elevated/50 px-3 py-2 text-left text-sm transition-colors hover:bg-elevated",
                    selectedClientId === client.id ? "border-primary/50 bg-primary/10" : "",
                  ].join(" ")}
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
