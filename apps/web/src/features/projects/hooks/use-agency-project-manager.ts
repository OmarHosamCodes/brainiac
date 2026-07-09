import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { orpc } from "@/lib/orpc";
import {
  selectIsClientMutationPending,
  useAgencyOpsStore,
} from "@/features/shared/stores/agency-ops";

export type ClientItem = {
  id: string;
  name: string;
};

export type ProjectItem = {
  id: string;
  name: string;
};

export type AgencyProjectManagerViewModel = {
  teamId: string;
  selectedClientId: string;
  newClientName: string;
  createProjectOpen: boolean;
  isClientMutationPending: boolean;
  clients: ClientItem[];
  projects: ProjectItem[];
  selectedClient: ClientItem | null;
  setSelectedClientId: (id: string) => void;
  setNewClientName: (name: string) => void;
  setCreateProjectOpen: (open: boolean) => void;
  createClient: () => Promise<void>;
};

export function useAgencyProjectManager(teamId: string): AgencyProjectManagerViewModel {
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

  const clients = (clientsQuery.data?.items ?? []) as ClientItem[];
  const projects = (projectsQuery.data?.items ?? []) as ProjectItem[];
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

  return {
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
  };
}
