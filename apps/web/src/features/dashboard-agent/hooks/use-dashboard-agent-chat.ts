import type { WorkspaceNode } from "@orch/workspace";
import { useCallback, useEffect, useMemo } from "react";

import { orpc } from "@/lib/orpc";
import { useWorkspaceStore } from "@/features/workspace/workspace-local-state";
import {
  getActiveDashboardNodeMention,
  getDashboardNodeMentionSuggestions,
  stripActiveDashboardNodeMention,
} from "@/features/dashboard-agent/dashboard-agent-mentions";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useDashboardAgentModelPreferences } from "@/features/dashboard-agent/hooks/use-dashboard-agent-model-preferences";
import { useDashboardAgentData } from "@/features/dashboard-agent/hooks/use-dashboard-agent-data";
import { useDashboardAgentConversationState } from "@/features/dashboard-agent/hooks/use-dashboard-agent-conversation-state";

export function useDashboardAgentChat(nodes: WorkspaceNode[], activeTabId?: string | null) {
  const workspaceApi = useWorkspaceStore();
  const workspaceNodes = workspaceApi.nodes;

  const conversationState = useDashboardAgentConversationState();
  const {
    draft,
    setDraft,
    error,
    setError,
    activeConversationId,
    setActiveConversationId,
    selectedNodeIds,
    setSelectedNodeIds,
    pendingMessages,
    setPendingMessages,
    selectedToolPreset,
    setSelectedToolPreset,
    conversationDraftModelId,
    setConversationDraftModelId,
    isRenameDialogOpen,
    setIsRenameDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    renameDraft,
    setRenameDraft,
    resetConversation,
  } = conversationState;

  const data = useDashboardAgentData(activeConversationId);
  const {
    queryClient,
    conversationsListQueryOptions,
    conversationsQuery,
    modelCatalogQuery,
    accountStatusQuery,
    activeConversationQuery,
    chatTurnMutation,
    renameConversationMutation,
    deleteConversationMutation,
  } = data;

  const conversationList = conversationsQuery.data?.conversations ?? [];
  const activeConversation = activeConversationQuery.data ?? null;
  const messages = useMemo(
    () => [...(activeConversation?.messages ?? []), ...pendingMessages],
    [activeConversation?.messages, pendingMessages],
  );
  const selectedNodes = useMemo(
    () => nodes.filter((node) => selectedNodeIds.includes(node.id)),
    [nodes, selectedNodeIds],
  );
  const modelOptions = useMemo(() => {
    const rawModels = modelCatalogQuery.data?.models ?? [];

    return rawModels.map((model) => {
      if (model.isFree) {
        return { ...model, label: model.name, pricingLabel: "Free", compactPricingLabel: "Free" };
      }

      const promptPerMillion = Number(model.pricing?.prompt ?? 0) * 1_000_000;
      const completionPerMillion = Number(model.pricing?.completion ?? 0) * 1_000_000;
      const hasPricing = Number.isFinite(promptPerMillion) && promptPerMillion > 0;

      return {
        ...model,
        label: model.name,
        pricingLabel: hasPricing
          ? `$${promptPerMillion.toFixed(2)}/M in · $${completionPerMillion.toFixed(2)}/M out`
          : "Pricing unavailable",
        compactPricingLabel: hasPricing ? `$${promptPerMillion.toFixed(2)}/M` : "—",
      };
    });
  }, [modelCatalogQuery.data?.models]);

  const modelPreferences = useDashboardAgentModelPreferences(modelOptions);

  const selectedModelId =
    conversationDraftModelId ?? modelCatalogQuery.data?.defaultModel ?? modelOptions[0]?.id;
  const canSend = draft.trim().length > 0 && !chatTurnMutation.isPending;
  const activeMention = getActiveDashboardNodeMention(draft);

  const mentionSuggestions = useMemo(
    () =>
      activeMention
        ? getDashboardNodeMentionSuggestions(nodes, activeMention.query, new Set(selectedNodeIds))
        : [],
    [activeMention, nodes, selectedNodeIds],
  );

  const switchConversation = useCallback(
    (conversationId: string | null) => {
      setActiveConversationId(conversationId);
      resetConversation();
    },
    [resetConversation, setActiveConversationId],
  );

  useEffect(() => {
    if (activeConversation?.toolPreset) {
      setSelectedToolPreset(activeConversation.toolPreset);
    }
    if (activeConversation?.model) {
      setConversationDraftModelId(activeConversation.model);
    }
  }, [activeConversation?.id, activeConversation?.model, activeConversation?.toolPreset]);

  const startNewConversation = useCallback(() => {
    switchConversation(null);
  }, [switchConversation]);

  const sendMessage = useCallback(
    async (initialContent?: string) => {
      const content = (initialContent ?? draft).trim();
      const model = selectedModelId?.trim();
      if (!content || chatTurnMutation.isPending) return;

      setDraft("");
      setError(null);
      setPendingMessages([
        {
          id: `pending-${crypto.randomUUID()}`,
          role: "user",
          content,
          contextNodeTitles: selectedNodes.map((n) => n.title),
          model: model ?? null,
          toolsCalled: [],
          createdAt: new Date().toISOString(),
        },
      ]);

      try {
        const result = await chatTurnMutation.mutateAsync({
          conversationId: activeConversationId ?? undefined,
          content,
          nodes: workspaceNodes,
          scopeNodes: selectedNodes.length > 0 ? selectedNodes : nodes,
          ...(activeTabId ? { activeTabId } : {}),
          ...(model ? { model } : {}),
          toolPreset: selectedToolPreset,
        });
        setPendingMessages([]);
        setActiveConversationId(result.conversation.id);
        if (result.workspaceSnapshot) {
          useWorkspaceStore
            .getState()
            .applyWorkspaceSnapshot(
              result.workspaceSnapshot.nodes,
              result.workspaceSnapshot.updatedAt,
            );
        }
        void queryClient.invalidateQueries({ queryKey: conversationsListQueryOptions.queryKey });
        void queryClient.invalidateQueries({
          queryKey: orpc.agent.conversations.get.queryKey({
            input: { conversationId: result.conversation.id },
          }),
        });
      } catch (mutationError) {
        setPendingMessages([]);
        setDraft(content);
        setError(getErrorMessage(mutationError, "Failed to reach the dashboard agent."));
      }
    },
    [
      activeConversationId,
      activeTabId,
      chatTurnMutation,
      draft,
      nodes,
      queryClient,
      selectedModelId,
      selectedNodes,
      selectedToolPreset,
      workspaceNodes,
      conversationsListQueryOptions.queryKey,
    ],
  );

  const openRenameDialog = useCallback(() => {
    setRenameDraft(activeConversation?.title ?? "");
    setIsRenameDialogOpen(true);
  }, [activeConversation?.title]);

  const closeRenameDialog = useCallback(() => {
    setIsRenameDialogOpen(false);
    setRenameDraft("");
  }, []);

  const openDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(true);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
  }, []);

  const submitRenameConversation = useCallback(async () => {
    const title = renameDraft.trim();
    if (!activeConversationId || !title) return;

    try {
      await renameConversationMutation.mutateAsync({
        conversationId: activeConversationId,
        title,
      });
      void queryClient.invalidateQueries({ queryKey: conversationsListQueryOptions.queryKey });
      void queryClient.invalidateQueries({
        queryKey: orpc.agent.conversations.get.queryKey({
          input: { conversationId: activeConversationId },
        }),
      });
      closeRenameDialog();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to rename conversation."));
    }
  }, [
    activeConversationId,
    closeRenameDialog,
    conversationsListQueryOptions.queryKey,
    queryClient,
    renameConversationMutation,
    renameDraft,
  ]);

  const confirmDeleteConversation = useCallback(async () => {
    if (!activeConversationId) return;

    const deletedId = activeConversationId;

    try {
      await deleteConversationMutation.mutateAsync({ conversationId: deletedId });
      void queryClient.invalidateQueries({ queryKey: conversationsListQueryOptions.queryKey });
      closeDeleteDialog();
      if (activeConversationId === deletedId) {
        startNewConversation();
      }
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to delete conversation."));
    }
  }, [
    activeConversationId,
    closeDeleteDialog,
    conversationsListQueryOptions.queryKey,
    deleteConversationMutation,
    queryClient,
    startNewConversation,
  ]);

  return {
    draft,
    setDraft,
    error,
    messages,
    canSend,
    isPending: chatTurnMutation.isPending,
    sendMessage,
    selectedNodes,
    selectedNodeIds,
    setSelectedNodeIds,
    activeConversationId,
    setActiveConversationId: switchConversation,
    conversationList,
    modelOptions,
    modelSearch: modelPreferences.modelSearch,
    setModelSearch: modelPreferences.setModelSearch,
    selectedModelId,
    setConversationDraftModelId,
    selectedToolPreset,
    setSelectedToolPreset,
    selectToolPreset: setSelectedToolPreset,
    startNewConversation,
    accountBalanceLabel: String(accountStatusQuery.data?.availableCredits ?? 0),
    isLoadingModels: modelCatalogQuery.isLoading,
    modelError: modelCatalogQuery.isError
      ? getErrorMessage(modelCatalogQuery.error, "Unable to load models.")
      : null,
    promptSuggestions: nodes.length
      ? [
          "Summarize the selected nodes.",
          "What should I focus on next?",
          "Find risks across these nodes.",
        ]
      : ["Help me sketch the first dashboard nodes.", "What nodes should I create this week?"],
    scopeLabel: selectedNodes.length
      ? `${selectedNodes.length} node${selectedNodes.length === 1 ? "" : "s"} in scope`
      : nodes.length === 1
        ? `"${nodes[0]?.title ?? "Node"}" in scope`
        : "Full workspace in scope",
    activeConversationTitle: activeConversation?.title ?? "New conversation",
    mentionSuggestions,
    activeMention,
    addMentionedNode: (node: WorkspaceNode) => {
      setSelectedNodeIds((current) =>
        current.includes(node.id) ? current : [...current, node.id],
      );
      setDraft(stripActiveDashboardNodeMention(draft));
    },
    removeMentionedNode: (nodeId: string) =>
      setSelectedNodeIds((current) => current.filter((id) => id !== nodeId)),
    clearMentionedNodes: () => setSelectedNodeIds([]),
    toolPresetOptions: [
      { value: "ask" as const, label: "Ask", description: "Direct answers" },
      { value: "agent" as const, label: "Agent", description: "Tool-using agent" },
    ],
    filteredModelOptions: modelPreferences.filteredModelOptions,
    favoriteModelOptions: modelPreferences.favoriteModelOptions,
    topModelOptions: modelOptions.slice(0, 6),
    favoritesOnly: modelPreferences.favoritesOnly,
    setFavoritesOnly: modelPreferences.setFavoritesOnly,
    selectedModelOption: modelOptions.find((m) => m.id === selectedModelId) ?? null,
    resetModelFilters: () => modelPreferences.setModelSearch(""),
    isFavoriteModel: modelPreferences.isFavoriteModel,
    toggleFavoriteModel: modelPreferences.toggleFavoriteModel,
    setPreferredDefaultModel: setConversationDraftModelId,
    isModelSelectable: () => true,
    modelHint: "Choose a model from the OpenRouter catalog.",
    modelCount: modelOptions.length,
    filteredModelCount: modelPreferences.filteredModelOptions.length,
    activeConversationUsageLabel: "Usage appears after the first response",
    activeConversationUsageRatio: null,
    activeConversationUsageTotalsLabel: "",
    accountUsageLabel: "",
    accountStatusError: null,
    isLoadingAccountStatus: accountStatusQuery.isLoading,
    isLoadingConversation: activeConversationQuery.isLoading,
    isLoadingConversations: conversationsQuery.isLoading,
    hasConversations: conversationList.length > 0,
    conversationOptions: conversationList.map((c) => ({
      id: c.id,
      label: c.title,
      preview: c.lastMessagePreview ?? "No messages yet",
      meta: c.updatedAt,
      usageSummary: c.usageSummary,
      usageLabel: null,
      usageProgressLabel: "",
    })),
    canRenameConversation: Boolean(activeConversationId),
    canDeleteConversation: Boolean(activeConversationId),
    isRenameDialogOpen,
    isDeleteDialogOpen,
    renameDraft,
    setRenameDraft,
    openRenameDialog,
    closeRenameDialog,
    openDeleteDialog,
    closeDeleteDialog,
    submitRenameConversation,
    confirmDeleteConversation,
    isRenamingConversation: renameConversationMutation.isPending,
    isDeletingConversation: deleteConversationMutation.isPending,
    currentDefaultModelId: modelCatalogQuery.data?.defaultModel,
    hasPendingToolPresetChange: false,
    toolPresetStatusLabel: "",
    selectedToolPresetOption: {
      value: selectedToolPreset,
      label: selectedToolPreset === "agent" ? "Agent" : "Ask",
      description: "",
    },
    activeConversationToolPresetOption: {
      value: activeConversation?.toolPreset ?? selectedToolPreset,
      label: (activeConversation?.toolPreset ?? selectedToolPreset) === "agent" ? "Agent" : "Ask",
      description: "",
    },
    moveFavoriteModel: modelPreferences.moveFavoriteModel,
    errorDebugDetails: null,
  };
}

export type DashboardAgentChatState = ReturnType<typeof useDashboardAgentChat>;
