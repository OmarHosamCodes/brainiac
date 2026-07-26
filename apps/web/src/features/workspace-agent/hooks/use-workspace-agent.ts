import type {
  AgentScopeRef,
  AgentSurface,
  DashboardAgentToolPreset,
  DashboardConversationMessage,
} from "@orch/agent";
import type { WorkspaceNode } from "@orch/workspace";
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
import { useWorkspaceAgentStore } from "@/features/workspace-agent/stores/workspace-agent-store";
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
  const [pendingMessages, setPendingMessages] = useState<DashboardConversationMessage[]>([]);
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
  const canSend = draft.trim().length > 0 && !chatTurnMutation.isPending;
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

  const sendMessage = useCallback(async () => {
    const content = draft.trim();
    const model = modelPresetState.outboundModelId?.trim();
    const modelPreset = modelPresetState.modelPreset;
    const lastResolvedModelId = modelPresetState.lastResolvedModelId;
    if (!content || chatTurnMutation.isPending) return;
    if (surface === "agency" && !teamId) {
      setError("Select an Agency team before asking about time.");
      return;
    }

    setDraft("");
    setError(null);
    setPendingMessages([
      {
        id: `pending-${crypto.randomUUID()}`,
        role: "user",
        content,
        contextNodeTitles: scopeChips.map((chip) => chip.label),
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

    try {
      const result = await chatTurnMutation.mutateAsync({
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
      });
      setPendingMessages([]);
      setActiveConversationId(result.conversation.id);
      rememberResolvedModel(result.assistantMessage.model ?? result.conversation.model);
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
      setError(getErrorMessage(mutationError, "Failed to reach the agent."));
    }
  }, [
    activeConversationId,
    chatTurnMutation,
    draft,
    effectiveToolPreset,
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
    isPending: chatTurnMutation.isPending,
    sendMessage,
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
