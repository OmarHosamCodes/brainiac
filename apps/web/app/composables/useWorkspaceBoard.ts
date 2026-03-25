import {
  cloneWorkspaceNodes,
  DEFAULT_WORKSPACE_NODE_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
  DEFAULT_WORKSPACE_NODE_WIDTH,
  normalizeWorkspaceNode,
  type WorkspaceNode,
} from "@brainiac/workspace";
import { useMutation, useQuery } from "@tanstack/vue-query";
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";

import { getErrorMessage } from "~/utils/get-error-message";

type EditorMode = "create" | "edit";
type SaveState = "idle" | "saving" | "saved" | "error";
type NodePosition = {
  x: number;
  y: number;
};

export function useWorkspaceBoard() {
  const authSession = useAuthSession();
  const orpc = useOrpc();

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
  const nodeDraft = reactive({
    title: "",
    content: "",
  });

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let latestSaveRequest = 0;

  const workspaceQuery = useQuery({
    ...orpc.workspace.get.queryOptions(),
    enabled: computed(() => Boolean(authSession.value?.data?.user)),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const saveWorkspace = useMutation(orpc.workspace.save.mutationOptions());

  const workspaceReadyForEdits = computed(
    () =>
      Boolean(authSession.value?.data?.user) &&
      loadApplied.value &&
      !isHydratingWorkspace.value,
  );
  const isDraftValid = computed(() => nodeDraft.title.trim().length > 0);
  const saveBadge = computed(() => {
    switch (saveState.value) {
      case "saving":
        return {
          label: "Saving",
          className: "border-warning/40 bg-warning/10 text-warning",
        };
      case "saved":
        return {
          label: "Saved",
          className: "border-success/40 bg-success/10 text-success",
        };
      case "error":
        return {
          label: "Save failed",
          className: "border-error/40 bg-error/10 text-error",
        };
      default:
        return {
          label: "Ready",
          className: "border-muted/60 bg-elevated/80 text-toned",
        };
    }
  });

  function resetDraft() {
    nodeDraft.title = "";
    nodeDraft.content = "";
  }

  function closeEditor() {
    editorOpen.value = false;
    activeNodeId.value = null;
    pendingNodePosition.value = null;
    resetDraft();
  }

  function findNode(nodeId: string) {
    return nodes.value.find((node) => node.id === nodeId) ?? null;
  }

  function createNodeId() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

  function openNodePage(payload: { nodeId: string }) {
    void navigateTo(`/node/${payload.nodeId}`);
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
    editorOpen.value = true;
  }

  function removeNode(payload: { nodeId: string }) {
    if (!workspaceReadyForEdits.value) {
      return;
    }

    nodes.value = nodes.value.filter((node) => node.id !== payload.nodeId);
    selectedNodeIds.value = selectedNodeIds.value.filter(
      (nodeId) => nodeId !== payload.nodeId,
    );
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
    });

    nodes.value = [...nodes.value, nextNode];
    selectedNodeIds.value = [nextNode.id];
    closeEditor();
  }

  async function persistWorkspace(snapshot: WorkspaceNode[]) {
    const requestId = ++latestSaveRequest;

    try {
      await saveWorkspace.mutateAsync({
        nodes: snapshot,
      });

      if (requestId === latestSaveRequest) {
        saveState.value = "saved";
        saveError.value = null;
      }
    } catch (error) {
      if (requestId === latestSaveRequest) {
        saveState.value = "error";
        saveError.value = getErrorMessage(error, "Failed to save workspace");
      }
    }
  }

  function scheduleWorkspaceSave() {
    if (!workspaceReadyForEdits.value) {
      return;
    }

    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    saveState.value = "saving";
    saveError.value = null;
    const snapshot = cloneWorkspaceNodes(nodes.value);

    saveTimer = setTimeout(() => {
      saveTimer = null;
      void persistWorkspace(snapshot);
    }, 250);
  }

  watch(
    () => workspaceQuery.data.value?.nodes,
    (remoteNodes) => {
      if (!remoteNodes) {
        return;
      }

      isHydratingWorkspace.value = true;
      nodes.value = remoteNodes.map(normalizeWorkspaceNode);
      selectedNodeIds.value = selectedNodeIds.value.filter((nodeId) =>
        nodes.value.some((node) => node.id === nodeId),
      );
      loadApplied.value = true;
      saveState.value = "idle";
      saveError.value = null;

      nextTick(() => {
        isHydratingWorkspace.value = false;
      });
    },
    { immediate: true },
  );

  watch(
    nodes,
    () => {
      if (!workspaceReadyForEdits.value) {
        return;
      }

      scheduleWorkspaceSave();
    },
    { deep: true },
  );

  onBeforeUnmount(() => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
  });

  return {
    authSession,
    workspaceQuery,
    nodes,
    selectedNodeIds,
    saveBadge,
    saveError,
    editorOpen,
    editorMode,
    nodeDraft,
    isDraftValid,
    closeEditor,
    openCreateNode,
    openEditNode,
    openNodePage,
    removeNode,
    submitNodeEditor,
  };
}
