import { storeToRefs } from "pinia";

export function useWorkspaceBoard() {
  const workspaceStore = useWorkspaceStore();
  const {
    authSession,
    nodes,
    selectedNodeIds,
    isWorkspaceInitialLoading,
    isWorkspaceRefreshing,
    saveBadge,
    saveError,
    editorOpen,
    editorMode,
    nodeDraft,
    isDraftValid,
  } = storeToRefs(workspaceStore);

  async function openNodePage(payload: { nodeId: string }) {
    const target = `/node/${payload.nodeId}`;

    await preloadRouteComponents(target);
    void navigateTo(target);
  }

  return {
    authSession,
    workspaceQuery: workspaceStore.workspaceQuery,
    preloadWorkspace: workspaceStore.preloadWorkspace,
    nodes,
    selectedNodeIds,
    isWorkspaceInitialLoading,
    isWorkspaceRefreshing,
    saveBadge,
    saveError,
    editorOpen,
    editorMode,
    nodeDraft,
    isDraftValid,
    closeEditor: workspaceStore.closeEditor,
    openCreateNode: workspaceStore.openCreateNode,
    openEditNode: workspaceStore.openEditNode,
    openNodePage,
    removeNode: workspaceStore.removeNode,
    submitNodeEditor: workspaceStore.submitNodeEditor,
  };
}
