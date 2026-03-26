<script setup lang="ts">
import type { WorkspaceNode } from "@brainiac/workspace";
import { nextTick, toRef, useTemplateRef, watch } from "vue";

const props = defineProps<{
  nodes: WorkspaceNode[];
}>();

const chatViewport = useTemplateRef<HTMLDivElement>("chatViewport");
const {
  addMentionedNode,
  activeMention,
  canSend,
  draft,
  error,
  isPending,
  mentionSuggestions,
  messages,
  promptSuggestions,
  removeMentionedNode,
  resetChat,
  selectedNodes,
  sendMessage,
} = useDashboardAgentChat(toRef(props, "nodes"));

async function scrollToBottom() {
  await nextTick();
  const element = chatViewport.value;

  if (!element) {
    return;
  }

  element.scrollTop = element.scrollHeight;
}

function handleSubmit() {
  if (activeMention.value && mentionSuggestions.value.length > 0) {
    const firstSuggestion = mentionSuggestions.value[0];

    if (firstSuggestion) {
      addMentionedNode(firstSuggestion);
    }
  }

  void sendMessage();
}

function handlePromptClick(prompt: string) {
  void sendMessage(prompt);
}

function handleMentionClick(node: WorkspaceNode) {
  addMentionedNode(node);
}

function handleEnterKeydown(event: KeyboardEvent) {
  event.preventDefault();
  handleSubmit();
}

watch(
  () => [messages.value.length, isPending.value],
  () => {
    void scrollToBottom();
  },
);
</script>

<template>
  <section
    class="flex min-h-[420px] flex-col overflow-hidden rounded-[28px] border border-muted/60 bg-default shadow-lg shadow-black/5"
  >
    <div class="border-b border-muted/60 bg-elevated/50 px-5 py-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
            Agent Chat
          </p>
          <h2 class="mt-2 text-lg font-semibold tracking-tight text-highlighted">
            Workspace-aware copilot
          </h2>
          <p class="mt-1 text-sm text-muted">
            Ask about priorities, gaps, node structure, or what the dashboard is signaling.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <UBadge color="neutral" variant="subtle"> {{ nodes.length }} nodes </UBadge>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-rotate-ccw"
            :disabled="messages.length === 0 && !draft"
            @click="resetChat"
          >
            Reset
          </UButton>
        </div>
      </div>
    </div>

    <div
      ref="chatViewport"
      class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-elevated/20 px-4 py-4"
    >
      <template v-if="messages.length === 0">
        <div class="rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-4">
          <p class="text-sm font-medium text-highlighted">Start with a concrete question.</p>
          <p class="mt-1 text-sm text-muted">
            The agent can inspect live dashboard nodes, search them, and pull node details before
            answering.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="prompt in promptSuggestions"
            :key="prompt"
            color="neutral"
            variant="soft"
            size="sm"
            class="rounded-full"
            @click="handlePromptClick(prompt)"
          >
            {{ prompt }}
          </UButton>
        </div>
      </template>

      <article
        v-for="message in messages"
        :key="message.id"
        class="flex"
        :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[92%] rounded-[24px] border px-4 py-3 text-sm shadow-sm"
          :class="
            message.role === 'user'
              ? 'border-primary/30 bg-primary/10 text-highlighted'
              : 'border-muted/70 bg-default text-toned'
          "
        >
          <p class="whitespace-pre-wrap leading-6">
            {{ message.content }}
          </p>

          <p
            v-if="message.role === 'user' && message.contextNodeTitles?.length"
            class="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] opacity-70"
          >
            Context · {{ message.contextNodeTitles.join(", ") }}
          </p>

          <p
            v-if="message.role === 'assistant' && (message.model || message.toolsCalled?.length)"
            class="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] opacity-70"
          >
            {{ message.model }}
            <template v-if="message.toolsCalled?.length">
              · {{ message.toolsCalled.join(", ") }}
            </template>
          </p>
        </div>
      </article>

      <article v-if="isPending" class="flex justify-start">
        <div
          class="flex items-center gap-2 rounded-[24px] border border-muted/70 bg-default px-4 py-3 text-sm text-muted shadow-sm"
        >
          <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
          Reading the dashboard
        </div>
      </article>
    </div>

    <div class="border-t border-muted/60 bg-default px-4 py-4">
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        title="Agent request failed"
        :description="error"
        class="mb-3"
      />

      <UTextarea
        v-model="draft"
        :rows="4"
        autoresize
        placeholder="Ask the agent about this dashboard. Type @ to narrow the turn to a node."
        @keydown.enter.exact="handleEnterKeydown"
      />

      <div v-if="selectedNodes.length > 0" class="mt-3 flex flex-wrap items-center gap-2">
        <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted">Context</p>

        <button
          v-for="node in selectedNodes"
          :key="node.id"
          type="button"
          class="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-xs font-medium text-highlighted transition hover:border-primary/40 hover:bg-primary/12"
          @click="removeMentionedNode(node.id)"
        >
          <span>{{ node.title }}</span>
          <UIcon name="i-lucide-x" class="size-3" />
        </button>
      </div>

      <div v-if="activeMention" class="mt-3 rounded-2xl border border-muted/70 bg-elevated/40 p-2">
        <div v-if="mentionSuggestions.length > 0" class="flex flex-col gap-1">
          <button
            v-for="node in mentionSuggestions"
            :key="node.id"
            type="button"
            class="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm text-toned transition hover:bg-default"
            @click="handleMentionClick(node)"
          >
            <span class="min-w-0 truncate font-medium text-highlighted">
              {{ node.title }}
            </span>
            <span class="truncate text-xs text-muted">
              {{ node.label || node.id }}
            </span>
          </button>
        </div>

        <p v-else class="px-3 py-2 text-sm text-muted">
          No nodes match
          <span class="font-medium text-highlighted">{{ `@${activeMention.query}` }}</span
          >.
        </p>
      </div>

      <div class="mt-3 flex items-center justify-between gap-3">
        <p class="text-xs text-muted">
          Press Enter to send. Use Shift+Enter for a new line. Type @ to scope the turn.
        </p>

        <UButton
          color="primary"
          icon="i-lucide-send"
          :loading="isPending"
          :disabled="!canSend"
          @click="handleSubmit"
        >
          Send
        </UButton>
      </div>
    </div>
  </section>
</template>
