import type {
  AgentScopeRef,
  AgentSurface,
  AgentTextAttachment,
  DashboardAgentToolPreset,
} from "@orch/agent/types";
import type { WorkspaceNode } from "@orch/workspace";
import { useChat } from "@ai-sdk/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { useAgentScopeModeListener } from "@/features/workspace-agent/hooks/use-agent-scope-mode-listener";
import { useCurrentAgencyTeamStore } from "@/features/time-tracking/stores/agency-timer";
import { useWorkspaceStore } from "@/features/workspace/workspace-local-state";
import {
  getActiveWorkspaceAgentMention,
  getWorkspaceAgentMentionSuggestions,
  stripActiveWorkspaceAgentMention,
} from "@/features/workspace-agent/workspace-agent-mentions";
import { useWorkspaceAgentData } from "@/features/workspace-agent/hooks/use-workspace-agent-data";
import { useWorkspaceAgentModelPreferences } from "@/features/workspace-agent/hooks/use-workspace-agent-model-preferences";
import { useWorkspaceAgentModelPreset } from "@/features/workspace-agent/hooks/use-workspace-agent-model-preset";
import { OrchTurnStreamTransport } from "@/features/workspace-agent/orch-turn-stream-transport";
import {
  dashboardMessagesToUIMessages,
  type OrchUIMessage,
} from "@/features/workspace-agent/orch-ui-message";
import { useWorkspaceAgentStore } from "@/features/workspace-agent/stores/workspace-agent-store";
import { applyBoundWorkspaceSnapshot } from "@/features/workspace/workspace-snapshot-handler";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

function resolveAgentSurface(pathname: string): AgentSurface {
  if (pathname.startsWith("/agency")) return "agency";
  return "canvas";
}

export function useWorkspaceAgent() {
  useAgentScopeModeListener();

  const location = useLocation();
  const surface = resolveAgentSurface(location.pathname);
  const teamId = useCurrentAgencyTeamStore((s) => s.currentAgencyTeamId);
  const workspaceNodes = useWorkspaceStore((s) => s.nodes);

  const expanded = useWorkspaceAgentStore((s) => s.expanded);
  const setExpanded = useWorkspaceAgentStore((s) => s.setExpanded);
  const toggleExpanded = useWorkspaceAgentStore((s) => s.toggleExpanded);
  const scopeModeActive = useWorkspaceAgentStore((s) => s.scopeModeActive);
  const toggleScopeMode = useWorkspaceAgentStore((s) => s.toggleScopeMode);
  const setScopeModeActive = useWorkspaceAgentStore((s) => s.setScopeModeActive);
  const scopeHintSeen = useWorkspaceAgentStore((s) => s.scopeHintSeen);
  const draft = useWorkspaceAgentStore((s) => s.draft);
  const setDraft = useWorkspaceAgentStore((s) => s.setDraft);
  const scopeChips = useWorkspaceAgentStore((s) => s.scopeChips);
  const addScopeChip = useWorkspaceAgentStore((s) => s.addScopeChip);
  const removeScopeChip = useWorkspaceAgentStore((s) => s.removeScopeChip);
  const clearScopeChips = useWorkspaceAgentStore((s) => s.clearScopeChips);

  const [error, setError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [streamStopped, setStreamStopped] = useState(false);
  const [selectedToolPreset, setSelectedToolPreset] = useState<DashboardAgentToolPreset>("agent");
  const [modelLibraryOpen, setModelLibraryOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [threadMenuOpen, setThreadMenuOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");

  const effectiveToolPreset: DashboardAgentToolPreset =
    surface === "agency" ? "ask" : selectedToolPreset;

  const data = useWorkspaceAgentData({
    activeConversationId,
    surface,
    toolPreset: effectiveToolPreset,
    toolsMenuOpen,
  });

  const {
    queryClient,
    conversationsListQueryOptions,
    conversationsQuery,
    modelCatalogQuery,
    accountStatusQuery,
    activeConversationQuery,
    toolsCatalogQuery,
    renameConversationMutation,
    deleteConversationMutation,
  } = data;

  const conversationList = conversationsQuery.data?.conversations ?? [];
  const activeConversation = activeConversationQuery.data ?? null;

  const transport = useMemo(() => new OrchTurnStreamTransport(), []);

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

  const modelPresetState = useWorkspaceAgentModelPreset({
    isFreeTier: accountStatusQuery.data?.isFreeTier,
    modelOptions,
  });

  const {
    messages,
    sendMessage: chatSendMessage,
    status,
    stop,
    setMessages,
    error: chatError,
  } = useChat<OrchUIMessage>({
    id: "workspace-agent-chat",
    transport,
    onData: (dataPart) => {
      if (dataPart.type === "data-orchMeta") {
        setActiveConversationId(dataPart.data.conversationId);
        modelPresetState.rememberResolvedModel(dataPart.data.model);
        return;
      }
      if (dataPart.type === "data-orchCompleted") {
        setStreamStopped(dataPart.data.stopped);
        setActiveConversationId(dataPart.data.conversationId);
        if (dataPart.data.workspaceSnapshot) {
          applyBoundWorkspaceSnapshot(
            dataPart.data.workspaceSnapshot.nodes as WorkspaceNode[],
            dataPart.data.workspaceSnapshot.updatedAt,
          );
        }
        void queryClient.invalidateQueries({ queryKey: conversationsListQueryOptions.queryKey });
        void queryClient.invalidateQueries({
          queryKey: orpc.agent.conversations.get.queryKey({
            input: { conversationId: dataPart.data.conversationId },
          }),
        });
      }
    },
    onError: (streamError) => {
      setError(getErrorMessage(streamError, "Failed to reach the agent."));
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";
  const canSend = !isStreaming;
  const displayError =
    error ?? (chatError ? getErrorMessage(chatError, "Failed to reach the agent.") : null);

  const modelPreferences = useWorkspaceAgentModelPreferences(modelOptions, {
    freeOnly: modelPresetState.free,
  });
  const selectedModelId =
    modelPresetState.outboundModelId ??
    modelPresetState.lastResolvedModelId ??
    modelCatalogQuery.data?.defaultModel ??
    modelOptions[0]?.id;

  const activeMention = getActiveWorkspaceAgentMention(draft);
  const mentionSuggestions = useMemo(
    () =>
      surface === "canvas" && activeMention
        ? getWorkspaceAgentMentionSuggestions(
            workspaceNodes,
            activeMention.query,
            new Set(scopeChips.filter((chip) => chip.kind === "node").map((chip) => chip.id)),
          )
        : [],
    [activeMention, scopeChips, surface, workspaceNodes],
  );

  useEffect(() => {
    if (surface === "agency" && selectedToolPreset !== "ask") {
      setSelectedToolPreset("ask");
    }
  }, [selectedToolPreset, surface]);

  useEffect(() => {
    if (activeConversation?.toolPreset && surface !== "agency") {
      setSelectedToolPreset(activeConversation.toolPreset);
    }
    if (activeConversation?.model) {
      modelPresetState.rememberResolvedModel(activeConversation.model);
    }
  }, [
    activeConversation?.id,
    activeConversation?.model,
    activeConversation?.toolPreset,
    modelPresetState.rememberResolvedModel,
    surface,
  ]);

  useEffect(() => {
    if (isStreaming) return;
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    if (activeConversation?.id !== activeConversationId) return;
    setMessages(dashboardMessagesToUIMessages(activeConversation.messages));
  }, [
    activeConversation?.id,
    activeConversation?.messages,
    activeConversationId,
    isStreaming,
    setMessages,
  ]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMac = /mac|iphone|ipad/i.test(navigator.platform);
      const modifier = isMac ? event.metaKey : event.ctrlKey;
      if (modifier && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "j") {
        event.preventDefault();
        toggleExpanded();
        return;
      }
      if (event.key === "Escape") {
        if (scopeModeActive) {
          setScopeModeActive(false);
          return;
        }
        if (expanded) {
          setExpanded(false);
        }
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (!expanded || scopeModeActive) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-workspace-agent-root]")) return;
      if (target.closest("[data-workspace-agent-overlay]")) return;
      if (target.closest('[data-slot="popover-content"]')) return;
      if (target.closest('[data-slot="dialog-content"]')) return;
      if (target.closest('[data-slot="dialog-overlay"]')) return;
      setExpanded(false);
    }

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [expanded, scopeModeActive, setExpanded, setScopeModeActive, toggleExpanded]);

  const switchConversation = useCallback(
    (conversationId: string | null) => {
      setActiveConversationId(conversationId);
      setError(null);
      setStreamStopped(false);
      setDraft("");
      if (!conversationId) {
        setMessages([]);
      }
    },
    [setDraft, setMessages],
  );

  const startNewConversation = useCallback(() => {
    switchConversation(null);
  }, [switchConversation]);

  const addMentionedNode = useCallback(
    (node: WorkspaceNode) => {
      addScopeChip({ kind: "node", id: node.id, label: node.title });
      setDraft(stripActiveWorkspaceAgentMention(draft));
    },
    [addScopeChip, draft, setDraft],
  );

  const stopGeneration = useCallback(() => {
    void stop();
  }, [stop]);

  const sendMessage = useCallback(
    async (input: { text: string; attachments?: AgentTextAttachment[] } = { text: draft }) => {
      const content = input.text.trim();
      const attachments = input.attachments ?? [];
      const model = modelPresetState.outboundModelId?.trim();
      if ((!content && attachments.length === 0) || isStreaming) return;
      if (surface === "agency" && !teamId) {
        setError("Select an Agency team before asking about time.");
        return;
      }

      const scopedNodes =
        surface === "canvas"
          ? workspaceNodes.filter((node) =>
              scopeChips.some((chip) => chip.kind === "node" && chip.id === node.id),
            )
          : [];

      setDraft("");
      setError(null);
      setStreamStopped(false);

      try {
        await chatSendMessage(
          { text: content },
          {
            body: {
              content,
              attachments,
              conversationId: activeConversationId ?? undefined,
              surface,
              toolPreset: effectiveToolPreset,
              modelPreset: modelPresetState.modelPreset,
              scopeRefs: scopeChips,
              contextNodeTitles: scopeChips.map((chip) => chip.label),
              ...(surface === "agency" && teamId ? { teamId } : {}),
              ...(surface === "canvas"
                ? {
                    nodes: workspaceNodes,
                    scopeNodes: scopedNodes.length > 0 ? scopedNodes : workspaceNodes,
                  }
                : {}),
              ...(model ? { model } : {}),
            },
          },
        );
      } catch (streamError) {
        setDraft(content);
        setError(getErrorMessage(streamError, "Failed to reach the agent."));
      }
    },
    [
      activeConversationId,
      chatSendMessage,
      draft,
      effectiveToolPreset,
      isStreaming,
      modelPresetState.modelPreset,
      modelPresetState.outboundModelId,
      scopeChips,
      setDraft,
      surface,
      teamId,
      workspaceNodes,
    ],
  );

  const submitRenameConversation = useCallback(async () => {
    const title = renameDraft.trim();
    if (!activeConversationId || !title) return;
    try {
      await renameConversationMutation.mutateAsync({
        conversationId: activeConversationId,
        title,
      });
      setIsRenameDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: conversationsListQueryOptions.queryKey });
      void queryClient.invalidateQueries({
        queryKey: orpc.agent.conversations.get.queryKey({
          input: { conversationId: activeConversationId },
        }),
      });
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to rename conversation."));
    }
  }, [
    activeConversationId,
    conversationsListQueryOptions.queryKey,
    queryClient,
    renameConversationMutation,
    renameDraft,
  ]);

  const confirmDeleteConversation = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      await deleteConversationMutation.mutateAsync({ conversationId: activeConversationId });
      setIsDeleteDialogOpen(false);
      startNewConversation();
      void queryClient.invalidateQueries({ queryKey: conversationsListQueryOptions.queryKey });
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to delete conversation."));
    }
  }, [
    activeConversationId,
    conversationsListQueryOptions.queryKey,
    deleteConversationMutation,
    queryClient,
    startNewConversation,
  ]);

  const placeholder = surface === "agency" ? "Ask about your time" : "Ask about this canvas";
  const bottomOffsetClass = surface === "agency" ? "bottom-8" : "bottom-4";
  const streamingMessageId =
    isStreaming && messages[messages.length - 1]?.role === "assistant"
      ? (messages[messages.length - 1]?.id ?? null)
      : null;

  return {
    surface,
    teamId,
    expanded,
    setExpanded,
    toggleExpanded,
    scopeModeActive,
    toggleScopeMode,
    scopeHintSeen,
    draft,
    setDraft,
    scopeChips,
    removeScopeChip,
    clearScopeChips,
    addMentionedNode,
    mentionSuggestions,
    activeMention,
    error: displayError,
    messages,
    canSend,
    isPending: isStreaming,
    isStreaming,
    streamStopped,
    streamingMessageId,
    chatStatus: status,
    sendMessage,
    stopGeneration,
    selectedToolPreset: effectiveToolPreset,
    setSelectedToolPreset,
    agentModeDisabled: surface === "agency",
    selectedModelId,
    selectedModelLabel: modelPresetState.selectedModelLabel,
    selectedModelButtonLabel: modelPresetState.selectedModelButtonLabel,
    resolvedModelLabel: modelPresetState.resolvedModelLabel,
    modelTier: modelPresetState.tier,
    modelAuto: modelPresetState.auto,
    modelFree: modelPresetState.free,
    setModelTier: modelPresetState.setTier,
    setModelAuto: modelPresetState.setAuto,
    setModelFree: modelPresetState.setFree,
    pinModel: modelPresetState.pinModel,
    modelLibraryOpen,
    setModelLibraryOpen,
    modelMenuOpen,
    setModelMenuOpen,
    toolsMenuOpen,
    setToolsMenuOpen,
    threadMenuOpen,
    setThreadMenuOpen,
    tools: toolsCatalogQuery.data?.tools ?? [],
    toolsLoading: toolsCatalogQuery.isLoading,
    modelOptions,
    filteredModelOptions: modelPreferences.filteredModelOptions,
    modelSearch: modelPreferences.modelSearch,
    setModelSearch: modelPreferences.setModelSearch,
    favoritesOnly: modelPreferences.favoritesOnly,
    setFavoritesOnly: modelPreferences.setFavoritesOnly,
    isFavoriteModel: modelPreferences.isFavoriteModel,
    toggleFavoriteModel: modelPreferences.toggleFavoriteModel,
    placeholder,
    bottomOffsetClass,
    activeConversationId,
    activeConversationTitle: activeConversation?.title ?? "New conversation",
    conversationOptions: conversationList.map((conversation) => ({
      id: conversation.id,
      label: conversation.title,
      preview: conversation.lastMessagePreview ?? "No messages yet",
    })),
    startNewConversation,
    switchConversation,
    isRenameDialogOpen,
    isDeleteDialogOpen,
    renameDraft,
    setRenameDraft,
    openRenameDialog: () => {
      setRenameDraft(activeConversation?.title ?? "");
      setIsRenameDialogOpen(true);
    },
    closeRenameDialog: () => setIsRenameDialogOpen(false),
    openDeleteDialog: () => setIsDeleteDialogOpen(true),
    closeDeleteDialog: () => setIsDeleteDialogOpen(false),
    submitRenameConversation,
    confirmDeleteConversation,
    isRenamingConversation: renameConversationMutation.isPending,
    isDeletingConversation: deleteConversationMutation.isPending,
    canManageConversation: Boolean(activeConversationId),
  };
}

export type WorkspaceAgentViewModel = ReturnType<typeof useWorkspaceAgent>;
export type WorkspaceAgentScopeChip = AgentScopeRef;
