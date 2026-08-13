import type {
  AgentModelPreset,
  AgentScopeRef,
  AgentSurface,
  AgentTextAttachment,
  AiUiArtifact,
  DashboardAgentToolPreset,
} from "@orch/agent/types";
import type { WorkspaceNode } from "@orch/workspace";
import { useChat } from "@ai-sdk/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "@/lib/navigation";
import { toast } from "sonner";

import { useAgencyActiveTimerQuery } from "@/features/shared/agency-queries";
import { useAgentCanvasOverlay } from "@/features/workspace-agent/hooks/use-agent-canvas-overlay";
import { useAgentScopeModeListener } from "@/features/workspace-agent/hooks/use-agent-scope-mode-listener";
import { useCurrentAgencyTeamStore } from "@/features/time-tracking/stores/agency-timer";
import { useWorkspaceStore } from "@/features/workspace/workspace-local-state";
import {
  getActiveWorkspaceAgentMention,
  getWorkspaceAgentMentionSuggestions,
  stripActiveWorkspaceAgentMention,
} from "@/features/workspace-agent/workspace-agent-mentions";
import { shouldOfferComposerDraftRestore } from "@/features/workspace-agent/composer-draft-display";
import { useWorkspaceAgentData } from "@/features/workspace-agent/hooks/use-workspace-agent-data";
import { useWorkspaceAgentModelPreferences } from "@/features/workspace-agent/hooks/use-workspace-agent-model-preferences";
import { useWorkspaceAgentModelPreset } from "@/features/workspace-agent/hooks/use-workspace-agent-model-preset";
import {
  OrchTurnStreamTransport,
  type OrchTurnSendContext,
} from "@/features/workspace-agent/orch-turn-stream-transport";
import {
  appendConfirmedProposalsToMessages,
  collectAnsweredQuestionIds,
  collectResolvedPlanIdsFromMessages,
  collectArtifactsFromMessages,
  dashboardMessagesToUIMessages,
  formatAgencyQuestionAnswerMessage,
  getMessageText,
  type OrchAgencyQuestionAnswer,
  type OrchUIDataParts,
  type OrchUIMessage,
} from "@/features/workspace-agent/orch-ui-message";
import { useWorkspaceAgentStore } from "@/features/workspace-agent/stores/workspace-agent-store";
import {
  buildWorkspaceAgentQuickStarts,
  type WorkspaceAgentQuickStart,
} from "@/features/workspace-agent/workspace-agent-quick-starts";
import { applyBoundWorkspaceSnapshot } from "@/features/workspace/workspace-snapshot-handler";
import {
  cancelQueuedAgentMessage,
  dequeueAgentMessage,
  enqueueAgentMessage,
  nextSendAction,
  type QueuedAgentMessage,
} from "@/features/workspace-agent/workspace-agent-message-queue";
import { orpc, orpcClient } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

function resolveAgentSurface(pathname: string): AgentSurface {
  if (pathname.startsWith("/agency")) return "agency";
  return "canvas";
}

function composerUnlockedSurfaces(
  surface: AgentSurface,
  scopeChips: AgentScopeRef[],
): AgentSurface[] {
  const canvasUnlocked =
    surface === "canvas" ||
    scopeChips.some(
      (chip) =>
        chip.kind === "node" ||
        chip.kind === "tab" ||
        chip.kind === "block" ||
        (chip.kind === "surface" && chip.id === "canvas"),
    );
  const agencyUnlocked =
    surface === "agency" ||
    scopeChips.some(
      (chip) =>
        chip.kind === "timeEntry" ||
        chip.kind === "project" ||
        chip.kind === "task" ||
        chip.kind === "member" ||
        (chip.kind === "surface" && chip.id === "agency"),
    );
  return [
    ...(canvasUnlocked ? (["canvas"] as const) : []),
    ...(agencyUnlocked ? (["agency"] as const) : []),
  ];
}

const COMPOSER_DRAFT_DEBOUNCE_MS = 500;

function buildOrchTurnSendContext(input: {
  conversationId: string | null;
  surface: AgentSurface;
  teamId: string | null;
  scopeChips: AgentScopeRef[];
  workspaceNodes: WorkspaceNode[];
  toolPreset: DashboardAgentToolPreset;
  modelPreset: AgentModelPreset;
  model?: string;
}): OrchTurnSendContext {
  const unlocked = composerUnlockedSurfaces(input.surface, input.scopeChips);
  const canvasUnlocked = unlocked.includes("canvas");
  const agencyUnlocked = unlocked.includes("agency");
  const scopedNodes = input.workspaceNodes.filter((node) =>
    input.scopeChips.some((chip) => chip.kind === "node" && chip.id === node.id),
  );
  return {
    conversationId: input.conversationId ?? undefined,
    surface: input.surface,
    unlockedSurfaces: unlocked,
    toolPreset: input.toolPreset,
    modelPreset: input.modelPreset,
    scopeRefs: input.scopeChips,
    contextNodeTitles: input.scopeChips.map((chip) => chip.label),
    ...(agencyUnlocked && input.teamId ? { teamId: input.teamId } : {}),
    ...(canvasUnlocked
      ? {
          nodes: input.workspaceNodes,
          scopeNodes: scopedNodes.length > 0 ? scopedNodes : input.workspaceNodes,
        }
      : {}),
    ...(input.model ? { model: input.model } : {}),
  };
}

export function useWorkspaceAgent() {
  useAgentScopeModeListener();

  const location = useLocation();
  const navigate = useNavigate();
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
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  /** How many artifacts the operator has already dismissed from the dock. */
  const [dismissedArtifactCount, setDismissedArtifactCount] = useState(0);
  /** When set, dock/overlay prefer this artifact (e.g. opened from a message card). */
  const [focusedArtifactId, setFocusedArtifactId] = useState<string | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [proposalBusyId, setProposalBusyId] = useState<string | null>(null);
  const [planConfirmingId, setPlanConfirmingId] = useState<string | null>(null);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Set<string>>(() => new Set());
  const [resolvedPlanIds, setResolvedPlanIds] = useState<Set<string>>(() => new Set());
  const [resolvedProposalIds, setResolvedProposalIds] = useState<Set<string>>(() => new Set());
  const [dismissedStickyKeys, setDismissedStickyKeys] = useState<Set<string>>(() => new Set());
  const [questionSubmittingId, setQuestionSubmittingId] = useState<string | null>(null);
  const [questionDrafts, setQuestionDrafts] = useState<
    Record<string, { selectedOptionIds: string[]; freeText: string }>
  >({});
  const [queuedMessages, setQueuedMessages] = useState<QueuedAgentMessage[]>([]);
  const [composerSendInFlight, setComposerSendInFlight] = useState(false);
  const drainLockRef = useRef(false);
  const draftUpsertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unlockedSurfaces = useMemo(
    () => composerUnlockedSurfaces(surface, scopeChips),
    [scopeChips, surface],
  );

  const data = useWorkspaceAgentData({
    activeConversationId,
    surface,
    unlockedSurfaces,
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
    composerDraftQueryOptions,
    composerDraftQuery,
    upsertComposerDraftMutation,
    discardComposerDraftMutation,
  } = data;

  const conversationList = conversationsQuery.data?.conversations ?? [];
  const activeConversation = activeConversationQuery.data ?? null;

  const sendContextRef = useRef<OrchTurnSendContext>({});
  const transport = useMemo(() => new OrchTurnStreamTransport(() => sendContextRef.current), []);

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

  const chat = useChat<OrchUIMessage>({
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
  const {
    messages,
    sendMessage: chatSendMessage,
    status,
    stop,
    setMessages,
    error: chatError,
    regenerate,
  } = chat;
  const runtime = useAISDKRuntime(chat);

  const isStreaming = status === "streaming" || status === "submitted";
  const canSend = !isStreaming;

  const invalidateComposerDraftQuery = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: composerDraftQueryOptions.queryKey });
  }, [composerDraftQueryOptions.queryKey, queryClient]);

  const serverDraft = composerDraftQuery.data?.draft ?? null;
  const serverDraftOffer =
    !composerSendInFlight &&
    !isStreaming &&
    serverDraft &&
    shouldOfferComposerDraftRestore({
      liveDraft: draft,
      serverText: serverDraft.text,
      isBusy: composerSendInFlight || isStreaming,
    })
      ? serverDraft
      : null;

  useEffect(() => {
    if (draftUpsertTimerRef.current) {
      clearTimeout(draftUpsertTimerRef.current);
      draftUpsertTimerRef.current = null;
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (isStreaming) return;
    if (draft.trim().length === 0) return;

    if (draftUpsertTimerRef.current) {
      clearTimeout(draftUpsertTimerRef.current);
    }

    draftUpsertTimerRef.current = setTimeout(() => {
      void upsertComposerDraftMutation
        .mutateAsync({
          ...(activeConversationId ? { conversationId: activeConversationId } : {}),
          text: draft,
        })
        .then(() => {
          invalidateComposerDraftQuery();
        })
        .catch(() => {
          // Autosave failures are non-blocking; the user can still send.
        });
    }, COMPOSER_DRAFT_DEBOUNCE_MS);

    return () => {
      if (draftUpsertTimerRef.current) {
        clearTimeout(draftUpsertTimerRef.current);
        draftUpsertTimerRef.current = null;
      }
    };
  }, [
    activeConversationId,
    draft,
    invalidateComposerDraftQuery,
    isStreaming,
    upsertComposerDraftMutation,
  ]);

  const onRestoreServerDraft = useCallback(() => {
    if (!serverDraft) return;
    setDraft(serverDraft.text);
  }, [serverDraft, setDraft]);

  const onDiscardServerDraft = useCallback(async () => {
    try {
      await discardComposerDraftMutation.mutateAsync({
        ...(activeConversationId ? { conversationId: activeConversationId } : {}),
      });
      invalidateComposerDraftQuery();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to discard draft."));
    }
  }, [activeConversationId, discardComposerDraftMutation, invalidateComposerDraftQuery]);
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
    if (activeConversation?.toolPreset) {
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
    const next = dashboardMessagesToUIMessages(activeConversation.messages);
    // Stale get-query (user-only) must not wipe a richer just-streamed thread.
    if (next.length < messages.length) return;
    const persistedResolvedPlans = collectResolvedPlanIdsFromMessages(activeConversation.messages);
    setAnsweredQuestionIds(collectAnsweredQuestionIds(activeConversation.messages));
    setResolvedPlanIds((prev) => new Set([...prev, ...persistedResolvedPlans]));
    setMessages(next);
  }, [
    activeConversation?.id,
    activeConversation?.messages,
    activeConversationId,
    isStreaming,
    messages.length,
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
      setFocusedArtifactId(null);
      setCanvasOpen(false);
      setAnsweredQuestionIds(new Set());
      setResolvedPlanIds(new Set());
      setResolvedProposalIds(new Set());
      setDismissedStickyKeys(new Set());
      setQuestionSubmittingId(null);
      setQuestionDrafts({});
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

  const retryLastTurn = useCallback(() => {
    setError(null);
    void regenerate();
  }, [regenerate]);

  const sendMessage = useCallback(
    async (
      input: {
        text: string;
        attachments?: AgentTextAttachment[];
        toolPreset?: DashboardAgentToolPreset;
      } = { text: draft },
    ) => {
      const content = input.text.trim();
      const attachments = input.attachments ?? [];
      const model = modelPresetState.outboundModelId?.trim();
      const action = nextSendAction({
        isStreaming,
        queueLength: queuedMessages.length,
        text: content,
        attachmentsLength: attachments.length,
      });
      if (action === "ignore") return false;
      if (action === "queue") {
        setQueuedMessages((current) => enqueueAgentMessage(current, { text: content }));
        setDraft("");
        return true;
      }
      if (surface === "agency" && !teamId) {
        setError("Select an Agency team before asking about time.");
        return false;
      }

      const toolPreset = input.toolPreset ?? selectedToolPreset;
      if (input.toolPreset && input.toolPreset !== selectedToolPreset) {
        setSelectedToolPreset(input.toolPreset);
      }

      const orchBody = {
        ...buildOrchTurnSendContext({
          conversationId: activeConversationId,
          surface,
          teamId,
          scopeChips,
          workspaceNodes,
          toolPreset,
          modelPreset: modelPresetState.modelPreset,
          ...(model ? { model } : {}),
        }),
        content,
        attachments,
      };

      setComposerSendInFlight(true);
      setDraft("");
      setError(null);
      setStreamStopped(false);

      try {
        await chatSendMessage(
          { text: content },
          {
            body: orchBody,
          },
        );
        if (action === "send") {
          try {
            await discardComposerDraftMutation.mutateAsync({
              ...(activeConversationId ? { conversationId: activeConversationId } : {}),
            });
            invalidateComposerDraftQuery();
          } catch {
            // Draft discard failure should not block a successful send.
          }
        }
        return true;
      } catch (streamError) {
        setDraft(content);
        setError(getErrorMessage(streamError, "Failed to reach the agent."));
        return false;
      } finally {
        setComposerSendInFlight(false);
      }
    },
    [
      activeConversationId,
      chatSendMessage,
      discardComposerDraftMutation,
      draft,
      invalidateComposerDraftQuery,
      selectedToolPreset,
      isStreaming,
      queuedMessages.length,
      modelPresetState.modelPreset,
      modelPresetState.outboundModelId,
      scopeChips,
      setDraft,
      surface,
      teamId,
      workspaceNodes,
    ],
  );

  useEffect(() => {
    if (isStreaming || drainLockRef.current || queuedMessages.length === 0) return;
    const { next, rest } = dequeueAgentMessage(queuedMessages);
    if (!next) return;
    drainLockRef.current = true;
    setQueuedMessages(rest);
    void sendMessage({ text: next.text }).finally(() => {
      drainLockRef.current = false;
    });
  }, [isStreaming, queuedMessages, sendMessage]);

  const onCancelQueuedMessage = useCallback((id: string) => {
    setQueuedMessages((queue) => cancelQueuedAgentMessage(queue, id));
  }, []);

  const runningQueueLabel = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    const snippet = lastAssistant ? getMessageText(lastAssistant).trim() : "";
    return snippet || "Working…";
  }, [messages]);

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
  const activeArtifact = useMemo(() => {
    if (focusedArtifactId) {
      return artifacts.find((artifact) => artifact.id === focusedArtifactId) ?? null;
    }
    return artifacts.length > dismissedArtifactCount ? (artifacts.at(-1) ?? null) : null;
  }, [artifacts, dismissedArtifactCount, focusedArtifactId]);

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
      const domain = surface === "canvas" ? "canvas" : "agency";
      if (domain === "agency" && !teamId) throw new Error("No active Agency team.");
      return orpcClient.agent.proposals.confirmPlan({
        ...(teamId ? { teamId } : {}),
        domain,
        conversationId: activeConversationId ?? undefined,
        plan: plan as Parameters<typeof orpcClient.agent.proposals.confirmPlan>[0]["plan"],
      });
    },
  });

  const approveProposalMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      return orpcClient.agent.proposals.approve({
        ...(teamId ? { teamId } : {}),
        proposalId,
      });
    },
  });

  const rejectProposalMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      return orpcClient.agent.proposals.reject({
        ...(teamId ? { teamId } : {}),
        proposalId,
      });
    },
  });

  const onConfirmPlan = useCallback(
    async (plan: OrchUIDataParts["orchPlan"]) => {
      setPlanConfirmingId(plan.planId);
      try {
        const result = await confirmPlanMutation.mutateAsync(plan);
        setResolvedPlanIds((prev) => new Set(prev).add(plan.planId));
        setMessages(appendConfirmedProposalsToMessages(messages, result.proposals));
        if (activeConversationId) {
          void queryClient.invalidateQueries({
            queryKey: orpc.agent.conversations.get.queryKey({
              input: { conversationId: activeConversationId },
            }),
          });
        }
        toast.success(
          `Plan confirmed. ${result.proposals.length} proposal${result.proposals.length === 1 ? "" : "s"} ready to Approve.`,
        );
      } catch (confirmError) {
        setError(getErrorMessage(confirmError, "Failed to confirm plan."));
      } finally {
        setPlanConfirmingId(null);
      }
    },
    [activeConversationId, confirmPlanMutation, messages, queryClient, setMessages],
  );

  const onApproveProposal = useCallback(
    async (proposalId: string) => {
      setProposalBusyId(proposalId);
      try {
        const approved = await approveProposalMutation.mutateAsync(proposalId);
        setResolvedProposalIds((prev) => new Set(prev).add(proposalId));
        const snapshot = (
          approved as {
            workspaceSnapshot?: { nodes: WorkspaceNode[]; updatedAt: string | null };
          }
        ).workspaceSnapshot;
        if (snapshot?.nodes) {
          applyBoundWorkspaceSnapshot(snapshot.nodes, snapshot.updatedAt);
        }
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
        setResolvedProposalIds((prev) => new Set(prev).add(proposalId));
        toast.message("Proposal rejected.");
      } catch (rejectError) {
        setError(getErrorMessage(rejectError, "Failed to reject proposal."));
      } finally {
        setProposalBusyId(null);
      }
    },
    [rejectProposalMutation],
  );

  const onDismissStickyDock = useCallback((key: string) => {
    setDismissedStickyKeys((prev) => new Set(prev).add(key));
  }, []);

  const onQuestionSelectedOptionIdsChange = useCallback((questionId: string, ids: string[]) => {
    setQuestionDrafts((prev) => ({
      ...prev,
      [questionId]: {
        selectedOptionIds: ids,
        freeText: prev[questionId]?.freeText ?? "",
      },
    }));
  }, []);

  const onQuestionFreeTextChange = useCallback((questionId: string, value: string) => {
    setQuestionDrafts((prev) => ({
      ...prev,
      [questionId]: {
        selectedOptionIds: prev[questionId]?.selectedOptionIds ?? [],
        freeText: value,
      },
    }));
  }, []);

  const onAnswerQuestion = useCallback(
    async (answer: OrchAgencyQuestionAnswer) => {
      if (answeredQuestionIds.has(answer.questionId) || isStreaming) return;
      const content = formatAgencyQuestionAnswerMessage(answer);

      setQuestionSubmittingId(answer.questionId);
      try {
        const sent = await sendMessage({ text: content });
        if (sent) {
          setAnsweredQuestionIds((prev) => new Set(prev).add(answer.questionId));
        }
      } finally {
        setQuestionSubmittingId(null);
      }
    },
    [answeredQuestionIds, isStreaming, sendMessage],
  );

  const dismissArtifact = useCallback(() => {
    setCanvasOpen(false);
    setFocusedArtifactId(null);
    setDismissedArtifactCount(artifacts.length);
  }, [artifacts.length]);

  const openCanvas = useCallback(() => {
    if (!activeArtifact) return;
    setCanvasOpen(true);
  }, [activeArtifact]);

  const openArtifactCanvas = useCallback((artifact: AiUiArtifact) => {
    setFocusedArtifactId(artifact.id);
    setDismissedArtifactCount(0);
    setCanvasOpen(true);
  }, []);

  const closeCanvas = useCallback(() => {
    setCanvasOpen(false);
  }, []);

  const canvasOverlayActive = canvasOpen && activeArtifact !== null;
  const { closeRef: canvasCloseRef } = useAgentCanvasOverlay(canvasOverlayActive, closeCanvas);

  const placeholder = surface === "agency" ? "Ask about your time" : "Ask about this canvas";

  const agencyTeamIdForTimer = surface === "agency" ? (teamId ?? "") : "";
  const activeTimerQuery = useAgencyActiveTimerQuery(agencyTeamIdForTimer);
  const hasActiveTimer = surface === "agency" && Boolean(activeTimerQuery.data?.timer);

  const quickStarts = useMemo(
    () => buildWorkspaceAgentQuickStarts({ surface, hasActiveTimer }),
    [hasActiveTimer, surface],
  );

  const onSelectQuickStart = useCallback(
    (start: WorkspaceAgentQuickStart) => {
      setExpanded(true);
      void sendMessage({ text: start.prompt, toolPreset: start.toolPreset });
    },
    [sendMessage, setExpanded],
  );
  const onUnlockCrossSurface = useCallback(() => {
    const target = surface === "agency" ? "canvas" : "agency";
    addScopeChip({
      kind: "surface",
      id: target,
      label: target === "canvas" ? "Canvas" : "Agency",
    });
  }, [addScopeChip, surface]);

  const onOpenBoard = useCallback(
    (href: string) => {
      void navigate(href);
    },
    [navigate],
  );

  const emptyHint =
    surface === "agency"
      ? "Ask about your time, waste, or who's tracking."
      : "Ask about this board.";
  const bottomOffsetClass = surface === "agency" ? "bottom-8" : "bottom-4";
  const streamingMessageId =
    isStreaming && messages[messages.length - 1]?.role === "assistant"
      ? (messages[messages.length - 1]?.id ?? null)
      : null;

  const outboundModel = modelPresetState.outboundModelId?.trim();
  sendContextRef.current = buildOrchTurnSendContext({
    conversationId: activeConversationId,
    surface,
    teamId,
    scopeChips,
    workspaceNodes,
    toolPreset: selectedToolPreset,
    modelPreset: modelPresetState.modelPreset,
    ...(outboundModel ? { model: outboundModel } : {}),
  });

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
    runtime,
    messages,
    canSend,
    isPending: isStreaming,
    isStreaming,
    streamStopped,
    streamingMessageId,
    chatStatus: status,
    sendMessage,
    stopGeneration,
    retryLastTurn,
    selectedToolPreset,
    setSelectedToolPreset,
    planModeEnabled: true,
    crossSurfaceUnlockLabel: unlockedSurfaces.includes(surface === "agency" ? "canvas" : "agency")
      ? null
      : surface === "agency"
        ? ("Canvas" as const)
        : ("Agency" as const),
    onUnlockCrossSurface,
    onOpenBoard,
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
    tools: toolsCatalogQuery.data?.tools ?? [],
    toolsLoading:
      toolsCatalogQuery.isLoading ||
      (toolsCatalogQuery.isFetching && !toolsCatalogQuery.data?.tools?.length),
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
      costUsd: conversation.usageSummary?.totals.costUsd ?? 0,
    })),
    activeCostUsd: activeConversation?.usageSummary?.totals.costUsd ?? 0,
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
    openRenameConversation: (conversationId: string) => {
      const conversation = conversationList.find((entry) => entry.id === conversationId);
      setActiveConversationId(conversationId);
      setRenameDraft(conversation?.title ?? "");
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
    openArtifactCanvas,
    closeCanvas,
    dismissArtifact,
    proposalBusyId,
    planConfirmingId,
    answeredQuestionIds,
    resolvedPlanIds,
    resolvedProposalIds,
    dismissedStickyKeys,
    onDismissStickyDock,
    questionSubmittingId,
    questionDrafts,
    onConfirmPlan: (plan: OrchUIDataParts["orchPlan"]) => void onConfirmPlan(plan),
    onApproveProposal: (proposalId: string) => void onApproveProposal(proposalId),
    onRejectProposal: (proposalId: string) => void onRejectProposal(proposalId),
    onAnswerQuestion: (answer: OrchAgencyQuestionAnswer) => void onAnswerQuestion(answer),
    onQuestionSelectedOptionIdsChange,
    onQuestionFreeTextChange,
    quickStarts,
    onSelectQuickStart,
    emptyHint,
    queuedMessages,
    runningQueueLabel,
    onCancelQueuedMessage,
    serverDraftOffer,
    onRestoreServerDraft,
    onDiscardServerDraft,
  };
}

export type WorkspaceAgentViewModel = ReturnType<typeof useWorkspaceAgent>;
export type WorkspaceAgentScopeChip = AgentScopeRef;
