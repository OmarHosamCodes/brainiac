import { create } from "zustand";
import { QueryClient } from "@tanstack/react-query";

// Types (mirrored from API shapes)
export type AgencyClient = {
  id: string;
  teamId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type AgencyProject = {
  id: string;
  teamId: string;
  clientId: string;
  clientName: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type AgencyTag = {
  id: string;
  teamId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type QueryKey = readonly unknown[];

export type AgencyClientsListQueryData = {
  items: AgencyClient[];
  page: number;
  pageSize: number;
  total: number;
};

export type AgencyProjectsListQueryData = {
  items: AgencyProject[];
  page: number;
  pageSize: number;
  total: number;
};

export type AgencyTagsListQueryData = {
  items: AgencyTag[];
  page: number;
  pageSize: number;
  total: number;
};

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
  clientId?: string;
};

type RegisteredTagsQuery = {
  queryKey: QueryKey;
  teamId: string;
};

export type AgencyOpsStore = {
  // Query registry
  clientsQueryRegistry: Map<string, RegisteredClientsQuery>;
  projectsQueryRegistry: Map<string, RegisteredProjectsQuery>;
  tagsQueryRegistry: Map<string, RegisteredTagsQuery>;

  registerClientsQuery: (payload: RegisteredClientsQuery) => void;
  unregisterClientsQuery: (queryKey: QueryKey) => void;
  registerProjectsQuery: (payload: RegisteredProjectsQuery) => void;
  unregisterProjectsQuery: (queryKey: QueryKey) => void;
  registerTagsQuery: (payload: RegisteredTagsQuery) => void;
  unregisterTagsQuery: (queryKey: QueryKey) => void;

  // Helpers
  snapshotQueries: (queries: Iterable<{ queryKey: QueryKey }>, queryClient: QueryClient) => QuerySnapshot[];
  restoreQuerySnapshots: (snapshots: QuerySnapshot[], queryClient: QueryClient) => void;
  getRegisteredClientsQueries: (teamId: string) => RegisteredClientsQuery[];
  getRegisteredProjectsQueries: (teamId: string, clientId?: string) => RegisteredProjectsQuery[];
  getRegisteredTagsQueries: (teamId: string) => RegisteredTagsQuery[];

  // Client operations
  patchInsertedClient: (teamId: string, client: AgencyClient, queryClient: QueryClient) => void;
  patchUpdatedClient: (teamId: string, client: AgencyClient, queryClient: QueryClient) => void;
  patchDeletedClient: (teamId: string, clientId: string, queryClient: QueryClient) => void;

  // Project operations
  patchInsertedProject: (teamId: string, project: AgencyProject, queryClient: QueryClient) => void;
  patchUpdatedProject: (teamId: string, project: AgencyProject, queryClient: QueryClient) => void;
  patchDeletedProject: (teamId: string, projectId: string, queryClient: QueryClient) => void;

  // Tag operations
  patchInsertedTag: (teamId: string, tag: AgencyTag, queryClient: QueryClient) => void;
  patchUpdatedTag: (teamId: string, tag: AgencyTag, queryClient: QueryClient) => void;
  patchDeletedTag: (teamId: string, tagId: string, queryClient: QueryClient) => void;

  // Invalidation
  invalidateClientsQueries: (teamId: string, queryClient: QueryClient) => Promise<void>;
  invalidateProjectsQueries: (teamId: string, queryClient: QueryClient) => Promise<void>;
  invalidateTagsQueries: (teamId: string, queryClient: QueryClient) => Promise<void>;
};

export const useAgencyOpsStore = create<AgencyOpsStore>((_set, get) => ({
  // Initial state
  clientsQueryRegistry: new Map(),
  projectsQueryRegistry: new Map(),
  tagsQueryRegistry: new Map(),

  // Query registry methods
  registerClientsQuery: (payload) => {
    const registry = get().clientsQueryRegistry;
    registry.set(getRegistryKey(payload.queryKey), payload);
  },

  unregisterClientsQuery: (queryKey) => {
    get().clientsQueryRegistry.delete(getRegistryKey(queryKey));
  },

  registerProjectsQuery: (payload) => {
    const registry = get().projectsQueryRegistry;
    registry.set(getRegistryKey(payload.queryKey), payload);
  },

  unregisterProjectsQuery: (queryKey) => {
    get().projectsQueryRegistry.delete(getRegistryKey(queryKey));
  },

  registerTagsQuery: (payload) => {
    const registry = get().tagsQueryRegistry;
    registry.set(getRegistryKey(payload.queryKey), payload);
  },

  unregisterTagsQuery: (queryKey) => {
    get().tagsQueryRegistry.delete(getRegistryKey(queryKey));
  },

  // Helpers
  snapshotQueries: (queries, queryClient) => {
    return [...queries].map((query) => ({
      queryKey: query.queryKey,
      data: queryClient.getQueryData(query.queryKey),
    }));
  },

  restoreQuerySnapshots: (snapshots, queryClient) => {
    snapshots.forEach((snapshot) => {
      queryClient.setQueryData(snapshot.queryKey, snapshot.data);
    });
  },

  getRegisteredClientsQueries: (teamId) => {
    return [...get().clientsQueryRegistry.values()].filter((q) => q.teamId === teamId);
  },

  getRegisteredProjectsQueries: (teamId, clientId) => {
    return [...get().projectsQueryRegistry.values()].filter(
      (q) => q.teamId === teamId && (!clientId || q.clientId === clientId),
    );
  },

  getRegisteredTagsQueries: (teamId) => {
    return [...get().tagsQueryRegistry.values()].filter((q) => q.teamId === teamId);
  },

  // Client patches
  patchInsertedClient: (teamId, client, queryClient) => {
    get()
      .getRegisteredClientsQueries(teamId)
      .forEach((registeredQuery) => {
        queryClient.setQueryData<AgencyClientsListQueryData | undefined>(
          registeredQuery.queryKey,
          (current) => {
            if (!current) return current;

            return {
              ...current,
              items: [client, ...current.items],
              total: current.total + 1,
            };
          },
        );
      });
  },

  patchUpdatedClient: (teamId, client, queryClient) => {
    get()
      .getRegisteredClientsQueries(teamId)
      .forEach((registeredQuery) => {
        queryClient.setQueryData<AgencyClientsListQueryData | undefined>(
          registeredQuery.queryKey,
          (current) => {
            if (!current) return current;

            return {
              ...current,
              items: current.items.map((item) => (item.id === client.id ? client : item)),
            };
          },
        );
      });
  },

  patchDeletedClient: (teamId, clientId, queryClient) => {
    get()
      .getRegisteredClientsQueries(teamId)
      .forEach((registeredQuery) => {
        queryClient.setQueryData<AgencyClientsListQueryData | undefined>(
          registeredQuery.queryKey,
          (current) => {
            if (!current) return current;

            return {
              ...current,
              items: current.items.filter((item) => item.id !== clientId),
              total: Math.max(0, current.total - 1),
            };
          },
        );
      });

    // Also delete associated projects
    get()
      .getRegisteredProjectsQueries(teamId, clientId)
      .forEach((registeredQuery) => {
        queryClient.setQueryData<AgencyProjectsListQueryData | undefined>(
          registeredQuery.queryKey,
          (current) => {
            if (!current) return current;

            const deletedCount = current.items.filter((p) => p.clientId === clientId).length;

            return {
              ...current,
              items: current.items.filter((p) => p.clientId !== clientId),
              total: Math.max(0, current.total - deletedCount),
            };
          },
        );
      });
  },

  // Project patches
  patchInsertedProject: (teamId, project, queryClient) => {
    get()
      .getRegisteredProjectsQueries(teamId)
      .forEach((registeredQuery) => {
        queryClient.setQueryData<AgencyProjectsListQueryData | undefined>(
          registeredQuery.queryKey,
          (current) => {
            if (!current) return current;

            // Only insert if clientId matches or no filter is set
            if (registeredQuery.clientId && registeredQuery.clientId !== project.clientId) {
              return current;
            }

            return {
              ...current,
              items: [project, ...current.items],
              total: current.total + 1,
            };
          },
        );
      });
  },

  patchUpdatedProject: (teamId, project, queryClient) => {
    get()
      .getRegisteredProjectsQueries(teamId)
      .forEach((registeredQuery) => {
        queryClient.setQueryData<AgencyProjectsListQueryData | undefined>(
          registeredQuery.queryKey,
          (current) => {
            if (!current) return current;

            return {
              ...current,
              items: current.items.map((item) => (item.id === project.id ? project : item)),
            };
          },
        );
      });
  },

  patchDeletedProject: (teamId, projectId, queryClient) => {
    get()
      .getRegisteredProjectsQueries(teamId)
      .forEach((registeredQuery) => {
        queryClient.setQueryData<AgencyProjectsListQueryData | undefined>(
          registeredQuery.queryKey,
          (current) => {
            if (!current) return current;

            return {
              ...current,
              items: current.items.filter((item) => item.id !== projectId),
              total: Math.max(0, current.total - 1),
            };
          },
        );
      });
  },

  // Tag patches
  patchInsertedTag: (teamId, tag, queryClient) => {
    get()
      .getRegisteredTagsQueries(teamId)
      .forEach((registeredQuery) => {
        queryClient.setQueryData<AgencyTagsListQueryData | undefined>(
          registeredQuery.queryKey,
          (current) => {
            if (!current) return current;

            return {
              ...current,
              items: [tag, ...current.items],
              total: current.total + 1,
            };
          },
        );
      });
  },

  patchUpdatedTag: (teamId, tag, queryClient) => {
    get()
      .getRegisteredTagsQueries(teamId)
      .forEach((registeredQuery) => {
        queryClient.setQueryData<AgencyTagsListQueryData | undefined>(
          registeredQuery.queryKey,
          (current) => {
            if (!current) return current;

            return {
              ...current,
              items: current.items.map((item) => (item.id === tag.id ? tag : item)),
            };
          },
        );
      });
  },

  patchDeletedTag: (teamId, tagId, queryClient) => {
    get()
      .getRegisteredTagsQueries(teamId)
      .forEach((registeredQuery) => {
        queryClient.setQueryData<AgencyTagsListQueryData | undefined>(
          registeredQuery.queryKey,
          (current) => {
            if (!current) return current;

            return {
              ...current,
              items: current.items.filter((item) => item.id !== tagId),
              total: Math.max(0, current.total - 1),
            };
          },
        );
      });
  },

  // Invalidation
  invalidateClientsQueries: async (teamId, queryClient) => {
    await Promise.all(
      get()
        .getRegisteredClientsQueries(teamId)
        .map((q) => queryClient.invalidateQueries({ queryKey: [...q.queryKey] })),
    );
  },

  invalidateProjectsQueries: async (teamId, queryClient) => {
    await Promise.all(
      get()
        .getRegisteredProjectsQueries(teamId)
        .map((q) => queryClient.invalidateQueries({ queryKey: [...q.queryKey] })),
    );
  },

  invalidateTagsQueries: async (teamId, queryClient) => {
    await Promise.all(
      get()
        .getRegisteredTagsQueries(teamId)
        .map((q) => queryClient.invalidateQueries({ queryKey: [...q.queryKey] })),
    );
  },
}));

function getRegistryKey(queryKey: QueryKey): string {
  return JSON.stringify(queryKey);
}
