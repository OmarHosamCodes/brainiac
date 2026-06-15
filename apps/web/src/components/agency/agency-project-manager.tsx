import { useQuery } from "@tanstack/react-query";
import { Tags, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { orpc } from "@/lib/orpc";
import {
  selectIsClientMutationPending,
  selectIsProjectMutationPending,
  selectIsTagMutationPending,
  useAgencyOpsStore,
} from "@/stores/agency-ops";

type AgencyProjectManagerProps = {
  teamId: string;
};

export function AgencyProjectManager({ teamId }: AgencyProjectManagerProps) {
  const agencyOps = useAgencyOpsStore();
  const isClientMutationPending = useAgencyOpsStore(selectIsClientMutationPending);
  const isProjectMutationPending = useAgencyOpsStore(selectIsProjectMutationPending);
  const isTagMutationPending = useAgencyOpsStore(selectIsTagMutationPending);
  const deletingTagIds = useAgencyOpsStore((s) => s.deletingTagIds);

  const [selectedClientId, setSelectedClientId] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newTagName, setNewTagName] = useState("");

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

  const tagsQuery = useQuery({
    ...orpc.agencyOps.tags.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  const clientsQueryKey = orpc.agencyOps.clients.list.queryOptions({ input: { teamId } }).queryKey;
  const projectsQueryKey = orpc.agencyOps.projects.list.queryOptions({
    input: { teamId, clientId: selectedClientId || undefined },
  }).queryKey;
  const tagsQueryKey = orpc.agencyOps.tags.list.queryOptions({ input: { teamId } }).queryKey;

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

  useEffect(() => {
    if (!teamId) return;
    agencyOps.registerTagsQuery({ queryKey: tagsQueryKey, teamId });
    return () => agencyOps.unregisterTagsQuery(tagsQueryKey);
  }, [teamId, tagsQueryKey, agencyOps]);

  const clients = clientsQuery.data?.items ?? [];
  const projects = projectsQuery.data?.items ?? [];
  const tags = tagsQuery.data?.items ?? [];
  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;

  async function createClient() {
    const name = newClientName.trim();
    if (!name || !teamId) return;
    setNewClientName("");
    await agencyOps.createClient({ teamId, name }, { onSuccess: (clientId) => setSelectedClientId(clientId) });
  }

  async function createProject() {
    const name = newProjectName.trim();
    if (!name || !selectedClientId || !teamId) return;
    setNewProjectName("");
    await agencyOps.createProject({
      teamId,
      clientId: selectedClientId,
      clientName: selectedClient?.name ?? "",
      name,
    });
  }

  async function createTag() {
    const name = newTagName.trim();
    if (!name || !teamId) return;
    setNewTagName("");
    await agencyOps.createTag({ teamId, name });
  }

  async function deleteTag(tagId: string) {
    if (!teamId) return;
    const tag = tags.find((t) => t.id === tagId);
    await agencyOps.deleteTag({ teamId, tagId, tagName: tag?.name ?? "" });
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
          <h3 className="mb-4 text-sm font-semibold text-highlighted">
            Projects
            {selectedClient ? (
              <span className="ml-1 text-xs font-normal text-muted">for {selectedClient.name}</span>
            ) : null}
          </h3>
          {selectedClientId ? (
            <div className="mb-4 flex gap-2">
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                disabled={isProjectMutationPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void createProject();
                }}
              />
              <Button
                size="sm"
                disabled={!newProjectName.trim() || isProjectMutationPending}
                onClick={() => void createProject()}
              >
                Add
              </Button>
            </div>
          ) : null}
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
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-muted/30 p-4 text-center">
              <p className="text-xs text-muted">Select a client to see projects</p>
            </div>
          )}
        </Card>
      </div>

      {teamId ? (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Tags className="size-5 text-primary" />
            <div>
              <h3 className="font-semibold text-highlighted">Tags</h3>
              <p className="text-xs text-muted">Organize time entries with team-wide tags.</p>
            </div>
          </div>

          <Card className="mb-4 p-4">
            <div className="flex gap-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name"
                disabled={isTagMutationPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void createTag();
                }}
              />
              <Button
                size="sm"
                disabled={!newTagName.trim() || isTagMutationPending}
                onClick={() => void createTag()}
              >
                Add
              </Button>
            </div>
          </Card>

          {tags.length > 0 ? (
            <Card className="p-4">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm"
                  >
                    <span className="text-highlighted">{tag.name}</span>
                    <button
                      type="button"
                      className="ml-auto text-primary/60 transition-colors hover:text-primary"
                      disabled={deletingTagIds.includes(tag.id)}
                      onClick={() => void deleteTag(tag.id)}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <div className="rounded-2xl border border-dashed border-muted/30 p-4 text-center">
              <p className="text-xs text-muted">
                No tags yet. Add your first tag to start categorizing time entries.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
