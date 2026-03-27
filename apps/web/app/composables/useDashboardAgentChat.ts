import type {
  DashboardAgentToolPreset,
  DashboardConversationDetail,
  DashboardConversationMessage,
  DashboardConversationSummary,
} from "@brainiac/agent";
import type { WorkspaceNode } from "@brainiac/workspace";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, ref, watch, type Ref } from "vue";

import {
  getActiveDashboardNodeMention,
  getDashboardNodeMentionSuggestions,
  stripActiveDashboardNodeMention,
} from "~/utils/dashboard-agent-mentions";
import { getErrorDebugDetails } from "~/utils/get-error-debug-details";
import { getErrorMessage } from "~/utils/get-error-message";

const MODEL_CATALOG_STALE_TIME_MS = 10 * 60 * 1000;
const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});
const contextLengthFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatContextLength(contextLength: number | null) {
  if (!contextLength) {
    return "Context unknown";
  }

  return `${contextLengthFormatter.format(contextLength)} ctx`;
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const elapsedSeconds = Math.round((timestamp - Date.now()) / 1000);
  const minutes = Math.round(elapsedSeconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (Math.abs(elapsedSeconds) < 60) {
    return relativeTimeFormatter.format(elapsedSeconds, "second");
  }

  if (Math.abs(minutes) < 60) {
    return relativeTimeFormatter.format(minutes, "minute");
  }

  if (Math.abs(hours) < 24) {
    return relativeTimeFormatter.format(hours, "hour");
  }

  return relativeTimeFormatter.format(days, "day");
}

function buildConversationOption(conversation: DashboardConversationSummary) {
  const updatedLabel = formatRelativeTime(conversation.updatedAt);
  const presetLabel = getToolPresetLabel(conversation.toolPreset);
  const preview = conversation.lastMessagePreview ?? "No messages yet";

  return {
    id: conversation.id,
    label: conversation.title,
    preview,
    meta: [presetLabel, updatedLabel].filter(Boolean).join(" · "),
  };
}

function getToolPresetLabel(preset: DashboardAgentToolPreset) {
  switch (preset) {
    case "direct":
      return "Direct";
    case "workspace-search":
      return "Workspace Search";
    case "deep-inspect":
      return "Deep Inspect";
    case "auto":
    default:
      return "Auto";
  }
}

function upsertConversationSummary(
  list: DashboardConversationSummary[],
  nextConversation: DashboardConversationSummary,
) {
  return [nextConversation, ...list.filter((conversation) => conversation.id !== nextConversation.id)].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

function appendConversationMessages(
  detail: DashboardConversationDetail | undefined,
  conversation: DashboardConversationSummary,
  nextMessages: DashboardConversationMessage[],
) {
  return {
    ...conversation,
    messages: [...(detail?.messages ?? []), ...nextMessages],
  } satisfies DashboardConversationDetail;
}

function toConversationSummary(detail: DashboardConversationDetail): DashboardConversationSummary {
  return {
    id: detail.id,
    title: detail.title,
    model: detail.model,
    toolPreset: detail.toolPreset,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
    lastMessageAt: detail.lastMessageAt,
    lastMessagePreview: detail.lastMessagePreview,
  };
}

export function useDashboardAgentChat(nodes: Ref<WorkspaceNode[]>) {
  const authSession = useAuthSession();
  const orpc = useOrpc();
  const queryClient = useQueryClient();
  const draft = ref("");
  const renameDraft = ref("");
  const error = ref<string | null>(null);
  const errorDebugDetails = ref<string | null>(null);
  const activeConversationId = ref<string | null>(null);
  const selectedNodeIds = ref<string[]>([]);
  const pendingMessages = ref<DashboardConversationMessage[]>([]);
  const isRenameDialogOpen = ref(false);
  const isDeleteDialogOpen = ref(false);
  const conversationDraftModelId = ref<string>();
  const conversationDraftToolPreset = ref<DashboardAgentToolPreset>("auto");
  const authEnabled = computed(() => Boolean(authSession.value?.data?.user));
  const activeMention = computed(() => getActiveDashboardNodeMention(draft.value));
  const selectedNodeIdSet = computed(() => new Set(selectedNodeIds.value));
  const selectedNodes = computed(() =>
    nodes.value.filter((node) => selectedNodeIdSet.value.has(node.id)),
  );

  const conversationsListQueryOptions = orpc.agent.conversations.list.queryOptions();
  const freeModelsQuery = useQuery({
    ...orpc.agent.freeModels.queryOptions(),
    enabled: authEnabled,
    staleTime: MODEL_CATALOG_STALE_TIME_MS,
    gcTime: MODEL_CATALOG_STALE_TIME_MS * 3,
  });
  const conversationsQuery = useQuery({
    ...conversationsListQueryOptions,
    enabled: authEnabled,
  });
  const activeConversationQuery = useQuery(() => ({
    ...orpc.agent.conversations.get.queryOptions({
      input: {
        conversationId: activeConversationId.value ?? "",
      },
    }),
    enabled: Boolean(authSession.value?.data?.user && activeConversationId.value),
  }));

  const chatTurnMutation = useMutation(orpc.agent.chat.turn.mutationOptions());
  const renameConversationMutation = useMutation(orpc.agent.conversations.rename.mutationOptions());
  const deleteConversationMutation = useMutation(orpc.agent.conversations.delete.mutationOptions());

  const mentionSuggestions = computed(() => {
    if (!activeMention.value) {
      return [];
    }

    return getDashboardNodeMentionSuggestions(
      nodes.value,
      activeMention.value.query,
      selectedNodeIdSet.value,
    );
  });

  const modelOptions = computed(() =>
    (freeModelsQuery.data.value?.models ?? []).map((model) => ({
      id: model.id,
      label: model.name,
      description: [
        formatContextLength(model.contextLength),
        model.supportsTools ? "Tools enabled" : "Direct answers",
        model.id,
      ].join(" · "),
    })),
  );
  const toolPresetOptions = computed(() => [
    {
      value: "auto",
      label: "Auto",
      description: "Balanced tool use when the model supports it.",
    },
    {
      value: "direct",
      label: "Direct",
      description: "Skip tools and answer from current context.",
    },
    {
      value: "workspace-search",
      label: "Workspace Search",
      description: "Bias toward listing and searching the workspace first.",
    },
    {
      value: "deep-inspect",
      label: "Deep Inspect",
      description: "Inspect before concluding when tools are available.",
    },
  ] satisfies Array<{
    value: DashboardAgentToolPreset;
    label: string;
    description: string;
  }>);

  const conversationList = computed(() => conversationsQuery.data.value?.conversations ?? []);
  const conversationOptions = computed(() => conversationList.value.map(buildConversationOption));
  const activeConversation = computed(() => activeConversationQuery.data.value ?? null);
  const activeConversationSummary = computed(
    () =>
      conversationList.value.find((conversation) => conversation.id === activeConversationId.value)
      ?? null,
  );
  const messages = computed(() => [
    ...(activeConversation.value?.messages ?? []),
    ...pendingMessages.value,
  ]);
  const promptSuggestions = computed(() => {
    if (nodes.value.length === 0) {
      return [
        "Help me sketch the first few dashboard nodes I should create.",
        "What kinds of nodes would make this workspace useful this week?",
        "How should I structure a dashboard for planning and execution?",
      ];
    }

    const firstNode = nodes.value[0];

    return [
      "Summarize the main themes in this dashboard.",
      "Which nodes look like the highest leverage items right now?",
      firstNode ? `What stands out about "${firstNode.title}"?` : "What should I focus on first?",
    ];
  });
  const canSend = computed(() => draft.value.trim().length > 0 && !chatTurnMutation.isPending.value);
  const composerPlaceholder = computed(() => {
    if (selectedNodes.value.length === 1) {
      return `Ask about “${selectedNodes.value[0]?.title}”. Type @ to add more nodes.`;
    }

    if (selectedNodes.value.length > 1) {
      return `Ask about these ${selectedNodes.value.length} selected nodes. Type @ to refine the scope.`;
    }

    return "Ask the agent about this dashboard. Type @ to narrow the turn to a node.";
  });
  const scopeLabel = computed(() => {
    if (selectedNodes.value.length > 0) {
      return `${selectedNodes.value.length} selected node${
        selectedNodes.value.length === 1 ? "" : "s"
      } in scope`;
    }

    return `All ${nodes.value.length} node${nodes.value.length === 1 ? "" : "s"} in scope`;
  });
  const activeConversationTitle = computed(
    () => activeConversation.value?.title ?? activeConversationSummary.value?.title ?? "New conversation",
  );
  const activeToolPresetLabel = computed(() =>
    getToolPresetLabel(conversationDraftToolPreset.value),
  );
  const selectedModelId = computed({
    get: () => conversationDraftModelId.value,
    set: (value: string | undefined) => {
      conversationDraftModelId.value = value;
    },
  });
  const selectedToolPreset = computed({
    get: () => conversationDraftToolPreset.value,
    set: (value: DashboardAgentToolPreset) => {
      conversationDraftToolPreset.value = value;
    },
  });
  const modelCount = computed(() => modelOptions.value.length);
  const modelHint = computed(() => {
    const selectedModel = modelOptions.value.find((model) => model.id === selectedModelId.value);

    if (selectedModel) {
      return selectedModel.description;
    }

    if (freeModelsQuery.isError.value) {
      return "Using the server default model until the OpenRouter catalog is available.";
    }

    if (freeModelsQuery.isLoading.value) {
      return "Loading the current OpenRouter free-model catalog.";
    }

    return "Choose from the current OpenRouter free-model catalog.";
  });
  const modelError = computed(() =>
    freeModelsQuery.isError.value
      ? getErrorMessage(
          freeModelsQuery.error.value,
          "Unable to load the OpenRouter free-model catalog.",
        )
      : null,
  );
  const modelDebugDetails = computed(() =>
    freeModelsQuery.isError.value ? getErrorDebugDetails(freeModelsQuery.error.value) : null,
  );
  const hasConversations = computed(() => conversationList.value.length > 0);
  const canRenameConversation = computed(() => Boolean(activeConversationId.value));
  const canDeleteConversation = computed(() => Boolean(activeConversationId.value));

  watch(
    nodes,
    (nextNodes) => {
      const availableNodeIds = new Set(nextNodes.map((node) => node.id));
      selectedNodeIds.value = selectedNodeIds.value.filter((id) => availableNodeIds.has(id));
    },
    { deep: true },
  );

  watch(
    () => freeModelsQuery.data.value,
    (payload) => {
      if (!payload) {
        return;
      }

      const availableIds = new Set(payload.models.map((model) => model.id));
      const nextDefaultModel = availableIds.has(payload.defaultModel)
        ? payload.defaultModel
        : payload.models[0]?.id;

      if (!conversationDraftModelId.value || !availableIds.has(conversationDraftModelId.value)) {
        conversationDraftModelId.value = nextDefaultModel;
      }
    },
    { immediate: true },
  );

  watch(
    () => activeConversation.value,
    (conversation) => {
      if (!conversation) {
        return;
      }

      conversationDraftModelId.value = conversation.model ?? conversationDraftModelId.value;
      conversationDraftToolPreset.value = conversation.toolPreset;
    },
    { immediate: true },
  );

  watch(activeConversationId, () => {
    draft.value = "";
    error.value = null;
    errorDebugDetails.value = null;
    pendingMessages.value = [];
    selectedNodeIds.value = [];
  });

  function getConversationDetailQueryKey(conversationId: string) {
    return orpc.agent.conversations.get.queryOptions({
      input: {
        conversationId,
      },
    }).queryKey;
  }

  function startNewConversation() {
    activeConversationId.value = null;
    draft.value = "";
    selectedNodeIds.value = [];
    pendingMessages.value = [];
    error.value = null;
    errorDebugDetails.value = null;
  }

  function openRenameDialog() {
    if (!activeConversationTitle.value || !activeConversationId.value) {
      return;
    }

    renameDraft.value = activeConversationTitle.value;
    isRenameDialogOpen.value = true;
  }

  function openDeleteDialog() {
    if (!activeConversationId.value) {
      return;
    }

    isDeleteDialogOpen.value = true;
  }

  function closeRenameDialog() {
    isRenameDialogOpen.value = false;
  }

  function closeDeleteDialog() {
    isDeleteDialogOpen.value = false;
  }

  async function submitRenameConversation() {
    const conversationId = activeConversationId.value;
    const title = renameDraft.value.trim();

    if (!conversationId || !title || renameConversationMutation.isPending.value) {
      return;
    }

    error.value = null;
    errorDebugDetails.value = null;

    try {
      const updatedConversation = await renameConversationMutation.mutateAsync({
        conversationId,
        title,
      });

      queryClient.setQueryData(getConversationDetailQueryKey(conversationId), updatedConversation);
      queryClient.setQueryData(conversationsListQueryOptions.queryKey, (current: {
        conversations?: DashboardConversationSummary[];
      } | undefined) => ({
        conversations: upsertConversationSummary(
          current?.conversations ?? [],
          toConversationSummary(updatedConversation),
        ),
      }));

      isRenameDialogOpen.value = false;
    } catch (renameError) {
      error.value = getErrorMessage(renameError, "Failed to rename the conversation.");
      errorDebugDetails.value = getErrorDebugDetails(renameError);
    }
  }

  async function confirmDeleteConversation() {
    const conversationId = activeConversationId.value;

    if (!conversationId || deleteConversationMutation.isPending.value) {
      return;
    }

    error.value = null;
    errorDebugDetails.value = null;

    try {
      await deleteConversationMutation.mutateAsync({
        conversationId,
      });

      queryClient.removeQueries({
        queryKey: getConversationDetailQueryKey(conversationId),
      });
      queryClient.setQueryData(conversationsListQueryOptions.queryKey, (current: {
        conversations?: DashboardConversationSummary[];
      } | undefined) => ({
        conversations: (current?.conversations ?? []).filter(
          (conversation) => conversation.id !== conversationId,
        ),
      }));

      isDeleteDialogOpen.value = false;
      startNewConversation();
    } catch (deleteError) {
      error.value = getErrorMessage(deleteError, "Failed to delete the conversation.");
      errorDebugDetails.value = getErrorDebugDetails(deleteError);
    }
  }

  async function sendMessage(initialContent?: string) {
    const content = (initialContent ?? draft.value).trim();
    const model = selectedModelId.value?.trim();

    if (!content || chatTurnMutation.isPending.value) {
      return;
    }

    const optimisticUserMessage: DashboardConversationMessage = {
      id: `pending-${crypto.randomUUID()}`,
      role: "user",
      content,
      contextNodeTitles: selectedNodes.value.map((node) => node.title),
      model: model ?? null,
      toolsCalled: [],
      createdAt: new Date().toISOString(),
    };
    const scopedNodes = selectedNodes.value.length > 0 ? selectedNodes.value : nodes.value;

    error.value = null;
    errorDebugDetails.value = null;
    draft.value = "";
    selectedNodeIds.value = [];
    pendingMessages.value = [optimisticUserMessage];

    try {
      const result = await chatTurnMutation.mutateAsync({
        conversationId: activeConversationId.value ?? undefined,
        content,
        nodes: scopedNodes,
        contextNodeTitles:
          optimisticUserMessage.contextNodeTitles.length > 0
            ? optimisticUserMessage.contextNodeTitles
            : undefined,
        ...(model ? { model } : {}),
        toolPreset: selectedToolPreset.value,
      });

      pendingMessages.value = [];
      activeConversationId.value = result.conversation.id;
      conversationDraftModelId.value = result.conversation.model ?? conversationDraftModelId.value;
      conversationDraftToolPreset.value = result.conversation.toolPreset;

      queryClient.setQueryData(conversationsListQueryOptions.queryKey, (current: {
        conversations?: DashboardConversationSummary[];
      } | undefined) => ({
        conversations: upsertConversationSummary(current?.conversations ?? [], result.conversation),
      }));
      queryClient.setQueryData(
        getConversationDetailQueryKey(result.conversation.id),
        (current: DashboardConversationDetail | undefined) =>
          appendConversationMessages(current, result.conversation, [
            result.userMessage,
            result.assistantMessage,
          ]),
      );
    } catch (mutationError) {
      pendingMessages.value = [];
      draft.value = content;
      error.value = getErrorMessage(mutationError, "Failed to reach the dashboard agent.");
      errorDebugDetails.value = getErrorDebugDetails(mutationError);
    }
  }

  function addMentionedNode(node: WorkspaceNode) {
    if (selectedNodeIdSet.value.has(node.id)) {
      draft.value = stripActiveDashboardNodeMention(draft.value);
      return;
    }

    selectedNodeIds.value = [...selectedNodeIds.value, node.id];
    draft.value = stripActiveDashboardNodeMention(draft.value);
    error.value = null;
  }

  function removeMentionedNode(nodeId: string) {
    selectedNodeIds.value = selectedNodeIds.value.filter((id) => id !== nodeId);
  }

  function clearMentionedNodes() {
    selectedNodeIds.value = [];
  }

  return {
    activeConversation,
    activeConversationId,
    activeConversationTitle,
    activeMention,
    activeToolPresetLabel,
    addMentionedNode,
    canDeleteConversation,
    canRenameConversation,
    canSend,
    clearMentionedNodes,
    closeDeleteDialog,
    closeRenameDialog,
    composerPlaceholder,
    confirmDeleteConversation,
    conversationList,
    conversationOptions,
    deleteDialogOpen: isDeleteDialogOpen,
    draft,
    error,
    errorDebugDetails,
    hasConversations,
    isDeleteDialogOpen,
    isDeletingConversation: deleteConversationMutation.isPending,
    isLoadingConversation: activeConversationQuery.isLoading,
    isLoadingModels: freeModelsQuery.isLoading,
    isPending: chatTurnMutation.isPending,
    isRenameDialogOpen,
    isRenamingConversation: renameConversationMutation.isPending,
    mentionSuggestions,
    messages,
    modelCount,
    modelDebugDetails,
    modelError,
    modelHint,
    modelOptions,
    openDeleteDialog,
    openRenameDialog,
    promptSuggestions,
    removeMentionedNode,
    renameDraft,
    scopeLabel,
    selectedModelId,
    selectedNodes,
    selectedToolPreset,
    sendMessage,
    startNewConversation,
    submitRenameConversation,
    toolPresetOptions,
  };
}
