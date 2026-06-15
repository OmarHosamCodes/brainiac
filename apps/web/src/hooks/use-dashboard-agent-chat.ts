import type {
  DashboardAgentToolPreset,
  DashboardConversationDetail,
  DashboardConversationMessage,
  DashboardConversationSummary,
  DashboardConversationUsageSummary,
  OpenRouterCatalogModel,
} from "@brainiac/agent";
import type { WorkspaceNode } from "@brainiac/workspace";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { useWorkspaceStore } from "@/stores/workspace";
import {
  getActiveDashboardNodeMention,
  getDashboardNodeMentionSuggestions,
  stripActiveDashboardNodeMention,
} from "@/lib/utils/dashboard-agent-mentions";
import { getErrorDebugDetails } from "@/lib/utils/get-error-debug-details";
import { getErrorMessage } from "@/lib/utils/get-error-message";


// Ported from apps/web/app/composables/useDashboardAgentChat.ts
export function useDashboardAgentChat(nodes: WorkspaceNode[], activeTabId?: string | null) {
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const workspaceApi = useWorkspaceStore();
  const workspaceNodes = workspaceApi.nodes;
  const authEnabled = Boolean(session.data?.user);

  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [pendingMessages, setPendingMessages] = useState<DashboardConversationMessage[]>([]);
  const [selectedToolPreset, setSelectedToolPreset] = useState<DashboardAgentToolPreset>("ask");
  const [conversationDraftModelId, setConversationDraftModelId] = useState<string | undefined>();
  const [modelSearch, setModelSearch] = useState("");

  const conversationsListQueryOptions = orpc.agent.conversations.list.queryOptions();
  const conversationsQuery = useQuery({ ...conversationsListQueryOptions, enabled: authEnabled });
  const modelCatalogQuery = useQuery({
    ...orpc.agent.modelCatalog.queryOptions(),
    enabled: authEnabled,
    staleTime: 10 * 60 * 1000,
  });
  const accountStatusQuery = useQuery({
    ...orpc.agent.accountStatus.queryOptions(),
    enabled: authEnabled,
    staleTime: 60 * 1000,
  });
  const activeConversationQuery = useQuery({
    ...orpc.agent.conversations.get.queryOptions({
      input: { conversationId: activeConversationId ?? "" },
    }),
    enabled: Boolean(authEnabled && activeConversationId),
  });
  const chatTurnMutation = useMutation(orpc.agent.chat.turn.mutationOptions());

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
  const modelOptions = modelCatalogQuery.data?.models ?? [];
  const selectedModelId = conversationDraftModelId ?? modelCatalogQuery.data?.defaultModel ?? modelOptions[0]?.id;
  const canSend = draft.trim().length > 0 && !chatTurnMutation.isPending;

  const sendMessage = useCallback(async (initialContent?: string) => {
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
        useWorkspaceStore.getState().applyWorkspaceSnapshot(
          result.workspaceSnapshot.nodes,
          result.workspaceSnapshot.updatedAt,
        );
      }
      void queryClient.invalidateQueries({ queryKey: conversationsListQueryOptions.queryKey });
    } catch (mutationError) {
      setPendingMessages([]);
      setDraft(content);
      setError(getErrorMessage(mutationError, "Failed to reach the dashboard agent."));
    }
  }, [activeConversationId, activeTabId, chatTurnMutation, draft, nodes, queryClient, selectedModelId, selectedNodes, selectedToolPreset, workspaceApi, workspaceNodes]);

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
    setActiveConversationId,
    conversationList,
    modelOptions,
    modelSearch,
    setModelSearch,
    selectedModelId,
    setConversationDraftModelId,
    selectedToolPreset,
    setSelectedToolPreset,
    selectToolPreset: setSelectedToolPreset,
    startNewConversation: () => {
      setActiveConversationId(null);
      setDraft("");
      setSelectedNodeIds([]);
      setPendingMessages([]);
      setError(null);
    },
    accountBalanceLabel: String(accountStatusQuery.data?.availableCredits ?? 0),
    isLoadingModels: modelCatalogQuery.isLoading,
    modelError: modelCatalogQuery.isError
      ? getErrorMessage(modelCatalogQuery.error, "Unable to load models.")
      : null,
    promptSuggestions: nodes.length
      ? ["Summarize the selected nodes.", "What should I focus on next?", "Find risks across these nodes."]
      : ["Help me sketch the first dashboard nodes.", "What nodes should I create this week?"],
    scopeLabel: selectedNodes.length
      ? `${selectedNodes.length} node${selectedNodes.length === 1 ? "" : "s"} in scope`
      : nodes.length === 1
        ? `"${nodes[0]?.title ?? "Node"}" in scope`
        : "Full workspace in scope",
    activeConversationTitle: activeConversation?.title ?? "New conversation",
    mentionSuggestions: [],
    activeMention: getActiveDashboardNodeMention(draft),
    addMentionedNode: (node: WorkspaceNode) => {
      setSelectedNodeIds((current) => (current.includes(node.id) ? current : [...current, node.id]));
      setDraft(stripActiveDashboardNodeMention(draft));
    },
    removeMentionedNode: (nodeId: string) => setSelectedNodeIds((current) => current.filter((id) => id !== nodeId)),
    clearMentionedNodes: () => setSelectedNodeIds([]),
    toolPresetOptions: [
      { value: "ask" as const, label: "Ask", description: "Direct answers" },
      { value: "agent" as const, label: "Agent", description: "Tool-using agent" },
    ],
    filteredModelOptions: modelOptions,
    favoriteModelOptions: [],
    topModelOptions: modelOptions.slice(0, 6),
    isModelLibraryOpen: false,
    setIsModelLibraryOpen: () => {},
    favoritesOnly: false,
    setFavoritesOnly: () => {},
    selectedModelOption: modelOptions.find((m) => m.id === selectedModelId) ?? null,
    accessFilter: "all" as const,
    setAccessFilter: () => {},
    toolsOnly: false,
    setToolsOnly: () => {},
    selectedCreatorIds: [] as string[],
    toggleCreatorFilter: () => {},
    resetModelFilters: () => setModelSearch(""),
    isFavoriteModel: () => false,
    toggleFavoriteModel: () => {},
    setPreferredDefaultModel: setConversationDraftModelId,
    isModelSelectable: () => true,
    modelHint: "Choose a model from the OpenRouter catalog.",
    modelCount: modelOptions.length,
    filteredModelCount: modelOptions.length,
    activeConversationUsageLabel: "Usage appears after the first response",
    activeConversationUsageRatio: null,
    activeConversationUsageTotalsLabel: "",
    accountUsageLabel: "",
    accountStatusError: null,
    isLoadingAccountStatus: accountStatusQuery.isLoading,
    isLoadingConversation: activeConversationQuery.isLoading,
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
    isRenameDialogOpen: false,
    isDeleteDialogOpen: false,
    renameDraft: "",
    openRenameDialog: () => {},
    closeRenameDialog: () => {},
    openDeleteDialog: () => {},
    closeDeleteDialog: () => {},
    submitRenameConversation: async () => {},
    confirmDeleteConversation: async () => {},
    isRenamingConversation: false,
    isDeletingConversation: false,
    creatorFilterOptions: [],
    currentDefaultModelId: modelCatalogQuery.data?.defaultModel,
    hasPendingToolPresetChange: false,
    toolPresetStatusLabel: "",
    selectedToolPresetOption: { value: selectedToolPreset, label: selectedToolPreset === "agent" ? "Agent" : "Ask", description: "" },
    activeConversationToolPresetOption: { value: selectedToolPreset, label: selectedToolPreset === "agent" ? "Agent" : "Ask", description: "" },
    moveFavoriteModel: () => {},
    errorDebugDetails: null,
  };
}
