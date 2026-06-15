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
import type { AgencyLiveEvent } from "@brainiac/api/routers/agency-ops/live";
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

type AgencyProjectTask = {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  assigneeUserId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  dueDate: string | null;
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

type AgencyProjectTasksListQueryData = {
  items: AgencyProjectTask[];
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

type RegisteredProjectTasksQuery = {
  queryKey: QueryKey;
  teamId: string;
  projectId?: string;
};

type RegisteredTagsQuery = {
  queryKey: QueryKey;
  teamId: string;
};

type AgencyTaskMessage = {
  id: string;
  teamId: string;
  threadId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  content: string;
  type: "text" | "voice" | "attachment";
  senderType: "user" | "agent";
  createdAt: string;
  updatedAt: string;
  attachments: Array<{
    id: string;
    teamId: string;
    messageId: string;
    fileName: string;
    mimeType: string;
    storageKey: string;
    sizeBytes: number;
    durationSeconds: number | null;
    metadata?: unknown;
    createdAt: string;
    url: string | null;
  }>;
};

type AgencyTaskMessagesListQueryData = {
  items: AgencyTaskMessage[];
  page: number;
  pageSize: number;
  total: number;
};

type AgencyContact = {
  id: string;
  teamId: string;
  clientId: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
};

type AgencyCapacityListQueryData = {
  weeks: Array<{
    weekStart: string;
    members: Array<{
      userId: string;
      userName: string;
      capacitySeconds: number;
      bookedSeconds: number;
      loggedSeconds: number;
    }>;
  }>;
};

type RegisteredTaskMessagesQuery = {
  queryKey: QueryKey;
  teamId: string;
  taskId: string;
};

type RegisteredContactQuery = {
  queryKey: QueryKey;
  teamId: string;
  clientId: string;
};

type RegisteredCapacityQuery = {
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

type CreateProjectTaskPayload = {
  teamId: string;
  projectId: string;
  title: string;
  status?: "open" | "in_progress" | "done" | "archived";
  assigneeUserId?: string;
  dueDate?: string;
};

type DeleteProjectTaskPayload = {
  teamId: string;
  taskId: string;
  taskTitle: string;
};

type UpdateProjectTaskPayload = {
  teamId: string;
  taskId: string;
  title?: string;
  status?: AgencyProjectTask["status"];
  assigneeUserId?: string | null;
  dueDate?: string | null;
};

type SendTaskMessagePayload = {
  teamId: string;
  taskId: string;
  content: string;
  type?: "text" | "voice" | "attachment";
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    storageKey: string;
    sizeBytes: number;
    durationSeconds?: number | null;
    uploadToken: string;
    metadata?: Record<string, unknown>;
  }>;
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

// Phase 4 payload types

type ArchiveClientPayload = {
  teamId: string;
  clientId: string;
  clientName: string;
};

type UpsertContactPayload = {
  teamId: string;
  clientId: string;
  name: string;
  email: string;
  phone: string;
};

type UpsertRatePayload = {
  teamId: string;
  userId: string;
  costRateCents: number | null;
  billableRateCents: number | null;
  currency?: string;
  effectiveFrom?: string;
};

type SetCapacityPayload = {
  teamId: string;
  userId: string;
  weekStart: string;
  capacitySeconds: number;
};

type CreateInvoicePayload = {
  teamId: string;
  clientId: string;
  clientName: string;
  periodStart: string;
  periodEnd: string;
  currency?: string;
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
  const taskMutationCount = ref(0);
  const tagMutationCount = ref(0);
  const deletingTaskIds = ref<string[]>([]);
  const deletingTagIds = ref<string[]>([]);
  const contactMutationCount = ref(0);
  const rateMutationCount = ref(0);
  const capacityMutationCount = ref(0);
  const invoiceMutationCount = ref(0);

  const isClientMutationPending = computed(() => clientMutationCount.value > 0);
  const isProjectMutationPending = computed(() => projectMutationCount.value > 0);
  const isTaskMutationPending = computed(() => taskMutationCount.value > 0);
  const isTagMutationPending = computed(() => tagMutationCount.value > 0);
  const isContactMutationPending = computed(() => contactMutationCount.value > 0);
  const isRateMutationPending = computed(() => rateMutationCount.value > 0);
  const isCapacityMutationPending = computed(() => capacityMutationCount.value > 0);
  const isInvoiceMutationPending = computed(() => invoiceMutationCount.value > 0);

  // Query registries (Map key = JSON.stringify(queryKey)).
  // Refcounted so concurrently-mounted components sharing the same query key
  // don't evict one another's registration on unmount.
  type RefCounted<T> = { payload: T; count: number };
  const clientsQueryRegistry = new Map<string, RefCounted<RegisteredClientsQuery>>();
  const projectsQueryRegistry = new Map<string, RefCounted<RegisteredProjectsQuery>>();
  const projectTasksQueryRegistry = new Map<string, RefCounted<RegisteredProjectTasksQuery>>();
  const tagsQueryRegistry = new Map<string, RefCounted<RegisteredTagsQuery>>();
  const taskMessagesQueryRegistry = new Map<string, RefCounted<RegisteredTaskMessagesQuery>>();
  const contactsQueryRegistry = new Map<string, RefCounted<RegisteredContactQuery>>();
  const capacityQueryRegistry = new Map<string, RefCounted<RegisteredCapacityQuery>>();

  // Mutations
  const createClientMutation = useMutation(orpc.agencyOps.clients.create.mutationOptions());
  const updateClientMutation = useMutation(orpc.agencyOps.clients.update.mutationOptions());
  const archiveClientMutation = useMutation(orpc.agencyOps.clients.archive.mutationOptions());
  const createProjectMutation = useMutation(orpc.agencyOps.projects.create.mutationOptions());
  const createProjectTaskMutation = useMutation(
    orpc.agencyOps.projectTasks.create.mutationOptions(),
  );
  const deleteProjectTaskMutation = useMutation(
    orpc.agencyOps.projectTasks.delete.mutationOptions(),
  );
  const updateProjectTaskMutation = useMutation(
    orpc.agencyOps.projectTasks.update.mutationOptions(),
  );
  const createTaskMessageMutation = useMutation(
    orpc.agencyOps.taskThreads.messages.create.mutationOptions(),
  );
  const createTagMutation = useMutation(orpc.agencyOps.tags.create.mutationOptions());
  const deleteTagMutation = useMutation(orpc.agencyOps.tags.delete.mutationOptions());
  const upsertContactMutation = useMutation(orpc.agencyOps.contacts.upsert.mutationOptions());
  const upsertRateMutation = useMutation(orpc.agencyOps.rates.upsert.mutationOptions());
  const setCapacityMutation = useMutation(orpc.agencyOps.capacity.set.mutationOptions());
  const createInvoiceMutation = useMutation(orpc.agencyOps.invoices.create.mutationOptions());
  const updateInvoiceStatusMutation = useMutation(
    orpc.agencyOps.invoices.updateStatus.mutationOptions(),
  );

  // ---------------------------------------------------------------------------
  // Registry helpers
  // ---------------------------------------------------------------------------

  function registryKey(queryKey: QueryKey) {
    return JSON.stringify(queryKey);
  }

  function registerInto<T>(registry: Map<string, RefCounted<T>>, key: string, payload: T) {
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

  function registerProjectTasksQuery(payload: RegisteredProjectTasksQuery) {
    registerInto(projectTasksQueryRegistry, registryKey(payload.queryKey), payload);
  }

  function unregisterProjectTasksQuery(queryKey: QueryKey) {
    unregisterFrom(projectTasksQueryRegistry, registryKey(queryKey));
  }

  function registerTagsQuery(payload: RegisteredTagsQuery) {
    registerInto(tagsQueryRegistry, registryKey(payload.queryKey), payload);
  }

  function unregisterTagsQuery(queryKey: QueryKey) {
    unregisterFrom(tagsQueryRegistry, registryKey(queryKey));
  }

  function registerTaskMessagesQuery(payload: RegisteredTaskMessagesQuery) {
    registerInto(taskMessagesQueryRegistry, registryKey(payload.queryKey), payload);
  }

  function unregisterTaskMessagesQuery(queryKey: QueryKey) {
    unregisterFrom(taskMessagesQueryRegistry, registryKey(queryKey));
  }

  function registerContactQuery(payload: RegisteredContactQuery) {
    registerInto(contactsQueryRegistry, registryKey(payload.queryKey), payload);
  }

  function unregisterContactQuery(queryKey: QueryKey) {
    unregisterFrom(contactsQueryRegistry, registryKey(queryKey));
  }

  function registerCapacityQuery(payload: RegisteredCapacityQuery) {
    registerInto(capacityQueryRegistry, registryKey(payload.queryKey), payload);
  }

  function unregisterCapacityQuery(queryKey: QueryKey) {
    unregisterFrom(capacityQueryRegistry, registryKey(queryKey));
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
        const exists = current.items.some((item) => item.id === client.id);
        if (exists) {
          return {
            ...current,
            items: current.items.map((item) =>
              item.id === client.id ? { ...item, ...client } : item,
            ),
          };
        }
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

  // ---------------------------------------------------------------------------
  // Projects cache patchers
  // ---------------------------------------------------------------------------

  function patchInsertedProject(teamId: string, project: AgencyProject) {
    projectsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      // If the registry entry is scoped to a specific clientId, only patch
      // if it matches (or if it's a catch-all listing all clients).
      if (reg.clientId && reg.clientId !== project.clientId) return;
      queryClient.setQueryData<AgencyProjectsListQueryData | undefined>(reg.queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          items: [project, ...current.items],
          total: current.total + 1,
        };
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Project tasks cache patchers
  // ---------------------------------------------------------------------------

  function patchInsertedProjectTask(teamId: string, task: AgencyProjectTask) {
    projectTasksQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      if (reg.projectId && reg.projectId !== task.projectId) return;
      queryClient.setQueryData<AgencyProjectTasksListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          const exists = current.items.some((item) => item.id === task.id);
          if (exists) {
            return {
              ...current,
              items: current.items.map((item) => (item.id === task.id ? task : item)),
            };
          }
          return {
            ...current,
            items: [task, ...current.items],
          };
        },
      );
    });
  }

  function patchUpdatedProjectTask(teamId: string, task: AgencyProjectTask) {
    projectTasksQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      if (reg.projectId && reg.projectId !== task.projectId) return;
      queryClient.setQueryData<AgencyProjectTasksListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          const index = current.items.findIndex((item) => item.id === task.id);
          if (index === -1) {
            return {
              ...current,
              items: [task, ...current.items],
            };
          }
          return {
            ...current,
            items: current.items.map((item) => (item.id === task.id ? task : item)),
          };
        },
      );
    });
  }

  function patchDeletedProjectTask(teamId: string, taskId: string) {
    projectTasksQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      queryClient.setQueryData<AgencyProjectTasksListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.filter((task) => task.id !== taskId),
          };
        },
      );
    });
  }

  function patchInsertedTaskMessage(teamId: string, taskId: string, message: AgencyTaskMessage) {
    taskMessagesQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId || reg.taskId !== taskId) return;
      queryClient.setQueryData<AgencyTaskMessagesListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          if (current.items.some((item) => item.id === message.id)) {
            return {
              ...current,
              items: current.items.map((item) => (item.id === message.id ? message : item)),
            };
          }
          return {
            ...current,
            items: [...current.items, message],
            total: current.total + 1,
          };
        },
      );
    });
  }

  function patchUpsertedContact(teamId: string, clientId: string, contact: AgencyContact) {
    contactsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId || reg.clientId !== clientId) return;
      queryClient.setQueryData(reg.queryKey, contact);
    });
  }

  function patchCapacityCell(
    teamId: string,
    userId: string,
    weekStart: string,
    capacitySeconds: number,
  ) {
    capacityQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      queryClient.setQueryData<AgencyCapacityListQueryData | undefined>(reg.queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          weeks: current.weeks.map((week) => {
            if (week.weekStart !== weekStart) return week;
            return {
              ...week,
              members: week.members.map((member) =>
                member.userId === userId ? { ...member, capacitySeconds } : member,
              ),
            };
          }),
        };
      });
    });
  }

  function reconcileCreatedClient(
    teamId: string,
    optimisticIdValue: string,
    created: AgencyClient,
  ) {
    clientsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      queryClient.setQueryData<AgencyClientsListQueryData | undefined>(reg.queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map((client) =>
            client.id === optimisticIdValue ? created : client,
          ),
        };
      });
    });
  }

  function reconcileCreatedProject(
    teamId: string,
    optimisticIdValue: string,
    created: AgencyProject,
  ) {
    projectsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      if (reg.clientId && reg.clientId !== created.clientId) return;
      queryClient.setQueryData<AgencyProjectsListQueryData | undefined>(reg.queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map((project) =>
            project.id === optimisticIdValue ? created : project,
          ),
        };
      });
    });
  }

  function reconcileCreatedTask(
    teamId: string,
    optimisticIdValue: string,
    created: AgencyProjectTask,
  ) {
    projectTasksQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      if (reg.projectId && reg.projectId !== created.projectId) return;
      queryClient.setQueryData<AgencyProjectTasksListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((task) => (task.id === optimisticIdValue ? created : task)),
          };
        },
      );
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

      reconcileCreatedClient(payload.teamId, optimisticClient.id, created);
      callbacks?.onSuccess?.(created.id);

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

      const updated = (await updateClientMutation.mutateAsync({
        teamId: payload.teamId,
        clientId: payload.clientId,
        name: payload.name.trim(),
      })) as AgencyClient;

      patchUpdatedClient(payload.teamId, payload.clientId, updated);

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

      const created = (await createProjectMutation.mutateAsync({
        teamId: payload.teamId,
        clientId: payload.clientId,
        name: payload.name.trim(),
      })) as AgencyProject;

      reconcileCreatedProject(payload.teamId, optimisticProject.id, created);

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

  async function createProjectTask(payload: CreateProjectTaskPayload) {
    const title = payload.title.trim();
    if (!payload.teamId || !payload.projectId || !title) return;

    const snapshots = snapshotQueries(registryPayloads(projectTasksQueryRegistry));
    const nowIso = new Date().toISOString();
    const optimisticTask: AgencyProjectTask = {
      id: optimisticId("agency-project-task"),
      teamId: payload.teamId,
      projectId: payload.projectId,
      title,
      status: payload.status ?? "open",
      assigneeUserId: payload.assigneeUserId ?? null,
      assigneeName: null,
      assigneeAvatar: null,
      dueDate: payload.dueDate ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    taskMutationCount.value += 1;

    try {
      patchInsertedProjectTask(payload.teamId, optimisticTask);

      const created = (await createProjectTaskMutation.mutateAsync({
        teamId: payload.teamId,
        projectId: payload.projectId,
        title,
        status: payload.status,
        assigneeUserId: payload.assigneeUserId,
        dueDate: payload.dueDate,
      })) as AgencyProjectTask;

      reconcileCreatedTask(payload.teamId, optimisticTask.id, created);

      toast.add({ title: "Task added", description: title, color: "success" });
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      toast.add({
        title: "Couldn't add task",
        description: getErrorMessage(error, "Try again."),
        color: "error",
      });
    } finally {
      taskMutationCount.value = Math.max(0, taskMutationCount.value - 1);
    }
  }

  async function deleteProjectTask(payload: DeleteProjectTaskPayload) {
    if (!payload.teamId || !payload.taskId) return;

    const snapshots = snapshotQueries(registryPayloads(projectTasksQueryRegistry));
    deletingTaskIds.value = [...new Set([...deletingTaskIds.value, payload.taskId])];

    try {
      patchDeletedProjectTask(payload.teamId, payload.taskId);

      await deleteProjectTaskMutation.mutateAsync({
        teamId: payload.teamId,
        taskId: payload.taskId,
      });

      toast.add({ title: "Task deleted", description: payload.taskTitle, color: "success" });
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      toast.add({
        title: "Couldn't delete task",
        description: getErrorMessage(error, "Try again."),
        color: "error",
      });
    } finally {
      deletingTaskIds.value = deletingTaskIds.value.filter((id) => id !== payload.taskId);
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

  // ---------------------------------------------------------------------------
  // Client archive / unarchive
  // ---------------------------------------------------------------------------

  function patchRemovedClient(teamId: string, clientId: string) {
    clientsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      queryClient.setQueryData<AgencyClientsListQueryData | undefined>(reg.queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.filter((c) => c.id !== clientId),
          total: Math.max(0, current.total - 1),
        };
      });
    });
  }

  async function archiveClient(payload: ArchiveClientPayload) {
    if (!payload.teamId || !payload.clientId) return;

    const snapshots = snapshotQueries(registryPayloads(clientsQueryRegistry));
    clientMutationCount.value += 1;

    try {
      patchRemovedClient(payload.teamId, payload.clientId);

      await archiveClientMutation.mutateAsync({
        teamId: payload.teamId,
        clientId: payload.clientId,
      });

      toast.add({
        title: "Client archived",
        description: `${payload.clientName} has been archived.`,
        color: "success",
      });
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      toast.add({
        title: "Couldn't archive client",
        description: getErrorMessage(error, "Try again."),
        color: "error",
      });
    } finally {
      clientMutationCount.value = Math.max(0, clientMutationCount.value - 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Contact upsert
  // ---------------------------------------------------------------------------

  async function upsertContact(
    payload: UpsertContactPayload,
    callbacks?: { onSuccess?: () => void },
  ) {
    if (!payload.teamId || !payload.clientId) return;

    contactMutationCount.value += 1;

    try {
      const contact = (await upsertContactMutation.mutateAsync({
        teamId: payload.teamId,
        clientId: payload.clientId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
      })) as AgencyContact;

      patchUpsertedContact(payload.teamId, payload.clientId, contact);

      callbacks?.onSuccess?.();
      toast.add({ title: "Contact saved", color: "success" });
    } catch (error) {
      toast.add({
        title: "Couldn't save contact",
        description: getErrorMessage(error, "Try again."),
        color: "error",
      });
    } finally {
      contactMutationCount.value = Math.max(0, contactMutationCount.value - 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Rates upsert
  // ---------------------------------------------------------------------------

  async function upsertRate(payload: UpsertRatePayload, callbacks?: { onSuccess?: () => void }) {
    if (!payload.teamId || !payload.userId) return;

    rateMutationCount.value += 1;

    try {
      await upsertRateMutation.mutateAsync({
        teamId: payload.teamId,
        userId: payload.userId,
        costRateCents: payload.costRateCents,
        billableRateCents: payload.billableRateCents,
        currency: payload.currency,
        effectiveFrom: payload.effectiveFrom,
      });

      await queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.rates.list.key({ input: { teamId: payload.teamId } }),
      });

      callbacks?.onSuccess?.();
      toast.add({ title: "Rate saved", color: "success" });
    } catch (error) {
      toast.add({
        title: "Couldn't save rate",
        description: getErrorMessage(error, "Try again."),
        color: "error",
      });
    } finally {
      rateMutationCount.value = Math.max(0, rateMutationCount.value - 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Capacity set
  // ---------------------------------------------------------------------------

  async function setCapacity(payload: SetCapacityPayload, callbacks?: { onSuccess?: () => void }) {
    if (!payload.teamId || !payload.userId) return;

    const snapshots = snapshotQueries(registryPayloads(capacityQueryRegistry));
    capacityMutationCount.value += 1;

    try {
      patchCapacityCell(payload.teamId, payload.userId, payload.weekStart, payload.capacitySeconds);

      await setCapacityMutation.mutateAsync({
        teamId: payload.teamId,
        userId: payload.userId,
        weekStart: payload.weekStart,
        capacitySeconds: payload.capacitySeconds,
      });

      callbacks?.onSuccess?.();
      toast.add({ title: "Capacity updated", color: "success" });
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      toast.add({
        title: "Couldn't update capacity",
        description: getErrorMessage(error, "Try again."),
        color: "error",
      });
    } finally {
      capacityMutationCount.value = Math.max(0, capacityMutationCount.value - 1);
    }
  }

  function getCachedProjectTask(teamId: string, taskId: string): AgencyProjectTask | null {
    for (const { payload: reg } of projectTasksQueryRegistry.values()) {
      if (reg.teamId !== teamId) continue;
      const data = queryClient.getQueryData<AgencyProjectTasksListQueryData>(reg.queryKey);
      const task = data?.items.find((item) => item.id === taskId);
      if (task) return task;
    }
    return null;
  }

  async function updateProjectTask(payload: UpdateProjectTaskPayload) {
    if (!payload.teamId || !payload.taskId) return;

    const current = getCachedProjectTask(payload.teamId, payload.taskId);
    if (!current) return;

    const snapshots = snapshotQueries(registryPayloads(projectTasksQueryRegistry));
    const nowIso = new Date().toISOString();
    taskMutationCount.value += 1;

    const optimisticTask: AgencyProjectTask = {
      ...current,
      title: payload.title ?? current.title,
      status: payload.status ?? current.status,
      assigneeUserId:
        payload.assigneeUserId === undefined ? current.assigneeUserId : payload.assigneeUserId,
      dueDate: payload.dueDate === undefined ? current.dueDate : payload.dueDate,
      updatedAt: nowIso,
    };

    try {
      patchUpdatedProjectTask(payload.teamId, optimisticTask);

      const updated = (await updateProjectTaskMutation.mutateAsync({
        teamId: payload.teamId,
        taskId: payload.taskId,
        title: payload.title,
        status: payload.status,
        assigneeUserId: payload.assigneeUserId,
        dueDate: payload.dueDate,
      })) as AgencyProjectTask;

      patchUpdatedProjectTask(payload.teamId, updated);
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      toast.add({
        title: "Couldn't update task",
        description: getErrorMessage(error, "Try again."),
        color: "error",
      });
      throw error;
    } finally {
      taskMutationCount.value = Math.max(0, taskMutationCount.value - 1);
    }
  }

  async function sendTaskMessage(payload: SendTaskMessagePayload) {
    if (!payload.teamId || !payload.taskId) return;

    const snapshots = snapshotQueries(registryPayloads(taskMessagesQueryRegistry));
    const nowIso = new Date().toISOString();
    const optimisticMessage: AgencyTaskMessage = {
      id: optimisticId("agency-task-message"),
      teamId: payload.teamId,
      threadId: payload.taskId,
      userId: "",
      userName: "You",
      userAvatar: null,
      content: payload.content,
      type: payload.type ?? "text",
      senderType: "user",
      createdAt: nowIso,
      updatedAt: nowIso,
      attachments: [],
    };

    try {
      patchInsertedTaskMessage(payload.teamId, payload.taskId, optimisticMessage);

      const created = (await createTaskMessageMutation.mutateAsync({
        teamId: payload.teamId,
        taskId: payload.taskId,
        content: payload.content,
        type: payload.type,
        attachments: payload.attachments,
      })) as AgencyTaskMessage;

      taskMessagesQueryRegistry.forEach(({ payload: reg }) => {
        if (reg.teamId !== payload.teamId || reg.taskId !== payload.taskId) return;
        queryClient.setQueryData<AgencyTaskMessagesListQueryData | undefined>(
          reg.queryKey,
          (current) => {
            if (!current) return current;
            return {
              ...current,
              items: current.items
                .filter((item) => item.id !== optimisticMessage.id)
                .concat(created),
            };
          },
        );
      });

      return created;
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      throw error;
    }
  }

  async function invalidateTenureQueries(teamId: string) {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.tenure.policy.get.key({ input: { teamId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.tenure.summary.list.key({ input: { teamId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.tenure.exemptions.list.key({ input: { teamId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.tenure.profiles.list.key({ input: { teamId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.tenure.member.get.key({ input: { teamId } }),
      }),
    ]);
  }

  function applyLiveEvent(event: AgencyLiveEvent) {
    switch (event.type) {
      case "client.created":
        patchInsertedClient(event.teamId, event.client);
        break;
      case "client.updated":
        patchUpdatedClient(event.teamId, event.client.id, event.client);
        break;
      case "client.archived":
        patchRemovedClient(event.teamId, event.clientId);
        break;
      case "client.unarchived":
        patchInsertedClient(event.teamId, event.client);
        break;
      case "project.created":
        patchInsertedProject(event.teamId, event.project);
        break;
      case "project.updated":
        projectsQueryRegistry.forEach(({ payload: reg }) => {
          if (reg.teamId !== event.teamId) return;
          if (reg.clientId && reg.clientId !== event.project.clientId) return;
          queryClient.setQueryData<AgencyProjectsListQueryData | undefined>(
            reg.queryKey,
            (current) => {
              if (!current) return current;
              return {
                ...current,
                items: current.items.map((project) =>
                  project.id === event.project.id ? event.project : project,
                ),
              };
            },
          );
        });
        break;
      case "projectTask.created":
        patchInsertedProjectTask(event.teamId, event.task);
        break;
      case "projectTask.updated":
        patchUpdatedProjectTask(event.teamId, event.task);
        break;
      case "projectTask.deleted":
        patchDeletedProjectTask(event.teamId, event.taskId);
        break;
      case "taskMessage.created":
        patchInsertedTaskMessage(event.teamId, event.taskId, event.message);
        break;
      case "contact.upserted":
        patchUpsertedContact(event.teamId, event.clientId, event.contact);
        break;
      case "capacity.set":
        patchCapacityCell(
          event.teamId,
          event.capacity.userId,
          event.capacity.weekStart,
          event.capacity.capacitySeconds,
        );
        break;
      case "tenure.policy.updated":
      case "tenure.profile.updated":
      case "tenure.exemption.updated":
      case "tenure.exemption.deleted":
      case "tenure.recomputed":
        void invalidateTenureQueries(event.teamId);
        break;
      case "timer.started":
      case "timer.stopped":
      case "timeEntry.created":
      case "timeEntry.updated":
      case "timeEntry.deleted":
        break;
      default: {
        const _exhaustive: never = event;
        return _exhaustive;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Invoice create / status update
  // ---------------------------------------------------------------------------

  async function createInvoice(
    payload: CreateInvoicePayload,
    callbacks?: { onSuccess?: () => void },
  ) {
    if (!payload.teamId || !payload.clientId) return;

    invoiceMutationCount.value += 1;

    try {
      await createInvoiceMutation.mutateAsync({
        teamId: payload.teamId,
        clientId: payload.clientId,
        periodStart: payload.periodStart,
        periodEnd: payload.periodEnd,
        currency: payload.currency,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.agencyOps.invoices.list.key({ input: { teamId: payload.teamId } }),
        }),
        queryClient.invalidateQueries({
          queryKey: orpc.agencyOps.invoices.summary.key({ input: { teamId: payload.teamId } }),
        }),
      ]);

      callbacks?.onSuccess?.();
      toast.add({
        title: "Invoice draft created",
        description: `${payload.clientName} — draft added to Billing.`,
        color: "success",
      });
    } catch (error) {
      toast.add({
        title: "Couldn't create invoice",
        description: getErrorMessage(error, "Try again."),
        color: "error",
      });
    } finally {
      invoiceMutationCount.value = Math.max(0, invoiceMutationCount.value - 1);
    }
  }

  async function updateInvoiceStatus(
    payload: { teamId: string; invoiceId: string; status: "sent" | "paid" },
    callbacks?: { onSuccess?: () => void },
  ) {
    invoiceMutationCount.value += 1;

    try {
      await updateInvoiceStatusMutation.mutateAsync(payload);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.agencyOps.invoices.list.key({ input: { teamId: payload.teamId } }),
        }),
        queryClient.invalidateQueries({
          queryKey: orpc.agencyOps.invoices.summary.key({ input: { teamId: payload.teamId } }),
        }),
      ]);

      callbacks?.onSuccess?.();
      const label = payload.status === "sent" ? "Invoice sent" : "Invoice marked paid";
      toast.add({ title: label, color: "success" });
    } catch (error) {
      toast.add({
        title: "Couldn't update invoice",
        description: getErrorMessage(error, "Try again."),
        color: "error",
      });
    } finally {
      invoiceMutationCount.value = Math.max(0, invoiceMutationCount.value - 1);
    }
  }

  return {
    // State
    isClientMutationPending,
    isProjectMutationPending,
    isTaskMutationPending,
    isTagMutationPending,
    isContactMutationPending,
    isRateMutationPending,
    isCapacityMutationPending,
    isInvoiceMutationPending,
    deletingTaskIds,
    deletingTagIds,
    // Registry
    registerClientsQuery,
    unregisterClientsQuery,
    registerProjectsQuery,
    unregisterProjectsQuery,
    registerProjectTasksQuery,
    unregisterProjectTasksQuery,
    registerTagsQuery,
    unregisterTagsQuery,
    registerTaskMessagesQuery,
    unregisterTaskMessagesQuery,
    registerContactQuery,
    unregisterContactQuery,
    registerCapacityQuery,
    unregisterCapacityQuery,
    // Actions
    createClient,
    updateClient,
    archiveClient,
    createProject,
    createProjectTask,
    updateProjectTask,
    deleteProjectTask,
    sendTaskMessage,
    createTag,
    deleteTag,
    upsertContact,
    upsertRate,
    setCapacity,
    createInvoice,
    updateInvoiceStatus,
    applyLiveEvent,
  };
});
