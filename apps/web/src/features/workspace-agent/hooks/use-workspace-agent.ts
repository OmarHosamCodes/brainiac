import type {
  AgentChatTurnStreamEvent,
  AgentScopeRef,
  AgentSurface,
  AgentToolCall,
  DashboardAgentToolPreset,
  DashboardConversationMessage,
} from "@orch/agent/types";
import type { WorkspaceNode } from "@orch/workspace";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { streamAgentChatTurn } from "@/features/workspace-agent/agent-turn-stream";
import { useAgentScopeModeListener } from "@/features/workspace-agent/hooks/use-agent-scope-mode-listener";
import { useWorkspaceAgentChatScroll } from "@/features/workspace-agent/hooks/use-workspace-agent-chat-scroll";
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
import { useWorkspaceAgentStore } from "@/features/workspace-agent/stores/workspace-agent-store";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type StreamingChatMessage = Omit<DashboardConversationMessage, "content" | "toolsCalled"> & {
  content: string;
  toolsCalled: AgentToolCall[];
};

function upsertToolCall(tools: AgentToolCall[], tool: AgentToolCall): AgentToolCall[] {
  const toolId = tool.id ?? tool.name;
  const index = tools.findIndex((entry) => (entry.id ?? entry.name) === toolId);
  if (index === -1) {
    return [...tools, tool];
  }
  const next = [...tools];
  next[index] = tool;
  return next;
}

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
  const [pendingMessages, setPendingMessages] = useState<StreamingChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStopped, setStreamStopped] = useState(false);
  const [followOutput, setFollowOutput] = useState(true);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
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
  const messages = useMemo(
    () => [...(activeConversation?.messages ?? []), ...pendingMessages],
    [activeConversation?.messages, pendingMessages],
  );
  const streamingContentLength =
    pendingMessages.find((message) => message.role === "assistant")?.content.length ?? 0;
  const chatScroll = useWorkspaceAgentChatScroll({
    followOutput,
    isStreaming,
    messageCount: messages.length,
    streamingContentLength,
    onFollowOutputChange: setFollowOutput,
  });

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
  const modelPreferences = useWorkspaceAgentModelPreferences(modelOptions, {
    freeOnly: modelPresetState.free,
  });
  const selectedModelId =
    modelPresetState.outboundModelId ??
    modelPresetState.lastResolvedModelId ??
    modelCatalogQuery.data?.defaultModel ??
    modelOptions[0]?.id;
  const canSend = draft.trim().length > 0 && !isStreaming;
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

  const rememberResolvedModel = modelPresetState.rememberResolvedModel;

  useEffect(() => {
    if (activeConversation?.toolPreset && surface !== "agency") {
      setSelectedToolPreset(activeConversation.toolPreset);
    }
    if (activeConversation?.model) {
      rememberResolvedModel(activeConversation.model);
    }
  }, [
    activeConversation?.id,
    activeConversation?.model,
    activeConversation?.toolPreset,
    rememberResolvedModel,
    surface,
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
      setPendingMessages([]);
      setError(null);
      setDraft("");
    },
    [setDraft],
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
    streamAbortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(async () => {
    const content = draft.trim();
    const model = modelPresetState.outboundModelId?.trim();
    const modelPreset = modelPresetState.modelPreset;
    const lastResolvedModelId = modelPresetState.lastResolvedModelId;
    if (!content || isStreaming) return;
    if (surface === "agency" && !teamId) {
      setError("Select an Agency team before asking about time.");
      return;
    }

    const pendingUserId = `pending-user-${crypto.randomUUID()}`;
    const pendingAssistantId = `pending-assistant-${crypto.randomUUID()}`;
    const abortController = new AbortController();
    streamAbortRef.current = abortController;

    setDraft("");
    setError(null);
    setStreamStopped(false);
    setFollowOutput(true);
    setIsStreaming(true);
    setStreamingMessageId(pendingAssistantId);
    setPendingMessages([
      {
        id: pendingUserId,
        role: "user",
        content,
        contextNodeTitles: scopeChips.map((chip) => chip.label),
        model: model ?? lastResolvedModelId ?? null,
        toolsCalled: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: pendingAssistantId,
        role: "assistant",
        content: "",
        contextNodeTitles: [],
        model: model ?? lastResolvedModelId ?? null,
        toolsCalled: [],
        createdAt: new Date().toISOString(),
      },
    ]);

    const scopedNodes =
      surface === "canvas"
        ? workspaceNodes.filter((node) =>
            scopeChips.some((chip) => chip.kind === "node" && chip.id === node.id),
          )
        : [];

    let startedConversationId: string | null = null;
    let completed = false;

    const applyStreamEvent = (event: AgentChatTurnStreamEvent) => {
      switch (event.type) {
        case "started":
          startedConversationId = event.conversationId;
          setActiveConversationId(event.conversationId);
          setStreamingMessageId(event.assistantMessageId);
          setPendingMessages((current) =>
            current.map((message) => {
              if (message.role === "user") {
                return { ...message, id: event.userMessageId, model: event.model };
              }
              return { ...message, id: event.assistantMessageId, model: event.model };
            }),
          );
          return;
        case "token":
          setPendingMessages((current) =>
            current.map((message) =>
              message.role === "assistant"
                ? { ...message, content: `${message.content}${event.delta}` }
                : message,
            ),
          );
          return;
        case "tool":
          setPendingMessages((current) =>
            current.map((message) =>
              message.role === "assistant"
                ? { ...message, toolsCalled: upsertToolCall(message.toolsCalled, event.tool) }
                : message,
            ),
          );
          return;
        case "error":
          setError(event.message);
          return;
        case "completed": {
          completed = true;
          setPendingMessages([]);
          setActiveConversationId(event.conversation.id);
          setStreamStopped(event.stopped);
          rememberResolvedModel(event.assistantMessage.model ?? event.conversation.model);
          if (event.workspaceSnapshot) {
            useWorkspaceStore
              .getState()
              .applyWorkspaceSnapshot(
                event.workspaceSnapshot.nodes,
                event.workspaceSnapshot.updatedAt,
              );
          }
          void queryClient.invalidateQueries({ queryKey: conversationsListQueryOptions.queryKey });
          void queryClient.invalidateQueries({
            queryKey: orpc.agent.conversations.get.queryKey({
              input: { conversationId: event.conversation.id },
            }),
          });
          return;
        }
        default: {
          const _exhaustive: never = event;
          return _exhaustive;
        }
      }
    };

    try {
      await streamAgentChatTurn(
        {
          conversationId: activeConversationId ?? undefined,
          content,
          surface,
          toolPreset: effectiveToolPreset,
          modelPreset,
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
        {
          signal: abortController.signal,
          onEvent: applyStreamEvent,
        },
      );
      if (!completed && abortController.signal.aborted) {
        setStreamStopped(true);
        if (startedConversationId) {
          void queryClient.invalidateQueries({ queryKey: conversationsListQueryOptions.queryKey });
          void queryClient.invalidateQueries({
            queryKey: orpc.agent.conversations.get.queryKey({
              input: { conversationId: startedConversationId },
            }),
          });
          setPendingMessages([]);
        }
      }
    } catch (streamError) {
      setPendingMessages([]);
      if (!startedConversationId) {
        setDraft(content);
      }
      setError(getErrorMessage(streamError, "Failed to reach the agent."));
    } finally {
      setIsStreaming(false);
      setStreamingMessageId(null);
      streamAbortRef.current = null;
    }
  }, [
    activeConversationId,
    draft,
    effectiveToolPreset,
    isStreaming,
    modelPresetState.lastResolvedModelId,
    modelPresetState.modelPreset,
    modelPresetState.outboundModelId,
    queryClient,
    conversationsListQueryOptions.queryKey,
    rememberResolvedModel,
    scopeChips,
    setDraft,
    surface,
    teamId,
    workspaceNodes,
  ]);

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
      setIsRenameDialogOpen(false);
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
    const deletedId = activeConversationId;
    try {
      await deleteConversationMutation.mutateAsync({ conversationId: deletedId });
      void queryClient.invalidateQueries({ queryKey: conversationsListQueryOptions.queryKey });
      setIsDeleteDialogOpen(false);
      startNewConversation();
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

  const bottomOffsetClass = surface === "agency" ? "bottom-20" : "bottom-6";

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
    error,
    messages,
    canSend,
    isPending: isStreaming,
    isStreaming,
    streamStopped,
    followOutput,
    setFollowOutput,
    streamingMessageId,
    chatScrollRef: chatScroll.scrollRef,
    chatEndRef: chatScroll.endRef,
    onChatScroll: chatScroll.onScroll,
    sendMessage,
    stopGeneration,
    selectedToolPreset: effectiveToolPreset,
    setSelectedToolPreset,
    agentModeDisabled: surface === "agency",
    selectedModelId,
    selectedModelLabel: modelPresetState.selectedModelLabel,
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
