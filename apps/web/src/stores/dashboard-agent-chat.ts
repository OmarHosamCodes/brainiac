import type { DashboardAgentToolPreset, DashboardConversationMessage } from "@brainiac/agent";
import { cn } from "@/lib/utils";
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
import { getErrorMessage } from "@/lib/utils/get-error-message";

const FAVORITE_MODELS_KEY = "brainiac:agent-favorite-models";

function loadFavoriteModelIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITE_MODELS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function saveFavoriteModelIds(ids: string[]) {
  localStorage.setItem(FAVORITE_MODELS_KEY, JSON.stringify(ids));
}

function normalizeModelSearch(value: string) {
  return value.trim().toLowerCase();
}

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
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteModelIds, setFavoriteModelIds] = useState<string[]>(() => loadFavoriteModelIds());
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");

  useEffect(() => {
    saveFavoriteModelIds(favoriteModelIds);
  }, [favoriteModelIds]);

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
  const renameConversationMutation = useMutation(orpc.agent.conversations.rename.mutationOptions());
  const deleteConversationMutation = useMutation(orpc.agent.conversations.delete.mutationOptions());

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

  const favoriteModelIdSet = useMemo(() => new Set(favoriteModelIds), [favoriteModelIds]);

  const filteredModelOptions = useMemo(() => {
    const normalizedSearch = normalizeModelSearch(modelSearch);

    return modelOptions.filter((model) => {
      if (favoritesOnly && !favoriteModelIdSet.has(model.id)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = cn(model.name, model.id, model.creatorLabel ?? "").toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [favoriteModelIdSet, favoritesOnly, modelOptions, modelSearch]);

  const favoriteModelOptions = useMemo(
    () => modelOptions.filter((model) => favoriteModelIdSet.has(model.id)),
    [favoriteModelIdSet, modelOptions],
  );

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

  const switchConversation = useCallback((conversationId: string | null) => {
    setActiveConversationId(conversationId);
    setDraft("");
    setPendingMessages([]);
    setError(null);
    setSelectedNodeIds([]);
  }, []);

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

  const isFavoriteModel = useCallback(
    (modelId: string) => favoriteModelIdSet.has(modelId),
    [favoriteModelIdSet],
  );

  const toggleFavoriteModel = useCallback((modelId: string) => {
    setFavoriteModelIds((current) =>
      current.includes(modelId) ? current.filter((id) => id !== modelId) : [...current, modelId],
    );
  }, []);

  const moveFavoriteModel = useCallback((modelId: string, direction: "up" | "down") => {
    setFavoriteModelIds((current) => {
      const index = current.indexOf(modelId);
      if (index === -1) return current;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      const [item] = next.splice(index, 1);
      if (!item) return current;
      next.splice(targetIndex, 0, item);
      return next;
    });
  }, []);

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
    modelSearch,
    setModelSearch,
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
    filteredModelOptions,
    favoriteModelOptions,
    topModelOptions: modelOptions.slice(0, 6),
    favoritesOnly,
    setFavoritesOnly,
    selectedModelOption: modelOptions.find((m) => m.id === selectedModelId) ?? null,
    resetModelFilters: () => setModelSearch(""),
    isFavoriteModel,
    toggleFavoriteModel,
    setPreferredDefaultModel: setConversationDraftModelId,
    isModelSelectable: () => true,
    modelHint: "Choose a model from the OpenRouter catalog.",
    modelCount: modelOptions.length,
    filteredModelCount: filteredModelOptions.length,
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
    moveFavoriteModel,
    errorDebugDetails: null,
  };
}

export type DashboardAgentChatState = ReturnType<typeof useDashboardAgentChat>;
