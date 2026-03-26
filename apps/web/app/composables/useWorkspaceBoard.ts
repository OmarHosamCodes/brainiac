import { storeToRefs } from "pinia";

export function useWorkspaceBoard() {
  const workspaceStore = useWorkspaceStore();
  const {
    authSession,
    nodes,
    selectedNodeIds,
    saveBadge,
    saveError,
    editorOpen,
    editorMode,
    nodeDraft,
    isDraftValid,
  } = storeToRefs(workspaceStore);

  function openNodePage(payload: { nodeId: string }) {
    void navigateTo(`/node/${payload.nodeId}`);
  }

  return {
    authSession,
    workspaceQuery: workspaceStore.workspaceQuery,
    nodes,
    selectedNodeIds,
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
