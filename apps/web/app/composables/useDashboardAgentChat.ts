import type { WorkspaceNode } from "@brainiac/workspace";
import { useMutation } from "@tanstack/vue-query";
import { computed, ref, type Ref } from "vue";

import { getErrorMessage } from "~/utils/get-error-message";

type DashboardAgentRole = "user" | "assistant";

type DashboardAgentMessage = {
  id: string;
  role: DashboardAgentRole;
  content: string;
  model?: string;
  toolsCalled?: string[];
};

const MAX_REQUEST_MESSAGES = 20;

export function useDashboardAgentChat(nodes: Ref<WorkspaceNode[]>) {
  const orpc = useOrpc();
  const draft = ref("");
  const error = ref<string | null>(null);
  const messages = ref<DashboardAgentMessage[]>([]);
  const chatMutation = useMutation(orpc.agent.chat.mutationOptions());

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

  const canSend = computed(
    () => draft.value.trim().length > 0 && !chatMutation.isPending.value,
  );

  function buildRequestMessages() {
    return messages.value.slice(-MAX_REQUEST_MESSAGES).map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }

  function pushUserMessage(content: string) {
    messages.value = [
      ...messages.value,
      {
        id: crypto.randomUUID(),
        role: "user",
        content,
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

    error.value = null;
    draft.value = "";
    pushUserMessage(content);

    try {
      const result = await chatMutation.mutateAsync({
        messages: buildRequestMessages(),
        nodes: nodes.value,
      });

      pushAssistantMessage(result);
    } catch (mutationError) {
      error.value = getErrorMessage(
        mutationError,
        "Failed to reach the dashboard agent.",
      );
    }
  }

  function resetChat() {
    draft.value = "";
    error.value = null;
    messages.value = [];
  }

  return {
    canSend,
    draft,
    error,
    isPending: chatMutation.isPending,
    messages,
    promptSuggestions,
    resetChat,
    sendMessage,
  };
}
