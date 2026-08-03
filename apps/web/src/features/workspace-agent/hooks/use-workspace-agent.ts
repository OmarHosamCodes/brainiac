import type {
  AgentScopeRef,
  AgentSurface,
  AgentTextAttachment,
  DashboardAgentToolPreset,
} from "@orch/agent/types";
import type { WorkspaceNode } from "@orch/workspace";
import { useChat } from "@ai-sdk/react";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import { useAgentCanvasOverlay } from "@/features/workspace-agent/hooks/use-agent-canvas-overlay";
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
  collectArtifactsFromMessages,
  dashboardMessagesToUIMessages,
  type OrchUIDataParts,
  type OrchUIMessage,
} from "@/features/workspace-agent/orch-ui-message";
import { useWorkspaceAgentStore } from "@/features/workspace-agent/stores/workspace-agent-store";
import { applyBoundWorkspaceSnapshot } from "@/features/workspace/workspace-snapshot-handler";
import { orpc, orpcClient } from "@/lib/orpc";
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
  /** How many artifacts the operator has already dismissed from the dock. */
  const [dismissedArtifactCount, setDismissedArtifactCount] = useState(0);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);

  const data = useWorkspaceAgentData({
    activeConversationId,
    surface,
    toolPreset: selectedToolPreset,
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
    // Canvas does not ship Plan mode yet — coerce to Ask.
    if (surface === "canvas" && selectedToolPreset === "plan") {
      setSelectedToolPreset("ask");
    }
  }, [selectedToolPreset, surface]);

  useEffect(() => {
    if (activeConversation?.toolPreset) {
      const preset = activeConversation.toolPreset;
      if (surface === "canvas" && preset === "plan") {
        setSelectedToolPreset("ask");
      } else {
        setSelectedToolPreset(preset);
      }
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
        if (canvasOpen) {
          setCanvasOpen(false);
          return;
        }
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
      if (target.closest('[data-slot="dropdown-menu-content"]')) return;
      if (target.closest('[data-slot="dialog-content"]')) return;
      if (target.closest('[data-slot="dialog-overlay"]')) return;
      if (target.closest('[data-slot="agent-canvas-overlay"]')) return;
      setExpanded(false);
    }

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [canvasOpen, expanded, scopeModeActive, setExpanded, setScopeModeActive, toggleExpanded]);

  const switchConversation = useCallback(
    (conversationId: string | null) => {
      setActiveConversationId(conversationId);
      setError(null);
      setStreamStopped(false);
      setDraft("");
      setDismissedArtifactCount(0);
      setCanvasOpen(false);
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
              toolPreset: selectedToolPreset,
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
      selectedToolPreset,
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

  const deleteConversationById = useCallback(
    async (conversationId: string) => {
      setDeletingConversationId(conversationId);
      try {
        await deleteConversationMutation.mutateAsync({ conversationId });
        if (conversationId === activeConversationId) {
          setIsDeleteDialogOpen(false);
          startNewConversation();
        }
        void queryClient.invalidateQueries({ queryKey: conversationsListQueryOptions.queryKey });
      } catch (mutationError) {
        setError(getErrorMessage(mutationError, "Failed to delete conversation."));
      } finally {
        setDeletingConversationId(null);
      }
    },
    [
      activeConversationId,
      conversationsListQueryOptions.queryKey,
      deleteConversationMutation,
      queryClient,
      startNewConversation,
    ],
  );

  const confirmDeleteConversation = useCallback(async () => {
    if (!activeConversationId) return;
    await deleteConversationById(activeConversationId);
  }, [activeConversationId, deleteConversationById]);

  const artifacts = useMemo(() => collectArtifactsFromMessages(messages), [messages]);
  const activeArtifact =
    artifacts.length > dismissedArtifactCount ? (artifacts.at(-1) ?? null) : null;

  const [proposalBusyId, setProposalBusyId] = useState<string | null>(null);
  const [planConfirmingId, setPlanConfirmingId] = useState<string | null>(null);

  const invalidateAgencyCaches = useCallback(async () => {
    if (!teamId) return;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.timeEntries.listMine.queryOptions({
          input: { teamId },
        }).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.timer.getActive.queryOptions({
          input: { teamId },
        }).queryKey,
      }),
    ]);
  }, [queryClient, teamId]);

  const confirmPlanMutation = useMutation({
    mutationFn: async (plan: OrchUIDataParts["orchPlan"]) => {
      if (!teamId) throw new Error("No active Agency team.");
      return orpcClient.agent.proposals.confirmPlan({
        teamId,
        conversationId: activeConversationId ?? undefined,
        // Stream cards keep action as unknown; API Zod re-validates the plan.
        plan: plan as Parameters<typeof orpcClient.agent.proposals.confirmPlan>[0]["plan"],
      });
    },
  });

  const approveProposalMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      if (!teamId) throw new Error("No active Agency team.");
      return orpcClient.agent.proposals.approve({ teamId, proposalId });
    },
  });

  const rejectProposalMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      if (!teamId) throw new Error("No active Agency team.");
      return orpcClient.agent.proposals.reject({ teamId, proposalId });
    },
  });

  const onConfirmPlan = useCallback(
    async (plan: OrchUIDataParts["orchPlan"]) => {
      setPlanConfirmingId(plan.planId);
      try {
        const result = await confirmPlanMutation.mutateAsync(plan);
        toast.success(
          `Plan confirmed — ${result.proposals.length} proposal${result.proposals.length === 1 ? "" : "s"} ready to Approve.`,
        );
      } catch (confirmError) {
        setError(getErrorMessage(confirmError, "Failed to confirm plan."));
      } finally {
        setPlanConfirmingId(null);
      }
    },
    [confirmPlanMutation],
  );

  const onApproveProposal = useCallback(
    async (proposalId: string) => {
      setProposalBusyId(proposalId);
      try {
        await approveProposalMutation.mutateAsync(proposalId);
        await invalidateAgencyCaches();
        toast.success("Change approved and applied.");
      } catch (approveError) {
        setError(getErrorMessage(approveError, "Failed to approve proposal."));
      } finally {
        setProposalBusyId(null);
      }
    },
    [approveProposalMutation, invalidateAgencyCaches],
  );

  const onRejectProposal = useCallback(
    async (proposalId: string) => {
      setProposalBusyId(proposalId);
      try {
        await rejectProposalMutation.mutateAsync(proposalId);
        toast.message("Proposal rejected.");
      } catch (rejectError) {
        setError(getErrorMessage(rejectError, "Failed to reject proposal."));
      } finally {
        setProposalBusyId(null);
      }
    },
    [rejectProposalMutation],
  );

  const dismissArtifact = useCallback(() => {
    setCanvasOpen(false);
    setDismissedArtifactCount(artifacts.length);
  }, [artifacts.length]);

  const openCanvas = useCallback(() => {
    if (!activeArtifact) return;
    setCanvasOpen(true);
  }, [activeArtifact]);

  const closeCanvas = useCallback(() => {
    setCanvasOpen(false);
  }, []);

  const canvasOverlayActive = canvasOpen && activeArtifact !== null;
  const { closeRef: canvasCloseRef } = useAgentCanvasOverlay(canvasOverlayActive, closeCanvas);

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
    selectedToolPreset,
    setSelectedToolPreset,
    planModeEnabled: surface === "agency",
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
      stamp: conversation.lastMessageAt || conversation.updatedAt,
    })),
    conversationsLoading: conversationsQuery.isLoading,
    startNewConversation,
    switchConversation,
    deleteConversationById,
    deletingConversationId,
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
    activeArtifact,
    canvasOpen: canvasOverlayActive,
    canvasCloseRef,
    openCanvas,
    closeCanvas,
    dismissArtifact,
    proposalBusyId,
    planConfirmingId,
    onConfirmPlan: (plan: OrchUIDataParts["orchPlan"]) => void onConfirmPlan(plan),
    onApproveProposal: (proposalId: string) => void onApproveProposal(proposalId),
    onRejectProposal: (proposalId: string) => void onRejectProposal(proposalId),
  };
}

export type WorkspaceAgentViewModel = ReturnType<typeof useWorkspaceAgent>;
export type WorkspaceAgentScopeChip = AgentScopeRef;
