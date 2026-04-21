import { storeToRefs } from "pinia";

export function useWorkspaceBoard() {
  const authSession = useAuthSession();
  const workspaceStore = useWorkspaceStore();
  const {
    nodes,
    selectedNodeIds,
    isWorkspaceInitialLoading,
    isWorkspaceRefreshing,
    saveBadge,
    saveError,
    editorOpen,
    editorMode,
    nodeDraft,
    editorBlockOptions,
    isDraftValid,
    agencyOperatorConnectOpen,
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
    editorBlockOptions,
    isDraftValid,
    agencyOperatorConnectOpen,
    closeEditor: workspaceStore.closeEditor,
    openCreateNode: workspaceStore.openCreateNode,
    openEditNode: workspaceStore.openEditNode,
    openNodePage,
    connectNodePair: workspaceStore.connectNodePair,
    disconnectNodePair: workspaceStore.disconnectNodePair,
    removeNode: workspaceStore.removeNode,
    submitNodeEditor: workspaceStore.submitNodeEditor,
    openCreateAgencyOperatorNode: workspaceStore.openCreateAgencyOperatorNode,
    submitCreateAgencyOperatorNode: workspaceStore.submitCreateAgencyOperatorNode,
  };
}
