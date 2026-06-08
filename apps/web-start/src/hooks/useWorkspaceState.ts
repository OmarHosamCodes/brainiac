import { useShallow } from "zustand/react/shallow";
import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useWorkspaceStore } from "@/stores/workspace";
import { orpc } from "@/lib/orpc";
import type { WorkspaceNodeDashboardFeaturedBlock } from "@brainiac/workspace";
import { useSession } from "@/lib/auth-client";

/**
 * Hook for workspace node management.
 * Provides access to workspace state and mutations.
 */
export function useWorkspaceState(authSessionExistsInput?: boolean) {
  const session = useSession();
  const authSessionExists = authSessionExistsInput ?? Boolean(session.data?.user);
  const queryClient = useQueryClient();
  const workspaceQueryOptions = useMemo(() => orpc.workspace.get.queryOptions(), []);
  const workspaceQuery = useQuery({
    ...workspaceQueryOptions,
    enabled: authSessionExists,
    staleTime: 30_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
  });

  const {
    nodes,
    selectedNodeIds,
    editorOpen,
    editorMode,
    activeNodeId,
    nodeDraft,
    saveState,
    saveError,
    syncedAt,
    loadApplied,
    isPreloadingWorkspace,
  } = useWorkspaceStore(
    useShallow((state) => ({
      nodes: state.nodes,
      selectedNodeIds: state.selectedNodeIds,
      editorOpen: state.editorOpen,
      editorMode: state.editorMode,
      activeNodeId: state.activeNodeId,
      nodeDraft: state.nodeDraft,
      saveState: state.saveState,
      saveError: state.saveError,
      syncedAt: state.syncedAt,
      loadApplied: state.loadApplied,
      isPreloadingWorkspace: state.isPreloadingWorkspace,
    })),
  );

  const workspaceReadyForEdits = useWorkspaceStore((state) =>
    state.workspaceReadyForEdits(authSessionExists),
  );
  const isWorkspaceInitialLoading = useWorkspaceStore((state) =>
    state.isWorkspaceInitialLoading(authSessionExists),
  );
  const isWorkspaceRefreshing = useWorkspaceStore((state) => state.isWorkspaceRefreshing());
  const isDraftValid = useWorkspaceStore((state) => state.isDraftValid());
  const editorBlockOptions = useWorkspaceStore((state) => state.editorBlockOptions());
  const saveBadge = useWorkspaceStore((state) => state.saveBadge());
  const hasPendingLocalChanges = useWorkspaceStore((state) => state.hasPendingLocalChanges());

  // Actions
  const closeEditor = useWorkspaceStore((state) => state.closeEditor);
  const openCreateNode = useWorkspaceStore((state) => state.openCreateNode);
  const openEditNode = useWorkspaceStore((state) => state.openEditNode);
  const removeNode = useWorkspaceStore((state) => state.removeNode);
  const connectNodePair = useWorkspaceStore((state) => state.connectNodePair);
  const disconnectNodePair = useWorkspaceStore((state) => state.disconnectNodePair);
  const submitNodeEditor = useWorkspaceStore((state) => state.submitNodeEditor);
  const findNode = useWorkspaceStore((state) => state.findNode);
  const updateNodes = useWorkspaceStore((state) => state.updateNodes);
  const handleRemoteWorkspace = useWorkspaceStore((state) => state.handleRemoteWorkspace);
  const resetWorkspaceState = useWorkspaceStore((state) => state.resetWorkspaceState);
  const setWorkspaceQueryContext = useWorkspaceStore((state) => state.setWorkspaceQueryContext);

  useEffect(() => {
    setWorkspaceQueryContext({
      queryClient,
      queryKey: workspaceQueryOptions.queryKey,
    });
  }, [queryClient, setWorkspaceQueryContext, workspaceQueryOptions.queryKey]);

  useEffect(() => {
    if (!authSessionExists) {
      resetWorkspaceState();
      return;
    }

    void useWorkspaceStore
      .getState()
      .preloadWorkspace(authSessionExists, queryClient)
      .catch(() => {
        // Query error state is exposed by workspaceQuery.
      });
  }, [authSessionExists, queryClient, resetWorkspaceState]);

  // Only sync remote workspace when data first loads or updatedAt changes
  // This prevents infinite loops from query refetches
  const remoteWorkspaceKey = workspaceQuery.data ? `${workspaceQuery.data.updatedAt}-${workspaceQuery.data.nodes.length}` : null;
  useEffect(() => {
    if (!workspaceQuery.data) {
      return;
    }
    handleRemoteWorkspace(workspaceQuery.data);
  }, [handleRemoteWorkspace, remoteWorkspaceKey]);

  // Handle node draft updates
  const updateNodeDraftTitle = useCallback((title: string) => {
    useWorkspaceStore.setState((state) => ({
      nodeDraft: { ...state.nodeDraft, title },
    }));
  }, []);

  const updateNodeDraftContent = useCallback((content: string) => {
    useWorkspaceStore.setState((state) => ({
      nodeDraft: { ...state.nodeDraft, content },
    }));
  }, []);

  const updateNodeDraftTint = useCallback((tint: string) => {
    useWorkspaceStore.setState((state) => ({
      nodeDraft: { ...state.nodeDraft, tint: tint as any },
    }));
  }, []);

  const updateNodeDraftFeaturedBlocks = useCallback(
    (blocks: WorkspaceNodeDashboardFeaturedBlock[]) => {
      useWorkspaceStore.setState((state) => ({
        nodeDraft: { ...state.nodeDraft, featuredBlocks: blocks },
      }));
    },
    [],
  );

  const updateNodeDraftNodeType = useCallback((nodeType: string) => {
    useWorkspaceStore.setState((state) => ({
      nodeDraft: { ...state.nodeDraft, nodeType: nodeType as any },
    }));
  }, []);

  // Preload workspace
  const preloadWorkspace = useCallback(async () => {
    if (!authSessionExists) return;

    const store = useWorkspaceStore.getState();
    if (store.isPreloadingWorkspace) return;

    useWorkspaceStore.setState({ isPreloadingWorkspace: true });

    try {
      const data = await queryClient.ensureQueryData(workspaceQueryOptions);

      if (data && !store.loadApplied) {
        useWorkspaceStore.getState().applyRemoteSnapshot(data.nodes, data.updatedAt);
      }
    } catch (error) {
      console.error("Failed to preload workspace:", error);
    } finally {
      useWorkspaceStore.setState({ isPreloadingWorkspace: false });
    }
  }, [authSessionExists, queryClient, workspaceQueryOptions]);

  return {
    // State
    nodes,
    selectedNodeIds,
    editorOpen,
    editorMode,
    activeNodeId,
    nodeDraft,
    saveState,
    saveError,
    syncedAt,
    loadApplied,
    isPreloadingWorkspace,

    // Computed
    workspaceReadyForEdits,
    isWorkspaceInitialLoading,
    isWorkspaceRefreshing,
    isDraftValid,
    editorBlockOptions,
    saveBadge,
    hasPendingLocalChanges,

    // Actions
    closeEditor,
    openCreateNode,
    openEditNode,
    removeNode,
    connectNodePair,
    disconnectNodePair,
    submitNodeEditor,
    findNode,
    updateNodes,
    preloadWorkspace,
    workspaceQuery,

    // Draft updates
    updateNodeDraftTitle,
    updateNodeDraftContent,
    updateNodeDraftTint,
    updateNodeDraftFeaturedBlocks,
    updateNodeDraftNodeType,
  };
}
