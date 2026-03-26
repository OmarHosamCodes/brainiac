import type { WorkspaceNode } from "@brainiac/workspace";
import { useMutation } from "@tanstack/vue-query";
import { computed, ref, watch, type Ref } from "vue";

import {
  getActiveDashboardNodeMention,
  getDashboardNodeMentionSuggestions,
  stripActiveDashboardNodeMention,
} from "~/utils/dashboard-agent-mentions";
import { getErrorMessage } from "~/utils/get-error-message";

type DashboardAgentRole = "user" | "assistant";

type DashboardAgentMessage = {
  id: string;
  role: DashboardAgentRole;
  content: string;
  requestContent?: string;
  contextNodeTitles?: string[];
  model?: string;
  toolsCalled?: string[];
};

const MAX_REQUEST_MESSAGES = 20;

export function useDashboardAgentChat(nodes: Ref<WorkspaceNode[]>) {
  const orpc = useOrpc();
  const draft = ref("");
  const error = ref<string | null>(null);
  const messages = ref<DashboardAgentMessage[]>([]);
  const selectedNodeIds = ref<string[]>([]);
  const chatMutation = useMutation(orpc.agent.chat.mutationOptions());
  const activeMention = computed(() => getActiveDashboardNodeMention(draft.value));
  const selectedNodeIdSet = computed(() => new Set(selectedNodeIds.value));
  const selectedNodes = computed(() =>
    nodes.value.filter((node) => selectedNodeIdSet.value.has(node.id)),
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

  watch(
    nodes,
    (nextNodes) => {
      const availableNodeIds = new Set(nextNodes.map((node) => node.id));
      selectedNodeIds.value = selectedNodeIds.value.filter((id) => availableNodeIds.has(id));
    },
    { deep: true },
  );

  function buildRequestMessages() {
    return messages.value.slice(-MAX_REQUEST_MESSAGES).map((message) => ({
      role: message.role,
      content: message.requestContent ?? message.content,
    }));
  }

  function pushUserMessage(payload: {
    content: string;
    requestContent?: string;
    contextNodeTitles?: string[];
  }) {
    messages.value = [
      ...messages.value,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: payload.content,
        requestContent: payload.requestContent,
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

    if (!content || chatMutation.isPending.value) {
      return;
    }

    const contextNodeTitles = selectedNodes.value.map((node) => node.title);
    const scopedNodes = selectedNodes.value.length > 0 ? selectedNodes.value : nodes.value;
    const requestContent =
      contextNodeTitles.length > 0
        ? `${content}\n\nFocus this turn only on these nodes: ${contextNodeTitles
            .map((title) => `"${title}"`)
            .join(", ")}.`
        : content;

    error.value = null;
    draft.value = "";
    selectedNodeIds.value = [];
    pushUserMessage({
      content,
      requestContent,
      contextNodeTitles,
    });

    try {
      const result = await chatMutation.mutateAsync({
        messages: buildRequestMessages(),
        nodes: scopedNodes,
      });

      pushAssistantMessage(result);
    } catch (mutationError) {
      error.value = getErrorMessage(mutationError, "Failed to reach the dashboard agent.");
    }
  }

  function resetChat() {
    draft.value = "";
    error.value = null;
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

  return {
    addMentionedNode,
    activeMention,
    canSend,
    draft,
    error,
    isPending: chatMutation.isPending,
    mentionSuggestions,
    messages,
    promptSuggestions,
    removeMentionedNode,
    resetChat,
    selectedNodes,
    sendMessage,
  };
}
