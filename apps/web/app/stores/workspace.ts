import {
  cloneWorkspaceNodes,
  createDefaultWorkspaceTab,
  DEFAULT_WORKSPACE_NODE_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
  DEFAULT_WORKSPACE_NODE_WIDTH,
  getWorkspaceNodeDashboardSelectableBlocks,
  normalizeWorkspaceNode,
  type WorkspaceNodeDashboardFeaturedBlock,
  type WorkspaceNodeDashboardSelectableBlock,
  type WorkspaceNode,
  type WorkspaceNodeTint,
} from "@brainiac/workspace";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { defineStore, skipHydrate } from "pinia";
import { computed, nextTick, onScopeDispose, reactive, ref, watch } from "vue";

import { getErrorMessage } from "~/utils/get-error-message";

type EditorMode = "create" | "edit";
type SaveState = "idle" | "saving" | "saved" | "error";
type NodePosition = {
  x: number;
  y: number;
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
    tint: WorkspaceNodeTint;
    featuredBlocks: WorkspaceNodeDashboardFeaturedBlock[];
  }>({
    title: "",
    content: "",
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
    nodeDraft.tint = node.dashboard.tint;
    nodeDraft.featuredBlocks = [...node.dashboard.featuredBlocks];
    editorOpen.value = true;
  }

  function removeNode(payload: { nodeId: string }) {
    if (!workspaceReadyForEdits.value) {
      return;
    }

    nodes.value = nodes.value.filter((node) => node.id !== payload.nodeId);
    selectedNodeIds.value = selectedNodeIds.value.filter((nodeId) => nodeId !== payload.nodeId);
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

      nodes.value = nodes.value.map((node) =>
        node.id === activeNodeId.value
          ? normalizeWorkspaceNode({
              ...node,
              title,
              content,
              label: title,
              dashboard: {
                tint: nodeDraft.tint,
                featuredBlocks: [...nodeDraft.featuredBlocks],
              },
              updatedAt: timestamp,
            })
          : node,
      );

      closeEditor();
      return;
    }

    const position = pendingNodePosition.value ?? { x: 0, y: 0 };
    const nextNode = normalizeWorkspaceNode({
      id: createNodeId(),
      title,
      content,
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
    closeEditor,
    openCreateNode,
    openEditNode,
    removeNode,
    submitNodeEditor,
    applyWorkspaceSnapshot,
    updateNodes,
  };
});
