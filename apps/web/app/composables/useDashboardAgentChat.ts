import type { WorkspaceNode } from "@brainiac/workspace";
import { useMutation, useQuery } from "@tanstack/vue-query";
import { computed, ref, watch, type Ref } from "vue";

import {
  getActiveDashboardNodeMention,
  getDashboardNodeMentionSuggestions,
  stripActiveDashboardNodeMention,
} from "~/utils/dashboard-agent-mentions";
import { getErrorDebugDetails } from "~/utils/get-error-debug-details";
import { getErrorMessage } from "~/utils/get-error-message";

type DashboardAgentRole = "user" | "assistant";

type DashboardAgentMessage = {
  id: string;
  role: DashboardAgentRole;
  content: string;
  contextNodeTitles?: string[];
  model?: string;
  toolsCalled?: string[];
};

const MAX_REQUEST_MESSAGES = 20;
const MODEL_CATALOG_STALE_TIME_MS = 10 * 60 * 1000;
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

export function useDashboardAgentChat(nodes: Ref<WorkspaceNode[]>) {
  const authSession = useAuthSession();
  const orpc = useOrpc();
  const draft = ref("");
  const error = ref<string | null>(null);
  const errorDebugDetails = ref<string | null>(null);
  const messages = ref<DashboardAgentMessage[]>([]);
  const selectedNodeIds = ref<string[]>([]);
  const chatMutation = useMutation(orpc.agent.chat.mutationOptions());
  const freeModelsQuery = useQuery({
    ...orpc.agent.freeModels.queryOptions(),
    enabled: computed(() => Boolean(authSession.value?.data?.user)),
    staleTime: MODEL_CATALOG_STALE_TIME_MS,
    gcTime: MODEL_CATALOG_STALE_TIME_MS * 3,
  });
  const selectedModelId = ref<string>();
  const activeMention = computed(() => getActiveDashboardNodeMention(draft.value));
  const selectedNodeIdSet = computed(() => new Set(selectedNodeIds.value));
  const selectedNodes = computed(() =>
    nodes.value.filter((node) => selectedNodeIdSet.value.has(node.id)),
  );
  const modelOptions = computed(() =>
    (freeModelsQuery.data.value?.models ?? []).map((model) => ({
      id: model.id,
      label: model.name,
      description: [
        formatContextLength(model.contextLength),
        model.supportsTools ? "Tools enabled" : "Direct answers",
        model.id,
      ].join(" · "),
      provider: model.provider,
      supportsTools: model.supportsTools,
      contextLength: model.contextLength,
    })),
  );
  const selectedModel = computed(() =>
    modelOptions.value.find((model) => model.id === selectedModelId.value) ?? null,
  );
  const modelCount = computed(() => modelOptions.value.length);
  const modelHint = computed(() => {
    if (selectedModel.value) {
      return selectedModel.value.description;
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

  const canSend = computed(() => draft.value.trim().length > 0 && !chatMutation.isPending.value);
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

      if (!selectedModelId.value || !availableIds.has(selectedModelId.value)) {
        selectedModelId.value = nextDefaultModel;
      }
    },
    { immediate: true },
  );

  function buildRequestMessages() {
    return messages.value.slice(-MAX_REQUEST_MESSAGES).map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }

  function pushUserMessage(payload: { content: string; contextNodeTitles?: string[] }) {
    messages.value = [
      ...messages.value,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: payload.content,
        contextNodeTitles: payload.contextNodeTitles,
      },
    ];
  }

  function pushAssistantMessage(payload: {
    response: string;
    model: string;
    toolsCalled: string[];
  }) {
    messages.value = [
      ...messages.value,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: payload.response,
        model: payload.model,
        toolsCalled: payload.toolsCalled,
      },
    ];
  }

  async function sendMessage(initialContent?: string) {
    const content = (initialContent ?? draft.value).trim();
    const model = selectedModelId.value?.trim();

    if (!content || chatMutation.isPending.value) {
      return;
    }

    const contextNodeTitles = selectedNodes.value.map((node) => node.title);
    const scopedNodes = selectedNodes.value.length > 0 ? selectedNodes.value : nodes.value;

    error.value = null;
    errorDebugDetails.value = null;
    draft.value = "";
    selectedNodeIds.value = [];
    pushUserMessage({
      content,
      contextNodeTitles,
    });

    try {
      const result = await chatMutation.mutateAsync({
        messages: buildRequestMessages(),
        nodes: scopedNodes,
        ...(model ? { model } : {}),
      });

      pushAssistantMessage(result);
    } catch (mutationError) {
      error.value = getErrorMessage(mutationError, "Failed to reach the dashboard agent.");
      errorDebugDetails.value = getErrorDebugDetails(mutationError);
    }
  }

  function resetChat() {
    draft.value = "";
    error.value = null;
    errorDebugDetails.value = null;
    messages.value = [];
    selectedNodeIds.value = [];
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
    addMentionedNode,
    activeMention,
    canSend,
    clearMentionedNodes,
    composerPlaceholder,
    draft,
    error,
    errorDebugDetails,
    isLoadingModels: freeModelsQuery.isLoading,
    isPending: chatMutation.isPending,
    mentionSuggestions,
    messages,
    modelCount,
    modelDebugDetails,
    modelError,
    modelHint,
    modelOptions,
    promptSuggestions,
    removeMentionedNode,
    resetChat,
    scopeLabel,
    selectedModel,
    selectedModelId,
    selectedNodes,
    sendMessage,
  };
}
