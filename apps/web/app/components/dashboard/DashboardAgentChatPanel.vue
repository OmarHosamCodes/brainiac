<script setup lang="ts">
import type { WorkspaceNode } from "@brainiac/workspace";
import { nextTick, toRef, useTemplateRef, watch } from "vue";

const props = defineProps<{
  nodes: WorkspaceNode[];
}>();

const chatViewport = useTemplateRef<HTMLDivElement>("chatViewport");
const {
  canSend,
  draft,
  error,
  isPending,
  messages,
  promptSuggestions,
  resetChat,
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
  void sendMessage();
}

function handlePromptClick(prompt: string) {
  void sendMessage(prompt);
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
    class="flex min-h-[420px] flex-col overflow-hidden rounded-[28px] border border-muted/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,248,250,0.92))] shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)]"
  >
    <div class="border-b border-muted/60 px-5 py-4">
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
          <UBadge color="neutral" variant="subtle">
            {{ nodes.length }} nodes
          </UBadge>
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
      class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
    >
      <template v-if="messages.length === 0">
        <div class="rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-4">
          <p class="text-sm font-medium text-highlighted">
            Start with a concrete question.
          </p>
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
          class="max-w-[92%] rounded-[24px] px-4 py-3 text-sm shadow-sm"
          :class="
            message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'border border-muted/70 bg-default text-toned'
          "
        >
          <p class="whitespace-pre-wrap leading-6">
            {{ message.content }}
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
        <div class="flex items-center gap-2 rounded-[24px] border border-muted/70 bg-default px-4 py-3 text-sm text-muted shadow-sm">
          <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
          Reading the dashboard
        </div>
      </article>
    </div>

    <div class="border-t border-muted/60 px-4 py-4">
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
        placeholder="Ask the agent about this dashboard"
        @keydown.enter.exact.prevent="handleSubmit"
      />

      <div class="mt-3 flex items-center justify-between gap-3">
        <p class="text-xs text-muted">
          Press Enter to send. Use Shift+Enter for a new line.
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
