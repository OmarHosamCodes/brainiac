import {
  cloneWorkspaceNodes,
  createAgencyOperatorNodeTabs,
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { defineStore, skipHydrate } from "pinia";
import { computed, nextTick, onScopeDispose, reactive, ref, watch } from "vue";

import { getErrorMessage } from "~/utils/get-error-message";
import { sanitizeConnections } from "~/utils/workspace-node-connections";

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

export const useWorkspaceStore = defineStore("workspace", () => {
  const authSession = useAuthSession();
  const orpc = useOrpc();
  const queryClient = useQueryClient();
  const workspaceGetQueryOptions = orpc.workspace.get.queryOptions();

  const nodes = ref<WorkspaceNode[]>([]);
  const selectedNodeIds = ref<string[]>([]);
  const editorOpen = ref(false);
  const editorMode = ref<EditorMode>("create");
  const activeNodeId = ref<string | null>(null);
  const pendingNodePosition = ref<NodePosition | null>(null);
  const agencyOperatorConnectOpen = ref(false);
  const pendingAgencyOperatorPosition = ref<NodePosition | null>(null);
  const loadApplied = ref(false);
  const isHydratingWorkspace = ref(false);
  const saveState = ref<SaveState>("idle");
  const saveError = ref<string | null>(null);
  const syncedAt = ref<string | null>(null);
  const isPreloadingWorkspace = ref(false);
  const localRevision = ref(0);
  const syncedRevision = ref(0);
  const nodeDraft = reactive<{
    title: string;
    content: string;
    nodeType: WorkspaceNodeType;
    tint: WorkspaceNodeTint;
    featuredBlocks: WorkspaceNodeDashboardFeaturedBlock[];
  }>({
    title: "",
    content: "",
    nodeType: "standard",
    tint: "neutral",
    featuredBlocks: [],
  });

  const workspaceQuery = skipHydrate(
    useQuery({
      ...workspaceGetQueryOptions,
      enabled: computed(() => Boolean(authSession.value?.data?.user)),
      staleTime: 1_500,
      refetchInterval: 4_000,
      refetchIntervalInBackground: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    }),
  );
  const saveWorkspace = useMutation(orpc.workspace.save.mutationOptions());
  const deleteWorkspaceNode = useMutation(orpc.workspace.deleteNode.mutationOptions());

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const workspaceReadyForEdits = computed(
    () =>
      Boolean(authSession.value?.data?.user) && loadApplied.value && !isHydratingWorkspace.value,
  );
  const isWorkspaceInitialLoading = computed(
    () =>
      Boolean(authSession.value?.data?.user) &&
      !loadApplied.value &&
      (workspaceQuery.isLoading.value ||
        workspaceQuery.isFetching.value ||
        isPreloadingWorkspace.value),
  );
  const isWorkspaceRefreshing = computed(
    () => loadApplied.value && (workspaceQuery.isRefetching.value || isPreloadingWorkspace.value),
  );
  const isDraftValid = computed(() => nodeDraft.title.trim().length > 0);
  const editorBlockOptions = computed<WorkspaceNodeDashboardSelectableBlock[]>(() => {
    if (!activeNodeId.value) {
      return [];
    }

    const node = findNode(activeNodeId.value);

    return node ? getWorkspaceNodeDashboardSelectableBlocks(node) : [];
  });
  const hasPendingLocalChanges = computed(
    () =>
      localRevision.value > syncedRevision.value ||
      Boolean(saveTimer) ||
      saveWorkspace.isPending.value,
  );
  const saveBadge = computed(() => {
    switch (saveState.value) {
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
  });

  function clearSaveTimer() {
    if (!saveTimer) {
      return;
    }

    clearTimeout(saveTimer);
    saveTimer = null;
  }

  function clearRetryTimer() {
    if (!retryTimer) {
      return;
    }

    clearTimeout(retryTimer);
    retryTimer = null;
  }

  function resetDraft() {
    nodeDraft.title = "";
    nodeDraft.content = "";
    nodeDraft.nodeType = "standard";
    nodeDraft.tint = "neutral";
    nodeDraft.featuredBlocks = [];
  }

  function closeEditor() {
    editorOpen.value = false;
    activeNodeId.value = null;
    pendingNodePosition.value = null;
    resetDraft();
  }

  function resetWorkspaceState() {
    clearSaveTimer();
    clearRetryTimer();
    closeEditor();
    nodes.value = [];
    selectedNodeIds.value = [];
    loadApplied.value = false;
    isHydratingWorkspace.value = false;
    saveState.value = "idle";
    saveError.value = null;
    syncedAt.value = null;
    isPreloadingWorkspace.value = false;
    localRevision.value = 0;
    syncedRevision.value = 0;
  }

  async function preloadWorkspace() {
    if (!authSession.value?.data?.user) {
      return;
    }

    if (isPreloadingWorkspace.value) {
      return;
    }

    isPreloadingWorkspace.value = true;

    try {
      await queryClient.ensureQueryData({
        ...workspaceGetQueryOptions,
        staleTime: 1_500,
      });
    } catch {
    } finally {
      isPreloadingWorkspace.value = false;
    }
  }

  function applyRemoteSnapshot(remoteNodes: WorkspaceNode[], updatedAt: string | null) {
    isHydratingWorkspace.value = true;
    nodes.value = remoteNodes.map(normalizeWorkspaceNode);
    selectedNodeIds.value = selectedNodeIds.value.filter((nodeId) =>
      nodes.value.some((node) => node.id === nodeId),
    );
    loadApplied.value = true;
    syncedAt.value = updatedAt;
    syncedRevision.value = localRevision.value;
    saveState.value = "idle";
    saveError.value = null;

    nextTick(() => {
      isHydratingWorkspace.value = false;
    });
  }

  function applyWorkspaceSnapshot(remoteNodes: WorkspaceNode[], updatedAt: string | null) {
    clearSaveTimer();
    clearRetryTimer();
    queryClient.setQueryData(workspaceGetQueryOptions.queryKey, {
      nodes: remoteNodes,
      updatedAt,
    });
    applyRemoteSnapshot(remoteNodes, updatedAt);
  }

  async function persistWorkspace(snapshot: WorkspaceNode[], revision: number) {
    try {
      const response = await saveWorkspace.mutateAsync({
        nodes: snapshot,
      });

      syncedRevision.value = Math.max(syncedRevision.value, revision);
      syncedAt.value = response.updatedAt;

      if (revision < localRevision.value) {
        saveState.value = "saving";
        return;
      }

      saveState.value = "saved";
      saveError.value = null;
      void workspaceQuery.refetch();
    } catch (error) {
      if (revision < localRevision.value) {
        return;
      }

      saveState.value = "error";
      saveError.value = getErrorMessage(error, "Failed to sync workspace");
      clearRetryTimer();
      retryTimer = setTimeout(() => {
        retryTimer = null;

        if (!workspaceReadyForEdits.value || !hasPendingLocalChanges.value) {
          return;
        }

        scheduleWorkspaceSave(0);
      }, 2_000);
    }
  }

  function scheduleWorkspaceSave(delay = 250) {
    if (!workspaceReadyForEdits.value) {
      return;
    }

    clearSaveTimer();
    clearRetryTimer();
    saveState.value = "saving";
    saveError.value = null;

    const revision = localRevision.value;
    const snapshot = cloneWorkspaceNodes(nodes.value);

    saveTimer = setTimeout(() => {
      saveTimer = null;
      void persistWorkspace(snapshot, revision);
    }, delay);
  }

  function findNode(nodeId: string) {
    return nodes.value.find((node) => node.id === nodeId) ?? null;
  }

  function createNodeId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function haveSameConnections(
    leftConnections: WorkspaceNode["connections"],
    rightConnections: WorkspaceNode["connections"],
  ) {
    if (leftConnections.length !== rightConnections.length) {
      return false;
    }

    return leftConnections.every(
      (connection, index) => connection.targetNodeId === rightConnections[index]?.targetNodeId,
    );
  }

  function normalizeTrackedNode(node: WorkspaceNode, timestamp: string) {
    return normalizeWorkspaceNode({
      ...node,
      label: node.title,
      updatedAt: timestamp,
    });
  }

  function applyConnectionSanitization(draftNodes: WorkspaceNode[], timestamp: string) {
    const sanitizedNodes = sanitizeConnections(draftNodes);

    sanitizedNodes.forEach((sanitizedNode, index) => {
      const currentNode = draftNodes[index];

      if (!currentNode || haveSameConnections(currentNode.connections, sanitizedNode.connections)) {
        return;
      }

      draftNodes[index] = normalizeTrackedNode(
        {
          ...currentNode,
          connections: sanitizedNode.connections,
        },
        timestamp,
      );
    });
  }

  function updateNodes(mutator: (draft: WorkspaceNode[]) => void) {
    if (!workspaceReadyForEdits.value) {
      return;
    }

    const nextNodes = cloneWorkspaceNodes(nodes.value);
    mutator(nextNodes);
    nodes.value = nextNodes;
    selectedNodeIds.value = selectedNodeIds.value.filter((nodeId) =>
      nextNodes.some((node) => node.id === nodeId),
    );
  }

  function openCreateNode(payload: NodePosition) {
    if (!workspaceReadyForEdits.value) {
      return;
    }

    editorMode.value = "create";
    pendingNodePosition.value = payload;
    activeNodeId.value = null;
    resetDraft();
    editorOpen.value = true;
  }

  function openEditNode(payload: { nodeId: string }) {
    if (!workspaceReadyForEdits.value) {
      return;
    }

    const node = findNode(payload.nodeId);

    if (!node) {
      return;
    }

    editorMode.value = "edit";
    activeNodeId.value = node.id;
    pendingNodePosition.value = null;
    nodeDraft.title = node.title;
    nodeDraft.content = node.content;
    nodeDraft.nodeType = node.nodeType;
    nodeDraft.tint = node.dashboard.tint;
    nodeDraft.featuredBlocks = [...node.dashboard.featuredBlocks];
    editorOpen.value = true;
  }

  function removeNode(payload: { nodeId: string }) {
    if (!workspaceReadyForEdits.value) {
      return;
    }

    const node = findNode(payload.nodeId);

    if (!node) {
      return;
    }

    updateNodes((draftNodes) => {
      const timestamp = new Date().toISOString();
      const nextNodes = draftNodes.filter((entry) => entry.id !== payload.nodeId);

      applyConnectionSanitization(nextNodes, timestamp);
      draftNodes.splice(0, draftNodes.length, ...nextNodes);
    });

    deleteWorkspaceNode.mutate(
      {
        nodeId: payload.nodeId,
        ownerUserId: node.ownerUserId ?? undefined,
      },
      {
        onError: () => {
          void workspaceQuery.refetch();
        },
      },
    );
  }

  function connectNodePair(payload: WorkspaceConnectionPair) {
    updateNodes((draftNodes) => {
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
      draftNodes[orchestratorIndex] = normalizeTrackedNode(orchestratorNode, timestamp);
      applyConnectionSanitization(draftNodes, timestamp);
    });
  }

  function disconnectNodePair(payload: WorkspaceConnectionPair) {
    updateNodes((draftNodes) => {
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
      draftNodes[orchestratorIndex] = normalizeTrackedNode(orchestratorNode, timestamp);
      applyConnectionSanitization(draftNodes, timestamp);
    });
  }

  function submitNodeEditor() {
    const title = nodeDraft.title.trim();

    if (!title) {
      return;
    }

    const content = nodeDraft.content.trim();
    const timestamp = new Date().toISOString();

    if (editorMode.value === "edit") {
      if (!activeNodeId.value) {
        return;
      }

      updateNodes((draftNodes) => {
        const nodeIndex = draftNodes.findIndex((node) => node.id === activeNodeId.value);

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
          nodeType: nodeDraft.nodeType,
          connections: nodeDraft.nodeType === "orchestrator" ? currentNode.connections : [],
          label: title,
          dashboard: {
            tint: nodeDraft.tint,
            featuredBlocks: [...nodeDraft.featuredBlocks],
          },
          updatedAt: timestamp,
        });
        applyConnectionSanitization(draftNodes, timestamp);
      });

      closeEditor();
      return;
    }

    const position = pendingNodePosition.value ?? { x: 0, y: 0 };
    const nextNode = normalizeWorkspaceNode({
      id: createNodeId(),
      title,
      content,
      nodeType: nodeDraft.nodeType,
      connections: [],
      label: title,
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
        notePreviewState: {},
      },
      dashboard: {
        tint: nodeDraft.tint,
        featuredBlocks: [],
      },
    });

    nodes.value = [...nodes.value, nextNode];
    selectedNodeIds.value = [nextNode.id];
    closeEditor();
  }

  function openCreateAgencyOperatorNode(position: NodePosition) {
    pendingAgencyOperatorPosition.value = position;
    agencyOperatorConnectOpen.value = true;
  }

  function submitCreateAgencyOperatorNode(payload: { teamId: string; teamName: string }) {
    const { teamId, teamName } = payload;
    const position = pendingAgencyOperatorPosition.value ?? { x: 0, y: 0 };
    const timestamp = new Date().toISOString();
    const tabs = createAgencyOperatorNodeTabs(teamId);

    const nextNode = normalizeWorkspaceNode({
      id: createNodeId(),
      title: teamName,
      content: "",
      nodeType: "agency-operator",
      connections: [],
      label: teamName,
      teamId,
      x: position.x - 160,
      y: position.y - 110,
      width: DEFAULT_WORKSPACE_NODE_WIDTH,
      height: DEFAULT_WORKSPACE_NODE_HEIGHT,
      minWidth: DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
      minHeight: DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
      createdAt: timestamp,
      updatedAt: timestamp,
      tabs: [...tabs],
      customBlockTemplates: [],
      viewState: {
        activeTabId: tabs[0]?.id ?? null,
        notePreviewState: {},
      },
      dashboard: {
        tint: "emerald",
        featuredBlocks: [],
      },
    });

    nodes.value = [...nodes.value, nextNode];
    selectedNodeIds.value = [nextNode.id];
    agencyOperatorConnectOpen.value = false;
    pendingAgencyOperatorPosition.value = null;
  }

  watch(
    () => authSession.value?.data?.user?.id ?? null,
    (userId, previousUserId) => {
      if (!userId) {
        resetWorkspaceState();
        return;
      }

      if (previousUserId && previousUserId !== userId) {
        resetWorkspaceState();
      }
    },
    { immediate: true },
  );

  watch(
    () => workspaceQuery.data.value,
    (remoteWorkspace) => {
      if (!remoteWorkspace) {
        return;
      }

      if (!loadApplied.value) {
        applyRemoteSnapshot(remoteWorkspace.nodes, remoteWorkspace.updatedAt);
        return;
      }

      if (remoteWorkspace.updatedAt === syncedAt.value) {
        return;
      }

      if (hasPendingLocalChanges.value) {
        return;
      }

      applyRemoteSnapshot(remoteWorkspace.nodes, remoteWorkspace.updatedAt);
    },
    { immediate: true },
  );

  watch(
    nodes,
    () => {
      if (!workspaceReadyForEdits.value) {
        return;
      }

      localRevision.value += 1;
      scheduleWorkspaceSave();
    },
    { deep: true },
  );

  onScopeDispose(() => {
    clearSaveTimer();
    clearRetryTimer();
  });

  return {
    workspaceQuery,
    preloadWorkspace,
    workspaceReadyForEdits,
    isWorkspaceInitialLoading,
    isWorkspaceRefreshing,
    nodes,
    selectedNodeIds,
    saveBadge,
    saveError,
    syncedAt,
    editorOpen,
    editorMode,
    nodeDraft,
    editorBlockOptions,
    isDraftValid,
    agencyOperatorConnectOpen,
    closeEditor,
    openCreateNode,
    openEditNode,
    connectNodePair,
    disconnectNodePair,
    removeNode,
    submitNodeEditor,
    openCreateAgencyOperatorNode,
    submitCreateAgencyOperatorNode,
    applyWorkspaceSnapshot,
    updateNodes,
  };
});
