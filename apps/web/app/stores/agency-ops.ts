/**
 * Agency Ops Store — optimistic updates for clients, projects, and tags.
 *
 * Mirrors the snapshot/restore architecture in agency-time-tracking.ts.
 * Components register their active query keys on mount and unregister on
 * unmount; all cache patching flows through this store so cross-component
 * consistency is guaranteed even when multiple surfaces share the same
 * underlying query (e.g. projects.list used by both AgencyClientsSurface
 * and AgencyProjectsTable).
 */
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { defineStore } from "pinia";
import { ref } from "vue";

import { getErrorMessage } from "~/utils/get-error-message";

// ---------------------------------------------------------------------------
// Shared types (mirrored from API shapes — keep in sync with oRPC output)
// ---------------------------------------------------------------------------

type AgencyClient = {
  id: string;
  teamId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type AgencyProject = {
  id: string;
  teamId: string;
  clientId: string;
  clientName: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type AgencyTag = {
  id: string;
  teamId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type AgencyClientsListQueryData = {
  items: AgencyClient[];
  page: number;
  pageSize: number;
  total: number;
};

type AgencyProjectsListQueryData = {
  items: AgencyProject[];
  page: number;
  pageSize: number;
  total: number;
};

type AgencyTagsListQueryData = {
  items: AgencyTag[];
  page: number;
  pageSize: number;
  total: number;
};

type QueryKey = readonly unknown[];

type QuerySnapshot = {
  queryKey: QueryKey;
  data: unknown;
};

type RegisteredClientsQuery = {
  queryKey: QueryKey;
  teamId: string;
};

type RegisteredProjectsQuery = {
  queryKey: QueryKey;
  teamId: string;
  /** When set, only patches for matching clientId are applied. */
  clientId?: string;
};

type RegisteredTagsQuery = {
  queryKey: QueryKey;
  teamId: string;
};

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

type CreateClientPayload = {
  teamId: string;
  name: string;
};

type UpdateClientPayload = {
  teamId: string;
  clientId: string;
  name: string;
};

type CreateProjectPayload = {
  teamId: string;
  clientId: string;
  /** Used to fill the optimistic row's clientName field. */
  clientName: string;
  name: string;
};

type CreateTagPayload = {
  teamId: string;
  name: string;
};

type DeleteTagPayload = {
  teamId: string;
  tagId: string;
  tagName: string;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAgencyOpsStore = defineStore("agency-ops", () => {
  const orpc = useOrpc();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Pending-mutation counters exposed so components can disable buttons.
  const clientMutationCount = ref(0);
  const projectMutationCount = ref(0);
  const tagMutationCount = ref(0);
  const deletingTagIds = ref<string[]>([]);

  const isClientMutationPending = computed(() => clientMutationCount.value > 0);
  const isProjectMutationPending = computed(() => projectMutationCount.value > 0);
  const isTagMutationPending = computed(() => tagMutationCount.value > 0);

  // Query registries (Map key = JSON.stringify(queryKey)).
  // Refcounted so concurrently-mounted components sharing the same query key
  // don't evict one another's registration on unmount.
  type RefCounted<T> = { payload: T; count: number };
  const clientsQueryRegistry = new Map<string, RefCounted<RegisteredClientsQuery>>();
  const projectsQueryRegistry = new Map<string, RefCounted<RegisteredProjectsQuery>>();
  const tagsQueryRegistry = new Map<string, RefCounted<RegisteredTagsQuery>>();

  // Mutations
  const createClientMutation = useMutation(orpc.agencyOps.clients.create.mutationOptions());
  const updateClientMutation = useMutation(orpc.agencyOps.clients.update.mutationOptions());
  const createProjectMutation = useMutation(orpc.agencyOps.projects.create.mutationOptions());
  const createTagMutation = useMutation(orpc.agencyOps.tags.create.mutationOptions());
  const deleteTagMutation = useMutation(orpc.agencyOps.tags.delete.mutationOptions());

  // ---------------------------------------------------------------------------
  // Registry helpers
  // ---------------------------------------------------------------------------

  function registryKey(queryKey: QueryKey) {
    return JSON.stringify(queryKey);
  }

  function registerInto<T>(
    registry: Map<string, RefCounted<T>>,
    key: string,
    payload: T,
  ) {
    const existing = registry.get(key);
    if (existing) {
      existing.count += 1;
      // Refresh payload in case anything but the queryKey content varies.
      existing.payload = payload;
    } else {
      registry.set(key, { payload, count: 1 });
    }
  }

  function unregisterFrom<T>(registry: Map<string, RefCounted<T>>, key: string) {
    const existing = registry.get(key);
    if (!existing) return;
    existing.count -= 1;
    if (existing.count <= 0) registry.delete(key);
  }

  function registryPayloads<T>(registry: Map<string, RefCounted<T>>): T[] {
    return [...registry.values()].map((entry) => entry.payload);
  }

  function registerClientsQuery(payload: RegisteredClientsQuery) {
    registerInto(clientsQueryRegistry, registryKey(payload.queryKey), payload);
  }

  function unregisterClientsQuery(queryKey: QueryKey) {
    unregisterFrom(clientsQueryRegistry, registryKey(queryKey));
  }

  function registerProjectsQuery(payload: RegisteredProjectsQuery) {
    registerInto(projectsQueryRegistry, registryKey(payload.queryKey), payload);
  }

  function unregisterProjectsQuery(queryKey: QueryKey) {
    unregisterFrom(projectsQueryRegistry, registryKey(queryKey));
  }

  function registerTagsQuery(payload: RegisteredTagsQuery) {
    registerInto(tagsQueryRegistry, registryKey(payload.queryKey), payload);
  }

  function unregisterTagsQuery(queryKey: QueryKey) {
    unregisterFrom(tagsQueryRegistry, registryKey(queryKey));
  }

  // ---------------------------------------------------------------------------
  // Snapshot / restore helpers
  // ---------------------------------------------------------------------------

  function snapshotQueries(queries: Iterable<{ queryKey: QueryKey }>): QuerySnapshot[] {
    return [...queries].map((q) => ({
      queryKey: q.queryKey,
      data: queryClient.getQueryData(q.queryKey),
    }));
  }

  function restoreQuerySnapshots(snapshots: QuerySnapshot[]) {
    snapshots.forEach((s) => queryClient.setQueryData(s.queryKey, s.data));
  }

  // ---------------------------------------------------------------------------
  // Optimistic ID generator
  // ---------------------------------------------------------------------------

  function optimisticId(prefix: string) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // ---------------------------------------------------------------------------
  // Clients cache patchers
  // ---------------------------------------------------------------------------

  function patchInsertedClient(teamId: string, client: AgencyClient) {
    clientsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      queryClient.setQueryData<AgencyClientsListQueryData | undefined>(reg.queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          items: [client, ...current.items],
          total: current.total + 1,
        };
      });
    });
  }

  function patchUpdatedClient(teamId: string, clientId: string, patch: Partial<AgencyClient>) {
    clientsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      queryClient.setQueryData<AgencyClientsListQueryData | undefined>(reg.queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map((c) => (c.id === clientId ? { ...c, ...patch } : c)),
        };
      });
    });
  }

  async function invalidateClientsQueries(teamId: string) {
    // Use a partial-matching key so we also refresh queries that were cached
    // but aren't currently registered (e.g. an unmounted-but-cached surface).
    await queryClient.invalidateQueries({
      queryKey: orpc.agencyOps.clients.list.key({ input: { teamId } }),
    });
  }

  // ---------------------------------------------------------------------------
  // Projects cache patchers
  // ---------------------------------------------------------------------------

  function patchInsertedProject(teamId: string, project: AgencyProject) {
    projectsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      // If the registry entry is scoped to a specific clientId, only patch
      // if it matches (or if it's a catch-all listing all clients).
      if (reg.clientId && reg.clientId !== project.clientId) return;
      queryClient.setQueryData<AgencyProjectsListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: [project, ...current.items],
            total: current.total + 1,
          };
        },
      );
    });
  }

  async function invalidateProjectsQueries(teamId: string) {
    await queryClient.invalidateQueries({
      queryKey: orpc.agencyOps.projects.list.key({ input: { teamId } }),
    });
  }

  // ---------------------------------------------------------------------------
  // Tags cache patchers
  // ---------------------------------------------------------------------------

  function patchInsertedTag(teamId: string, tag: AgencyTag) {
    tagsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      queryClient.setQueryData<AgencyTagsListQueryData | undefined>(reg.queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          items: [...current.items, tag],
          total: current.total + 1,
        };
      });
    });
  }

  function patchDeletedTag(teamId: string, tagId: string) {
    tagsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      queryClient.setQueryData<AgencyTagsListQueryData | undefined>(reg.queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.filter((t) => t.id !== tagId),
          total: Math.max(0, current.total - 1),
        };
      });
    });
  }

  async function invalidateTagsQueries(teamId: string) {
    await queryClient.invalidateQueries({
      queryKey: orpc.agencyOps.tags.list.key({ input: { teamId } }),
    });
  }

  // ---------------------------------------------------------------------------
  // Public actions
  // ---------------------------------------------------------------------------

  async function createClient(
    payload: CreateClientPayload,
    callbacks?: {
      onSuccess?: (clientId: string) => void;
    },
  ) {
    if (!payload.teamId || !payload.name.trim()) return;

    const snapshots = snapshotQueries(registryPayloads(clientsQueryRegistry));
    const nowIso = new Date().toISOString();
    const optimisticClient: AgencyClient = {
      id: optimisticId("client"),
      teamId: payload.teamId,
      name: payload.name.trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    clientMutationCount.value += 1;

    try {
      patchInsertedClient(payload.teamId, optimisticClient);

      const created = (await createClientMutation.mutateAsync({
        teamId: payload.teamId,
        name: payload.name.trim(),
      })) as AgencyClient;

      // Replace optimistic row with real data
      patchUpdatedClient(payload.teamId, optimisticClient.id, { id: created.id });
      callbacks?.onSuccess?.(created.id);

      await invalidateClientsQueries(payload.teamId);

      toast.add({ title: "Client created", description: payload.name.trim(), color: "success" });
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      toast.add({
        title: "Couldn't create client",
        description: getErrorMessage(error, "Try again."),
        color: "error",
      });
    } finally {
      clientMutationCount.value = Math.max(0, clientMutationCount.value - 1);
    }
  }

  async function updateClient(payload: UpdateClientPayload) {
    if (!payload.teamId || !payload.name.trim()) return;

    const snapshots = snapshotQueries(registryPayloads(clientsQueryRegistry));
    const nowIso = new Date().toISOString();

    clientMutationCount.value += 1;

    try {
      patchUpdatedClient(payload.teamId, payload.clientId, {
        name: payload.name.trim(),
        updatedAt: nowIso,
      });

      await updateClientMutation.mutateAsync({
        teamId: payload.teamId,
        clientId: payload.clientId,
        name: payload.name.trim(),
      });

      await invalidateClientsQueries(payload.teamId);

      toast.add({ title: "Renamed", description: payload.name.trim(), color: "success" });
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      toast.add({
        title: "Couldn't rename",
        description: getErrorMessage(error, "Try again."),
        color: "error",
      });
    } finally {
      clientMutationCount.value = Math.max(0, clientMutationCount.value - 1);
    }
  }

  async function createProject(payload: CreateProjectPayload) {
    if (!payload.teamId || !payload.clientId || !payload.name.trim()) return;

    const snapshots = snapshotQueries(registryPayloads(projectsQueryRegistry));
    const nowIso = new Date().toISOString();
    const optimisticProject: AgencyProject = {
      id: optimisticId("project"),
      teamId: payload.teamId,
      clientId: payload.clientId,
      clientName: payload.clientName,
      name: payload.name.trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    projectMutationCount.value += 1;

    try {
      patchInsertedProject(payload.teamId, optimisticProject);

      await createProjectMutation.mutateAsync({
        teamId: payload.teamId,
        clientId: payload.clientId,
        name: payload.name.trim(),
      });

      await invalidateProjectsQueries(payload.teamId);

      toast.add({ title: "Project added", description: payload.name.trim(), color: "success" });
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      toast.add({
        title: "Couldn't add project",
        description: getErrorMessage(error, "Try again."),
        color: "error",
      });
    } finally {
      projectMutationCount.value = Math.max(0, projectMutationCount.value - 1);
    }
  }

  async function createTag(payload: CreateTagPayload) {
    if (!payload.teamId || !payload.name.trim()) return;

    const snapshots = snapshotQueries(registryPayloads(tagsQueryRegistry));
    const nowIso = new Date().toISOString();
    const optimisticTag: AgencyTag = {
      id: optimisticId("tag"),
      teamId: payload.teamId,
      name: payload.name.trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    tagMutationCount.value += 1;

    try {
      patchInsertedTag(payload.teamId, optimisticTag);

      await createTagMutation.mutateAsync({
        teamId: payload.teamId,
        name: payload.name.trim(),
      });

      await invalidateTagsQueries(payload.teamId);

      toast.add({ title: "Tag created", description: payload.name.trim(), color: "success" });
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      toast.add({
        title: "Couldn't create tag",
        description: getErrorMessage(error, "Try again."),
        color: "error",
      });
    } finally {
      tagMutationCount.value = Math.max(0, tagMutationCount.value - 1);
    }
  }

  async function deleteTag(payload: DeleteTagPayload) {
    if (!payload.teamId) return;

    const snapshots = snapshotQueries(registryPayloads(tagsQueryRegistry));

    deletingTagIds.value = [...new Set([...deletingTagIds.value, payload.tagId])];

    try {
      patchDeletedTag(payload.teamId, payload.tagId);

      await deleteTagMutation.mutateAsync({
        teamId: payload.teamId,
        tagId: payload.tagId,
      });

      await invalidateTagsQueries(payload.teamId);

      toast.add({ title: "Tag removed", description: payload.tagName, color: "success" });
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      toast.add({
        title: "Couldn't remove tag",
        description: getErrorMessage(error, "Try again."),
        color: "error",
      });
    } finally {
      // Filter the specific id rather than restoring a pre-call snapshot, so
      // concurrent deletes of other tags aren't clobbered.
      deletingTagIds.value = deletingTagIds.value.filter((id) => id !== payload.tagId);
    }
  }

  return {
    // State
    isClientMutationPending,
    isProjectMutationPending,
    isTagMutationPending,
    deletingTagIds,
    // Registry
    registerClientsQuery,
    unregisterClientsQuery,
    registerProjectsQuery,
    unregisterProjectsQuery,
    registerTagsQuery,
    unregisterTagsQuery,
    // Actions
    createClient,
    updateClient,
    createProject,
    createTag,
    deleteTag,
  };
});
