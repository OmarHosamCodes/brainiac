import {
  cloneWorkspaceNodes,
  createDefaultWorkspaceTab,
  DEFAULT_WORKSPACE_NODE_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
  DEFAULT_WORKSPACE_NODE_WIDTH,
  getWorkspaceNodeDashboardSelectableBlocks,
  normalizeWorkspaceNode,
  type WorkspaceNode,
  type WorkspaceNodeDashboardFeaturedBlock,
  type WorkspaceNodeDashboardSelectableBlock,
  type WorkspaceNodeTint,
  type WorkspaceNodeType,
} from "@brainiac/workspace";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { create } from "zustand";

import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/utils/get-error-message";
import { sanitizeConnections } from "@/utils/workspace-node-connections";

type EditorMode = "create" | "edit";
type SaveState = "idle" | "saving" | "saved" | "error";
type NodePosition = {
  x: number;
  y: number;
};
type WorkspaceConnectionPair = {
  orchestratorNodeId: string;
  standardNodeId: string;
};

type WorkspaceStore = {
  // State
  nodes: WorkspaceNode[];
  selectedNodeIds: string[];
  editorOpen: boolean;
  editorMode: EditorMode;
  activeNodeId: string | null;
  pendingNodePosition: NodePosition | null;
  loadApplied: boolean;
  isHydratingWorkspace: boolean;
  saveState: SaveState;
  saveError: string | null;
  syncedAt: string | null;
  isPreloadingWorkspace: boolean;
  localRevision: number;
  syncedRevision: number;
  queryClient: QueryClient | null;
  workspaceQueryKey: QueryKey | null;
  nodeDraft: {
    title: string;
    content: string;
    nodeType: WorkspaceNodeType;
    tint: WorkspaceNodeTint;
    featuredBlocks: WorkspaceNodeDashboardFeaturedBlock[];
  };

  // Computed
  workspaceReadyForEdits: (authSessionExists: boolean) => boolean;
  isWorkspaceInitialLoading: (authSessionExists: boolean) => boolean;
  isWorkspaceRefreshing: () => boolean;
  hasWorkspaceLoaded: () => boolean;
  isDraftValid: () => boolean;
  editorBlockOptions: () => WorkspaceNodeDashboardSelectableBlock[];
  hasPendingLocalChanges: () => boolean;
  saveBadge: () => {
    label: string;
    className: string;
  };

  // Actions
  resetDraft: () => void;
  closeEditor: () => void;
  resetWorkspaceState: () => void;
  applyRemoteSnapshot: (
    remoteNodes: WorkspaceNode[],
    updatedAt: string | null,
  ) => void;
  applyWorkspaceSnapshot: (
    remoteNodes: WorkspaceNode[],
    updatedAt: string | null,
  ) => void;
  preloadWorkspace: (
    authSessionExists: boolean,
    queryClient: QueryClient,
  ) => Promise<void>;
  persistWorkspace: (
    snapshot: WorkspaceNode[],
    revision: number,
  ) => Promise<void>;
  scheduleWorkspaceSave: (delay?: number) => void;
  setWorkspaceQueryContext: (payload: {
    queryClient: QueryClient;
    queryKey: QueryKey;
  }) => void;
  handleRemoteWorkspace: (
    remoteWorkspace: { nodes: WorkspaceNode[]; updatedAt: string | null } | null | undefined,
  ) => void;
  findNode: (nodeId: string) => WorkspaceNode | null;
  updateNodes: (mutator: (draft: WorkspaceNode[]) => void) => void;
  openCreateNode: (payload: NodePosition) => void;
  openEditNode: (payload: { nodeId: string }) => void;
  removeNode: (payload: { nodeId: string }) => void;
  connectNodePair: (payload: WorkspaceConnectionPair) => void;
  disconnectNodePair: (payload: WorkspaceConnectionPair) => void;
  submitNodeEditor: () => void;
  
  // Internal state
  _saveTimer: ReturnType<typeof setTimeout> | null;
  _retryTimer: ReturnType<typeof setTimeout> | null;
  _setSaveTimer: (timer: ReturnType<typeof setTimeout> | null) => void;
  _setRetryTimer: (timer: ReturnType<typeof setTimeout> | null) => void;
};

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  // Initial state
  nodes: [],
  selectedNodeIds: [],
  editorOpen: false,
  editorMode: "create",
  activeNodeId: null,
  pendingNodePosition: null,
  loadApplied: false,
  isHydratingWorkspace: false,
  saveState: "idle",
  saveError: null,
  syncedAt: null,
  isPreloadingWorkspace: false,
  localRevision: 0,
  syncedRevision: 0,
  queryClient: null,
  workspaceQueryKey: null,
  nodeDraft: {
    title: "",
    content: "",
    nodeType: "standard",
    tint: "neutral",
    featuredBlocks: [],
  },
  _saveTimer: null,
  _retryTimer: null,

  // Computed getters
  workspaceReadyForEdits: (authSessionExists: boolean) => {
    const state = get();
    return authSessionExists && state.loadApplied && !state.isHydratingWorkspace;
  },

  isWorkspaceInitialLoading: (authSessionExists: boolean) => {
    const state = get();
    return (
      authSessionExists &&
      !state.loadApplied &&
      state.isPreloadingWorkspace
    );
  },

  isWorkspaceRefreshing: () => {
    const state = get();
    return state.loadApplied && state.isPreloadingWorkspace;
  },

  hasWorkspaceLoaded: () => get().loadApplied,

  isDraftValid: () => get().nodeDraft.title.trim().length > 0,

  editorBlockOptions: () => {
    const state = get();
    if (!state.activeNodeId) {
      return [];
    }

    const node = state.findNode(state.activeNodeId);
    return node ? getWorkspaceNodeDashboardSelectableBlocks(node) : [];
  },

  hasPendingLocalChanges: () => {
    const state = get();
    return state.localRevision > state.syncedRevision || !!state._saveTimer;
  },

  saveBadge: () => {
    const state = get();
    switch (state.saveState) {
      case "saving":
        return {
          label: "Syncing",
          className: "border-warning/40 bg-warning/10 text-warning",
        };
      case "saved":
        return {
          label: "Synced",
          className: "border-success/40 bg-success/10 text-success",
        };
      case "error":
        return {
          label: "Sync issue",
          className: "border-error/40 bg-error/10 text-error",
        };
      default:
        return {
          label: "Live",
          className: "border-muted/60 bg-elevated/80 text-toned",
        };
    }
  },

  // Actions
  _setSaveTimer: (timer) => set({ _saveTimer: timer }),
  _setRetryTimer: (timer) => set({ _retryTimer: timer }),

  setWorkspaceQueryContext: ({ queryClient, queryKey }) => {
    set({
      queryClient,
      workspaceQueryKey: queryKey,
    });
  },

  resetDraft: () =>
    set({
      nodeDraft: {
        title: "",
        content: "",
        nodeType: "standard",
        tint: "neutral",
        featuredBlocks: [],
      },
    }),

  closeEditor: () => {
    set({
      editorOpen: false,
      activeNodeId: null,
      pendingNodePosition: null,
    });
    get().resetDraft();
  },

  resetWorkspaceState: () => {
    const state = get();
    if (state._saveTimer) clearTimeout(state._saveTimer);
    if (state._retryTimer) clearTimeout(state._retryTimer);

    set({
      nodes: [],
      selectedNodeIds: [],
      editorOpen: false,
      activeNodeId: null,
      pendingNodePosition: null,
      loadApplied: false,
      isHydratingWorkspace: false,
      saveState: "idle",
      saveError: null,
      syncedAt: null,
      isPreloadingWorkspace: false,
      localRevision: 0,
      syncedRevision: 0,
      _saveTimer: null,
      _retryTimer: null,
    });
    get().resetDraft();
  },

  applyRemoteSnapshot: (remoteNodes: WorkspaceNode[], updatedAt: string | null) => {
    const state = get();
    set({
      isHydratingWorkspace: true,
      nodes: remoteNodes.map(normalizeWorkspaceNode),
      selectedNodeIds: state.selectedNodeIds.filter((nodeId) =>
        remoteNodes.some((node) => node.id === nodeId),
      ),
      loadApplied: true,
      syncedAt: updatedAt,
      syncedRevision: state.localRevision,
      saveState: "idle",
      saveError: null,
    });

    // Async hydration complete signal
    setTimeout(() => {
      set({ isHydratingWorkspace: false });
    }, 0);
  },

  applyWorkspaceSnapshot: (remoteNodes: WorkspaceNode[], updatedAt: string | null) => {
    const state = get();
    if (state._saveTimer) clearTimeout(state._saveTimer);
    if (state._retryTimer) clearTimeout(state._retryTimer);
    if (state.queryClient && state.workspaceQueryKey) {
      state.queryClient.setQueryData(state.workspaceQueryKey, {
        nodes: remoteNodes,
        updatedAt,
      });
    }

    get().applyRemoteSnapshot(remoteNodes, updatedAt);
  },

  handleRemoteWorkspace: (remoteWorkspace) => {
    if (!remoteWorkspace) {
      return;
    }

    const state = get();

    if (!state.loadApplied) {
      get().applyRemoteSnapshot(remoteWorkspace.nodes, remoteWorkspace.updatedAt);
      return;
    }

    if (remoteWorkspace.updatedAt === state.syncedAt) {
      return;
    }

    if (state.hasPendingLocalChanges()) {
      return;
    }

    get().applyRemoteSnapshot(remoteWorkspace.nodes, remoteWorkspace.updatedAt);
  },

  preloadWorkspace: async (authSessionExists, queryClient) => {
    if (!authSessionExists) {
      return;
    }

    const state = get();
    if (state.isPreloadingWorkspace) {
      return;
    }

    const queryOptions = orpc.workspace.get.queryOptions();
    get().setWorkspaceQueryContext({
      queryClient,
      queryKey: queryOptions.queryKey,
    });
    set({ isPreloadingWorkspace: true });

    try {
      const snapshot = await queryClient.ensureQueryData({
        ...queryOptions,
        staleTime: 30_000,
      });

      if (snapshot && !get().loadApplied) {
        get().applyRemoteSnapshot(snapshot.nodes, snapshot.updatedAt);
      }
    } finally {
      set({ isPreloadingWorkspace: false });
    }
  },

  persistWorkspace: async (snapshot, revision) => {
    try {
      const response = await orpc.workspace.save.call({
        nodes: snapshot,
      });

      const state = get();
      set({
        syncedRevision: Math.max(state.syncedRevision, revision),
        syncedAt: response.updatedAt,
      });

      if (revision < get().localRevision) {
        set({ saveState: "saving" });
        return;
      }

      set({
        saveState: "saved",
        saveError: null,
      });

      const nextState = get();
      if (nextState.queryClient && nextState.workspaceQueryKey) {
        await nextState.queryClient.invalidateQueries({
          queryKey: nextState.workspaceQueryKey,
        });
      }
    } catch (error) {
      if (revision < get().localRevision) {
        return;
      }

      set({
        saveState: "error",
        saveError: getErrorMessage(error, "Failed to sync workspace"),
      });

      const retryTimer = get()._retryTimer;
      if (retryTimer) clearTimeout(retryTimer);

      const nextRetryTimer = setTimeout(() => {
        get()._setRetryTimer(null);

        if (!get().workspaceReadyForEdits(true) || !get().hasPendingLocalChanges()) {
          return;
        }

        get().scheduleWorkspaceSave(0);
      }, 2_000);

      get()._setRetryTimer(nextRetryTimer);
    }
  },

  scheduleWorkspaceSave: (delay = 250) => {
    if (!get().workspaceReadyForEdits(true)) {
      return;
    }

    const saveTimer = get()._saveTimer;
    const retryTimer = get()._retryTimer;
    if (saveTimer) clearTimeout(saveTimer);
    if (retryTimer) clearTimeout(retryTimer);

    set({
      saveState: "saving",
      saveError: null,
      _saveTimer: null,
      _retryTimer: null,
    });

    const revision = get().localRevision;
    const snapshot = cloneWorkspaceNodes(get().nodes);
    const nextSaveTimer = setTimeout(() => {
      get()._setSaveTimer(null);
      void get().persistWorkspace(snapshot, revision);
    }, delay);

    get()._setSaveTimer(nextSaveTimer);
  },

  findNode: (nodeId: string) => {
    return get().nodes.find((node) => node.id === nodeId) ?? null;
  },

  updateNodes: (mutator: (draft: WorkspaceNode[]) => void) => {
    const state = get();
    if (!state.workspaceReadyForEdits(true)) {
      return;
    }

    const nextNodes = cloneWorkspaceNodes(state.nodes);
    mutator(nextNodes);

    set({
      nodes: nextNodes,
      selectedNodeIds: state.selectedNodeIds.filter((nodeId) =>
        nextNodes.some((node) => node.id === nodeId),
      ),
      localRevision: state.localRevision + 1,
    });
    get().scheduleWorkspaceSave();
  },

  openCreateNode: (payload: NodePosition) => {
    const state = get();
    if (!state.workspaceReadyForEdits(true)) {
      return;
    }

    set({
      editorMode: "create",
      pendingNodePosition: payload,
      activeNodeId: null,
      editorOpen: true,
    });
    get().resetDraft();
  },

  openEditNode: (payload: { nodeId: string }) => {
    const state = get();
    if (!state.workspaceReadyForEdits(true)) {
      return;
    }

    const node = state.findNode(payload.nodeId);
    if (!node) {
      return;
    }

    set({
      editorMode: "edit",
      activeNodeId: node.id,
      pendingNodePosition: null,
      nodeDraft: {
        title: node.title,
        content: node.content,
        nodeType: node.nodeType,
        tint: node.dashboard.tint,
        featuredBlocks: [...node.dashboard.featuredBlocks],
      },
      editorOpen: true,
    });
  },

  removeNode: (payload: { nodeId: string }) => {
    const state = get();
    if (!state.workspaceReadyForEdits(true)) {
      return;
    }

    const node = state.findNode(payload.nodeId);
    if (!node) {
      return;
    }

    get().updateNodes((draftNodes) => {
      const timestamp = new Date().toISOString();
      const nextNodes = draftNodes.filter((entry) => entry.id !== payload.nodeId);

      // Sanitize connections after removing node
      const sanitizedNodes = sanitizeConnections(nextNodes);
      sanitizedNodes.forEach((sanitizedNode, index) => {
        const currentNode = draftNodes[index];
        if (!currentNode) return;

        if (
          !currentNode.connections ||
          JSON.stringify(currentNode.connections) !== JSON.stringify(sanitizedNode.connections)
        ) {
          draftNodes[index] = normalizeWorkspaceNode({
            ...currentNode,
            connections: sanitizedNode.connections,
            updatedAt: timestamp,
          });
        }
      });

      draftNodes.splice(0, draftNodes.length, ...nextNodes);
    });

    void orpc.workspace.deleteNode
      .call({
        nodeId: payload.nodeId,
        ownerUserId: node.ownerUserId ?? undefined,
      })
      .catch(() => {
        const state = get();
        if (state.queryClient && state.workspaceQueryKey) {
          void state.queryClient.invalidateQueries({
            queryKey: state.workspaceQueryKey,
          });
        }
      });
  },

  connectNodePair: (payload: WorkspaceConnectionPair) => {
    get().updateNodes((draftNodes) => {
      const orchestratorIndex = draftNodes.findIndex(
        (node) => node.id === payload.orchestratorNodeId,
      );
      const standardNode = draftNodes.find((node) => node.id === payload.standardNodeId);

      if (orchestratorIndex < 0 || !standardNode) {
        return;
      }

      const orchestratorNode = draftNodes[orchestratorIndex];

      if (
        !orchestratorNode ||
        orchestratorNode.nodeType !== "orchestrator" ||
        standardNode.nodeType !== "standard" ||
        orchestratorNode.connections.some(
          (connection) => connection.targetNodeId === payload.standardNodeId,
        )
      ) {
        return;
      }

      const timestamp = new Date().toISOString();

      orchestratorNode.connections.push({
        targetNodeId: payload.standardNodeId,
      });
      draftNodes[orchestratorIndex] = normalizeWorkspaceNode({
        ...orchestratorNode,
        updatedAt: timestamp,
      });

      const sanitizedNodes = sanitizeConnections(draftNodes);
      sanitizedNodes.forEach((sanitizedNode, index) => {
        const currentNode = draftNodes[index];
        if (!currentNode) return;

        if (
          JSON.stringify(currentNode.connections) !== JSON.stringify(sanitizedNode.connections)
        ) {
          draftNodes[index] = normalizeWorkspaceNode({
            ...currentNode,
            connections: sanitizedNode.connections,
            updatedAt: timestamp,
          });
        }
      });
    });
  },

  disconnectNodePair: (payload: WorkspaceConnectionPair) => {
    get().updateNodes((draftNodes) => {
      const orchestratorIndex = draftNodes.findIndex(
        (node) => node.id === payload.orchestratorNodeId,
      );

      if (orchestratorIndex < 0) {
        return;
      }

      const orchestratorNode = draftNodes[orchestratorIndex];

      if (!orchestratorNode || orchestratorNode.nodeType !== "orchestrator") {
        return;
      }

      if (
        !orchestratorNode.connections.some(
          (connection) => connection.targetNodeId === payload.standardNodeId,
        )
      ) {
        return;
      }

      const timestamp = new Date().toISOString();

      orchestratorNode.connections = orchestratorNode.connections.filter(
        (connection) => connection.targetNodeId !== payload.standardNodeId,
      );
      draftNodes[orchestratorIndex] = normalizeWorkspaceNode({
        ...orchestratorNode,
        updatedAt: timestamp,
      });

      const sanitizedNodes = sanitizeConnections(draftNodes);
      sanitizedNodes.forEach((sanitizedNode, index) => {
        const currentNode = draftNodes[index];
        if (!currentNode) return;

        if (
          JSON.stringify(currentNode.connections) !== JSON.stringify(sanitizedNode.connections)
        ) {
          draftNodes[index] = normalizeWorkspaceNode({
            ...currentNode,
            connections: sanitizedNode.connections,
            updatedAt: timestamp,
          });
        }
      });
    });
  },

  submitNodeEditor: () => {
    const state = get();
    const title = state.nodeDraft.title.trim();

    if (!title) {
      return;
    }

    const content = state.nodeDraft.content.trim();
    const timestamp = new Date().toISOString();

    if (state.editorMode === "edit") {
      if (!state.activeNodeId) {
        return;
      }

      get().updateNodes((draftNodes) => {
        const nodeIndex = draftNodes.findIndex((node) => node.id === state.activeNodeId);

        if (nodeIndex < 0) {
          return;
        }

        const currentNode = draftNodes[nodeIndex];

        if (!currentNode) {
          return;
        }

        draftNodes[nodeIndex] = normalizeWorkspaceNode({
          ...currentNode,
          title,
          content,
          nodeType: state.nodeDraft.nodeType,
          connections:
            state.nodeDraft.nodeType === "orchestrator" ? currentNode.connections : [],
          dashboard: {
            tint: state.nodeDraft.tint,
            featuredBlocks: [...state.nodeDraft.featuredBlocks],
          },
          updatedAt: timestamp,
        });

        const sanitizedNodes = sanitizeConnections(draftNodes);
        sanitizedNodes.forEach((sanitizedNode, index) => {
          const currentNode = draftNodes[index];
          if (!currentNode) return;

          if (
            JSON.stringify(currentNode.connections) !== JSON.stringify(sanitizedNode.connections)
          ) {
            draftNodes[index] = normalizeWorkspaceNode({
              ...currentNode,
              connections: sanitizedNode.connections,
              updatedAt: timestamp,
            });
          }
        });
      });

      get().closeEditor();
      return;
    }

    const position = state.pendingNodePosition ?? { x: 0, y: 0 };
    const nextNode = normalizeWorkspaceNode({
      id: generateNodeId(),
      title,
      content,
      nodeType: state.nodeDraft.nodeType,
      connections: [],
      visibility: "private",
      x: position.x - 160,
      y: position.y - 110,
      width: DEFAULT_WORKSPACE_NODE_WIDTH,
      height: DEFAULT_WORKSPACE_NODE_HEIGHT,
      minWidth: DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
      minHeight: DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
      createdAt: timestamp,
      updatedAt: timestamp,
      tabs: [createDefaultWorkspaceTab("Overview", content)],
      customBlockTemplates: [],
      viewState: {
        activeTabId: null,
        notePreviewState: {},
      },
      dashboard: {
        tint: state.nodeDraft.tint,
        featuredBlocks: [],
      },
    });

    set({
      nodes: [...state.nodes, nextNode],
      selectedNodeIds: [nextNode.id],
      localRevision: state.localRevision + 1,
    });
    get().closeEditor();
    get().scheduleWorkspaceSave();
  },
}));

function generateNodeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
