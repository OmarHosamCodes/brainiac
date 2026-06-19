/**
 * Agency Ops Store — optimistic updates for clients and projects.
 */
import { create } from "zustand";
import { toast } from "sonner";

import { getQueryClient } from "@/lib/query-client";
import { orpc, orpcClient } from "@/lib/orpc";
import {
  cancelAgencyProjectTaskListQueries,
  findProjectTaskInCache,
  patchDeletedProjectTaskInCache,
  patchInsertedProjectTaskInCache,
  patchUpdatedProjectTaskInCache,
  reconcileCreatedProjectTaskInCache,
  refetchAgencyProjectTaskListQueries,
} from "@/lib/utils/agency-query-cache";
import { getAgencyTimeTrackingUserId } from "@/stores/agency-time-tracking";
import { useAgencyOptimisticStore } from "@/stores/agency-optimistic";
import { getErrorMessage } from "@/lib/utils/get-error-message";

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
  assigneeUserId?: string;
  statuses?: AgencyProjectTask["status"][];
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

type AgencyOpsActions = ReturnType<typeof createAgencyOpsActions>;

type AgencyOpsState = {
  clientMutationCount: number;
  projectMutationCount: number;
  isCreatingTask: boolean;
  pendingTaskIds: string[];
  deletingTaskIds: string[];
  contactMutationCount: number;
  rateMutationCount: number;
  capacityMutationCount: number;
  invoiceMutationCount: number;
} & AgencyOpsActions;

function createAgencyOpsActions(
  set: (
    partial: Partial<AgencyOpsState> | ((state: AgencyOpsState) => Partial<AgencyOpsState>),
  ) => void,
  _get: () => AgencyOpsState,
) {
  // Pending-mutation counters exposed so components can disable buttons.

  // Query registries (Map key = JSON.stringify(queryKey)).
  // Refcounted so concurrently-mounted components sharing the same query key
  // don't evict one another's registration on unmount.
  type RefCounted<T> = { payload: T; count: number };
  const clientsQueryRegistry = new Map<string, RefCounted<RegisteredClientsQuery>>();
  const projectsQueryRegistry = new Map<string, RefCounted<RegisteredProjectsQuery>>();
  const projectTasksQueryRegistry = new Map<string, RefCounted<RegisteredProjectTasksQuery>>();
  const taskMessagesQueryRegistry = new Map<string, RefCounted<RegisteredTaskMessagesQuery>>();
  const contactsQueryRegistry = new Map<string, RefCounted<RegisteredContactQuery>>();
  const capacityQueryRegistry = new Map<string, RefCounted<RegisteredCapacityQuery>>();

  function optimistic() {
    return useAgencyOptimisticStore.getState();
  }

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
      data: getQueryClient().getQueryData(q.queryKey),
    }));
  }

  function restoreQuerySnapshots(snapshots: QuerySnapshot[]) {
    snapshots.forEach((s) => getQueryClient().setQueryData(s.queryKey, s.data));
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
    optimistic().upsertClient(teamId, client);
    clientsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      getQueryClient().setQueryData<AgencyClientsListQueryData | undefined>(
        reg.queryKey,
        (current) => {
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
        },
      );
    });
  }

  function patchUpdatedClient(teamId: string, clientId: string, patch: Partial<AgencyClient>) {
    optimistic().updateClient(teamId, clientId, patch);
    clientsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      getQueryClient().setQueryData<AgencyClientsListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((c) => (c.id === clientId ? { ...c, ...patch } : c)),
          };
        },
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Projects cache patchers
  // ---------------------------------------------------------------------------

  function patchInsertedProject(teamId: string, project: AgencyProject) {
    optimistic().upsertProject(teamId, project);
    projectsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      // If the registry entry is scoped to a specific clientId, only patch
      // if it matches (or if it's a catch-all listing all clients).
      if (reg.clientId && reg.clientId !== project.clientId) return;
      getQueryClient().setQueryData<AgencyProjectsListQueryData | undefined>(
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

  // ---------------------------------------------------------------------------
  // Project tasks cache patchers
  // ---------------------------------------------------------------------------

  function patchInsertedProjectTask(teamId: string, task: AgencyProjectTask) {
    optimistic().upsertTask(teamId, task);
    patchInsertedProjectTaskInCache(teamId, task);
  }

  function patchUpdatedProjectTask(teamId: string, task: AgencyProjectTask) {
    optimistic().upsertTask(teamId, task);
    patchUpdatedProjectTaskInCache(teamId, task);
  }

  function patchDeletedProjectTask(teamId: string, taskId: string) {
    optimistic().deleteTask(teamId, taskId);
    patchDeletedProjectTaskInCache(teamId, taskId);
  }

  async function syncProjectTaskQueriesAfterMutation(teamId: string) {
    const userId = getAgencyTimeTrackingUserId();
    await refetchAgencyProjectTaskListQueries(
      teamId,
      userId !== "unknown-user" ? userId : undefined,
    );
  }

  function patchInsertedTaskMessage(teamId: string, taskId: string, message: AgencyTaskMessage) {
    optimistic().upsertTaskMessage(teamId, taskId, message);
    taskMessagesQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId || reg.taskId !== taskId) return;
      getQueryClient().setQueryData<AgencyTaskMessagesListQueryData | undefined>(
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
    optimistic().setContact(teamId, clientId, contact);
    contactsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId || reg.clientId !== clientId) return;
      getQueryClient().setQueryData(reg.queryKey, contact);
    });
  }

  function patchCapacityCell(
    teamId: string,
    userId: string,
    weekStart: string,
    capacitySeconds: number,
  ) {
    optimistic().setCapacityCell(teamId, weekStart, userId, capacitySeconds);
    capacityQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      getQueryClient().setQueryData<AgencyCapacityListQueryData | undefined>(
        reg.queryKey,
        (current) => {
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
        },
      );
    });
  }

  function reconcileCreatedClient(
    teamId: string,
    optimisticIdValue: string,
    created: AgencyClient,
  ) {
    optimistic().reconcileClient(teamId, optimisticIdValue, created);
    clientsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      getQueryClient().setQueryData<AgencyClientsListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((client) =>
              client.id === optimisticIdValue ? created : client,
            ),
          };
        },
      );
    });
  }

  function reconcileCreatedProject(
    teamId: string,
    optimisticIdValue: string,
    created: AgencyProject,
  ) {
    optimistic().reconcileProject(teamId, optimisticIdValue, created);
    projectsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      if (reg.clientId && reg.clientId !== created.clientId) return;
      getQueryClient().setQueryData<AgencyProjectsListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((project) =>
              project.id === optimisticIdValue ? created : project,
            ),
          };
        },
      );
    });
  }

  function reconcileCreatedTask(
    teamId: string,
    optimisticIdValue: string,
    created: AgencyProjectTask,
  ) {
    optimistic().reconcileTask(teamId, optimisticIdValue, created);
    reconcileCreatedProjectTaskInCache(teamId, optimisticIdValue, created);
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
    const optimisticSnapshot = optimistic().snapshotClients(payload.teamId);
    const nowIso = new Date().toISOString();
    const optimisticClient: AgencyClient = {
      id: optimisticId("client"),
      teamId: payload.teamId,
      name: payload.name.trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    set((state) => ({ ...state, clientMutationCount: state.clientMutationCount + 1 }));

    try {
      patchInsertedClient(payload.teamId, optimisticClient);

      const created = (await orpcClient.agencyOps.clients.create({
        teamId: payload.teamId,
        name: payload.name.trim(),
      })) as AgencyClient;

      reconcileCreatedClient(payload.teamId, optimisticClient.id, created);
      callbacks?.onSuccess?.(created.id);

      toast.success("Client created", { description: payload.name.trim() });
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreClients(payload.teamId, optimisticSnapshot);
      toast.error("Couldn't create client", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        clientMutationCount: Math.max(0, state.clientMutationCount - 1),
      }));
    }
  }

  async function updateClient(payload: UpdateClientPayload) {
    if (!payload.teamId || !payload.name.trim()) return;

    const snapshots = snapshotQueries(registryPayloads(clientsQueryRegistry));
    const optimisticSnapshot = optimistic().snapshotClients(payload.teamId);
    const nowIso = new Date().toISOString();

    set((state) => ({ ...state, clientMutationCount: state.clientMutationCount + 1 }));

    try {
      patchUpdatedClient(payload.teamId, payload.clientId, {
        name: payload.name.trim(),
        updatedAt: nowIso,
      });

      const updated = (await orpcClient.agencyOps.clients.update({
        teamId: payload.teamId,
        clientId: payload.clientId,
        name: payload.name.trim(),
      })) as AgencyClient;

      patchUpdatedClient(payload.teamId, payload.clientId, updated);

      toast.success("Renamed", { description: payload.name.trim() });
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreClients(payload.teamId, optimisticSnapshot);
      toast.error("Couldn't rename", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        clientMutationCount: Math.max(0, state.clientMutationCount - 1),
      }));
    }
  }

  async function createProject(payload: CreateProjectPayload) {
    if (!payload.teamId || !payload.clientId || !payload.name.trim()) return;

    const snapshots = snapshotQueries(registryPayloads(projectsQueryRegistry));
    const optimisticSnapshot = optimistic().snapshotProjects(payload.teamId);
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

    set((state) => ({ ...state, projectMutationCount: state.projectMutationCount + 1 }));

    try {
      patchInsertedProject(payload.teamId, optimisticProject);

      const created = (await orpcClient.agencyOps.projects.create({
        teamId: payload.teamId,
        clientId: payload.clientId,
        name: payload.name.trim(),
      })) as AgencyProject;

      reconcileCreatedProject(payload.teamId, optimisticProject.id, created);

      toast.success("Project added", { description: payload.name.trim() });
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreProjects(payload.teamId, optimisticSnapshot);
      toast.error("Couldn't add project", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        projectMutationCount: Math.max(0, state.projectMutationCount - 1),
      }));
    }
  }

  async function createProjectTask(payload: CreateProjectTaskPayload): Promise<boolean> {
    const title = payload.title.trim();
    if (!payload.teamId || !payload.projectId || !title) return false;

    const snapshots = snapshotQueries(registryPayloads(projectTasksQueryRegistry));
    const optimisticSnapshot = optimistic().snapshotTasks(payload.teamId);
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

    set((state) => ({ ...state, isCreatingTask: true }));

    try {
      await cancelAgencyProjectTaskListQueries(payload.teamId);
      patchInsertedProjectTask(payload.teamId, optimisticTask);

      const created = (await orpcClient.agencyOps.projectTasks.create({
        teamId: payload.teamId,
        projectId: payload.projectId,
        title,
        status: payload.status,
        assigneeUserId: payload.assigneeUserId,
        dueDate: payload.dueDate,
      })) as AgencyProjectTask;

      reconcileCreatedTask(payload.teamId, optimisticTask.id, created);

      toast.success("Task added", { description: title });
      await syncProjectTaskQueriesAfterMutation(payload.teamId);
      return true;
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreTasks(payload.teamId, optimisticSnapshot);
      toast.error("Couldn't add task", { description: getErrorMessage(error, "Try again.") });
      return false;
    } finally {
      set((state) => ({ ...state, isCreatingTask: false }));
    }
  }

  async function deleteProjectTask(payload: DeleteProjectTaskPayload) {
    if (!payload.teamId || !payload.taskId) return;

    const snapshots = snapshotQueries(registryPayloads(projectTasksQueryRegistry));
    const optimisticSnapshot = optimistic().snapshotTasks(payload.teamId);
    set((state) => ({
      ...state,
      deletingTaskIds: [...new Set([...state.deletingTaskIds, payload.taskId])],
    }));

    try {
      await cancelAgencyProjectTaskListQueries(payload.teamId);
      patchDeletedProjectTask(payload.teamId, payload.taskId);

      await orpcClient.agencyOps.projectTasks.delete({
        teamId: payload.teamId,
        taskId: payload.taskId,
      });

      toast.success("Task deleted", { description: payload.taskTitle });
      await syncProjectTaskQueriesAfterMutation(payload.teamId);
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreTasks(payload.teamId, optimisticSnapshot);
      toast.error("Couldn't delete task", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        deletingTaskIds: state.deletingTaskIds.filter((id) => id !== payload.taskId),
      }));
    }
  }

  // ---------------------------------------------------------------------------
  // Client archive / unarchive
  // ---------------------------------------------------------------------------

  function patchRemovedClient(teamId: string, clientId: string) {
    optimistic().deleteClient(teamId, clientId);
    clientsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      getQueryClient().setQueryData<AgencyClientsListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.filter((c) => c.id !== clientId),
            total: Math.max(0, current.total - 1),
          };
        },
      );
    });
  }

  async function archiveClient(payload: ArchiveClientPayload) {
    if (!payload.teamId || !payload.clientId) return;

    const snapshots = snapshotQueries(registryPayloads(clientsQueryRegistry));
    const optimisticSnapshot = optimistic().snapshotClients(payload.teamId);
    set((state) => ({ ...state, clientMutationCount: state.clientMutationCount + 1 }));

    try {
      patchRemovedClient(payload.teamId, payload.clientId);

      await orpcClient.agencyOps.clients.archive({
        teamId: payload.teamId,
        clientId: payload.clientId,
      });

      toast.success("Client archived", { description: `${payload.clientName} has been archived.` });
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreClients(payload.teamId, optimisticSnapshot);
      toast.error("Couldn't archive client", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        clientMutationCount: Math.max(0, state.clientMutationCount - 1),
      }));
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

    set((state) => ({ ...state, contactMutationCount: state.contactMutationCount + 1 }));

    try {
      const contact = (await orpcClient.agencyOps.contacts.upsert({
        teamId: payload.teamId,
        clientId: payload.clientId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
      })) as AgencyContact;

      patchUpsertedContact(payload.teamId, payload.clientId, contact);

      callbacks?.onSuccess?.();
      optimistic().clearContact(payload.teamId, payload.clientId);
      toast.success("Contact saved");
    } catch (error) {
      toast.error("Couldn't save contact", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        contactMutationCount: Math.max(0, state.contactMutationCount - 1),
      }));
    }
  }

  // ---------------------------------------------------------------------------
  // Rates upsert
  // ---------------------------------------------------------------------------

  async function upsertRate(payload: UpsertRatePayload, callbacks?: { onSuccess?: () => void }) {
    if (!payload.teamId || !payload.userId) return;

    set((state) => ({ ...state, rateMutationCount: state.rateMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.rates.upsert({
        teamId: payload.teamId,
        userId: payload.userId,
        costRateCents: payload.costRateCents,
        billableRateCents: payload.billableRateCents,
        currency: payload.currency,
        effectiveFrom: payload.effectiveFrom,
      });

      await getQueryClient().invalidateQueries({
        queryKey: orpc.agencyOps.rates.list.key({ input: { teamId: payload.teamId } }),
      });

      callbacks?.onSuccess?.();
      toast.success("Rate saved");
    } catch (error) {
      toast.error("Couldn't save rate", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({ ...state, rateMutationCount: Math.max(0, state.rateMutationCount - 1) }));
    }
  }

  // ---------------------------------------------------------------------------
  // Capacity set
  // ---------------------------------------------------------------------------

  async function setCapacity(payload: SetCapacityPayload, callbacks?: { onSuccess?: () => void }) {
    if (!payload.teamId || !payload.userId) return;

    const snapshots = snapshotQueries(registryPayloads(capacityQueryRegistry));
    const capacityCellKey = `${payload.teamId}:${payload.weekStart}:${payload.userId}`;
    const previousCapacitySeconds =
      useAgencyOptimisticStore.getState().capacityCells[capacityCellKey];
    set((state) => ({ ...state, capacityMutationCount: state.capacityMutationCount + 1 }));

    try {
      patchCapacityCell(payload.teamId, payload.userId, payload.weekStart, payload.capacitySeconds);

      await orpcClient.agencyOps.capacity.set({
        teamId: payload.teamId,
        userId: payload.userId,
        weekStart: payload.weekStart,
        capacitySeconds: payload.capacitySeconds,
      });

      callbacks?.onSuccess?.();
      optimistic().clearCapacityCell(payload.teamId, payload.weekStart, payload.userId);
      toast.success("Capacity updated");
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      if (previousCapacitySeconds === undefined) {
        optimistic().clearCapacityCell(payload.teamId, payload.weekStart, payload.userId);
      } else {
        optimistic().setCapacityCell(
          payload.teamId,
          payload.weekStart,
          payload.userId,
          previousCapacitySeconds,
        );
      }
      toast.error("Couldn't update capacity", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      set((state) => ({
        ...state,
        capacityMutationCount: Math.max(0, state.capacityMutationCount - 1),
      }));
    }
  }

  function getCachedProjectTask(teamId: string, taskId: string): AgencyProjectTask | null {
    return optimistic().findTask(teamId, taskId) ?? findProjectTaskInCache(teamId, taskId);
  }

  async function updateProjectTask(payload: UpdateProjectTaskPayload) {
    if (!payload.teamId || !payload.taskId) return;

    const current = getCachedProjectTask(payload.teamId, payload.taskId);
    const snapshots = snapshotQueries(registryPayloads(projectTasksQueryRegistry));
    const optimisticSnapshot = optimistic().snapshotTasks(payload.teamId);
    const nowIso = new Date().toISOString();

    set((state) => ({
      ...state,
      pendingTaskIds: [...new Set([...state.pendingTaskIds, payload.taskId])],
    }));

    if (!current) {
      try {
        await cancelAgencyProjectTaskListQueries(payload.teamId);
        const updated = (await orpcClient.agencyOps.projectTasks.update({
          teamId: payload.teamId,
          taskId: payload.taskId,
          title: payload.title,
          status: payload.status,
          assigneeUserId: payload.assigneeUserId,
          dueDate: payload.dueDate,
        })) as AgencyProjectTask;

        patchUpdatedProjectTask(payload.teamId, updated);
        await syncProjectTaskQueriesAfterMutation(payload.teamId);
      } catch (error) {
        toast.error("Couldn't update task", { description: getErrorMessage(error, "Try again.") });
        throw error;
      } finally {
        set((state) => ({
          ...state,
          pendingTaskIds: state.pendingTaskIds.filter((id) => id !== payload.taskId),
        }));
      }
      return;
    }

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
      await cancelAgencyProjectTaskListQueries(payload.teamId);
      patchUpdatedProjectTask(payload.teamId, optimisticTask);

      const updated = (await orpcClient.agencyOps.projectTasks.update({
        teamId: payload.teamId,
        taskId: payload.taskId,
        title: payload.title,
        status: payload.status,
        assigneeUserId: payload.assigneeUserId,
        dueDate: payload.dueDate,
      })) as AgencyProjectTask;

      patchUpdatedProjectTask(payload.teamId, updated);
      await syncProjectTaskQueriesAfterMutation(payload.teamId);
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreTasks(payload.teamId, optimisticSnapshot);
      toast.error("Couldn't update task", { description: getErrorMessage(error, "Try again.") });
      throw error;
    } finally {
      set((state) => ({
        ...state,
        pendingTaskIds: state.pendingTaskIds.filter((id) => id !== payload.taskId),
      }));
    }
  }

  async function sendTaskMessage(payload: SendTaskMessagePayload) {
    if (!payload.teamId || !payload.taskId) return;

    const snapshots = snapshotQueries(registryPayloads(taskMessagesQueryRegistry));
    const optimisticSnapshot = optimistic().snapshotTaskMessages(payload.teamId, payload.taskId);
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

      const created = (await orpcClient.agencyOps.taskThreads.messages.create({
        teamId: payload.teamId,
        taskId: payload.taskId,
        content: payload.content,
        type: payload.type,
        attachments: payload.attachments as Parameters<
          typeof orpcClient.agencyOps.taskThreads.messages.create
        >[0]["attachments"],
      })) as AgencyTaskMessage;

      optimistic().reconcileTaskMessage(
        payload.teamId,
        payload.taskId,
        optimisticMessage.id,
        created,
      );

      taskMessagesQueryRegistry.forEach(({ payload: reg }) => {
        if (reg.teamId !== payload.teamId || reg.taskId !== payload.taskId) return;
        getQueryClient().setQueryData<AgencyTaskMessagesListQueryData | undefined>(
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
      optimistic().restoreTaskMessages(payload.teamId, payload.taskId, optimisticSnapshot);
      throw error;
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

    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.invoices.create({
        teamId: payload.teamId,
        clientId: payload.clientId,
        periodStart: payload.periodStart,
        periodEnd: payload.periodEnd,
        currency: payload.currency,
      });

      await Promise.all([
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.invoices.list.key({ input: { teamId: payload.teamId } }),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.invoices.summary.key({ input: { teamId: payload.teamId } }),
        }),
      ]);

      callbacks?.onSuccess?.();
      toast.success("Invoice draft created", {
        description: `${payload.clientName} — draft added to Billing.`,
      });
    } catch (error) {
      toast.error("Couldn't create invoice", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function updateInvoiceStatus(
    payload: { teamId: string; invoiceId: string; status: "sent" | "paid" },
    callbacks?: { onSuccess?: () => void },
  ) {
    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.invoices.updateStatus(payload);

      await Promise.all([
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.invoices.list.key({ input: { teamId: payload.teamId } }),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.invoices.summary.key({ input: { teamId: payload.teamId } }),
        }),
      ]);

      callbacks?.onSuccess?.();
      const label = payload.status === "sent" ? "Invoice sent" : "Invoice marked paid";
      toast.success(label);
    } catch (error) {
      toast.error("Couldn't update invoice", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  return {
    registerClientsQuery,
    unregisterClientsQuery,
    registerProjectsQuery,
    unregisterProjectsQuery,
    registerProjectTasksQuery,
    unregisterProjectTasksQuery,
    registerTaskMessagesQuery,
    unregisterTaskMessagesQuery,
    registerContactQuery,
    unregisterContactQuery,
    registerCapacityQuery,
    unregisterCapacityQuery,
    createClient,
    updateClient,
    archiveClient,
    createProject,
    createProjectTask,
    updateProjectTask,
    deleteProjectTask,
    sendTaskMessage,
    upsertContact,
    upsertRate,
    setCapacity,
    createInvoice,
    updateInvoiceStatus,
  };
}

export const useAgencyOpsStore = create<AgencyOpsState>((set, get) => ({
  clientMutationCount: 0,
  projectMutationCount: 0,
  isCreatingTask: false,
  pendingTaskIds: [],
  deletingTaskIds: [],
  contactMutationCount: 0,
  rateMutationCount: 0,
  capacityMutationCount: 0,
  invoiceMutationCount: 0,
  ...createAgencyOpsActions(set, get),
}));

export const selectIsClientMutationPending = (s: AgencyOpsState) => s.clientMutationCount > 0;
export const selectIsProjectMutationPending = (s: AgencyOpsState) => s.projectMutationCount > 0;
export const selectIsCreatingTask = (s: AgencyOpsState) => s.isCreatingTask;
export const selectIsTaskRowPending = (taskId: string) => (s: AgencyOpsState) =>
  s.pendingTaskIds.includes(taskId);
export const selectIsTaskMutationPending = (s: AgencyOpsState) =>
  s.isCreatingTask || s.pendingTaskIds.length > 0;
export const selectIsContactMutationPending = (s: AgencyOpsState) => s.contactMutationCount > 0;
export const selectIsRateMutationPending = (s: AgencyOpsState) => s.rateMutationCount > 0;
export const selectIsCapacityMutationPending = (s: AgencyOpsState) => s.capacityMutationCount > 0;
export const selectIsInvoiceMutationPending = (s: AgencyOpsState) => s.invoiceMutationCount > 0;
