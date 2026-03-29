<script setup lang="ts">
import type { WorkspaceNode } from "@brainiac/workspace";
import { computed, nextTick, ref, toRef, useTemplateRef, watch } from "vue";
import { renderSimpleMarkdown } from "~/utils/render-simple-markdown";

const props = defineProps<{
  nodes: WorkspaceNode[];
}>();

defineEmits(["close"]);

const chatViewport = useTemplateRef<HTMLDivElement>("chatViewport");
const activePane = ref<"chat" | "history">("chat");
const isModelLibraryOpen = ref(false);
const {
  activeConversationId,
  activeConversationTitle,
  activeMention,
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
  currentDefaultModelId,
  cycleToolPreset,
  draft,
  error,
  favoriteModelOptions,
  hasConversations,
  isDeleteDialogOpen,
  isDeletingConversation,
  isFavoriteModel,
  isLoadingConversation,
  isLoadingModels,
  isPending,
  isRenameDialogOpen,
  isRenamingConversation,
  mentionSuggestions,
  messages,
  modelCount,
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
  selectedModelOption,
  selectedNodes,
  selectedToolPresetOption,
  sendMessage,
  setPreferredDefaultModel,
  startNewConversation,
  submitRenameConversation,
  toggleFavoriteModel,
  topModelOptions,
} = useDashboardAgentChat(toRef(props, "nodes"));

const activeConversationMeta = computed(
  () =>
    conversationOptions.value.find((conversation) => conversation.id === activeConversationId.value)
      ?.meta ?? scopeLabel.value,
);
const visibleHistory = computed(() => conversationOptions.value);
const emptyMentionResults = computed(
  () => activeMention.value && mentionSuggestions.value.length === 0,
);

async function scrollToBottom() {
  await nextTick();
  const element = chatViewport.value;

  if (!element || activePane.value !== "chat") {
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

    return;
  }

  void sendMessage();
}

function handlePromptClick(prompt: string) {
  activePane.value = "chat";
  void sendMessage(prompt);
}

function handleEnterKeydown(event: KeyboardEvent) {
  if (event.shiftKey) {
    return;
  }

  event.preventDefault();
  handleSubmit();
}

function handleMentionPick(node: WorkspaceNode) {
  addMentionedNode(node);
}

function handleSelectConversation(conversationId: string) {
  activeConversationId.value = conversationId;
  activePane.value = "chat";
}

function handleStartNewConversation() {
  startNewConversation();
  activePane.value = "chat";
}

function toggleHistoryPane() {
  activePane.value = activePane.value === "history" ? "chat" : "history";
}

function toggleModelLibrary() {
  isModelLibraryOpen.value = true;
}

function selectModel(modelId: string) {
  selectedModelId.value = modelId;
}

watch(
  () => [messages.value.length, isPending.value, isLoadingConversation.value, activePane.value],
  () => {
    void scrollToBottom();
  },
);

function renderAssistantMessage(content: string) {
  return renderSimpleMarkdown(content);
}
</script>

<template>
  <section
    class="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-neutral-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,246,245,0.96))] shadow-[0_28px_80px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.04] backdrop-blur-2xl dark:border-neutral-800/60 dark:bg-[linear-gradient(180deg,rgba(10,10,10,0.98),rgba(20,20,20,0.96))] dark:ring-white/[0.04]"
  >
    <header class="border-b border-neutral-200/50 px-5 py-5 dark:border-neutral-800/50">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-lg shadow-black/10 dark:bg-white dark:text-neutral-900"
            >
              <UIcon name="i-lucide-sparkles" class="size-4" />
            </div>

            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-neutral-400">
                Dashboard agent
              </p>
              <h2 class="truncate text-base font-semibold text-neutral-950 dark:text-neutral-50">
                {{ activePane === "history" ? "Conversation history" : activeConversationTitle }}
              </h2>
              <p class="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {{
                  activePane === "history"
                    ? `${conversationList.length} saved conversation${conversationList.length === 1 ? "" : "s"}`
                    : activeConversationMeta
                }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <UButton
            color="neutral"
            :variant="activePane === 'history' ? 'soft' : 'ghost'"
            size="xs"
            icon="i-lucide-history"
            class="rounded-full"
            @click="toggleHistoryPane"
          />
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-square-pen"
            class="rounded-full"
            @click="handleStartNewConversation"
          />
          <UDropdownMenu
            :items="[
              [
                {
                  label: 'Rename conversation',
                  icon: 'i-lucide-pencil-line',
                  disabled: !canRenameConversation,
                  onSelect: openRenameDialog,
                },
                {
                  label: 'Delete conversation',
                  icon: 'i-lucide-trash-2',
                  disabled: !canDeleteConversation,
                  onSelect: openDeleteDialog,
                },
              ],
            ]"
          >
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-ellipsis"
              class="rounded-full"
              :disabled="!canRenameConversation && !canDeleteConversation"
            />
          </UDropdownMenu>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            class="rounded-full"
            @click="$emit('close')"
          />
        </div>
      </div>
    </header>

    <div v-if="activePane === 'history'" class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div class="border-b border-neutral-200/40 px-5 py-4 dark:border-neutral-800/40">
        <div
          class="rounded-[1.75rem] border border-neutral-200/70 bg-white/80 p-4 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-900/70"
        >
          <p class="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
            Pick up where you left off
          </p>
          <p class="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            History stays inside the panel now, so switching conversations never changes the canvas
            layout.
          </p>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div
          v-if="!hasConversations"
          class="flex h-full flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-neutral-300/80 bg-white/60 px-6 py-10 text-center dark:border-neutral-700/80 dark:bg-neutral-900/50"
        >
          <div
            class="flex size-12 items-center justify-center rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
          >
            <UIcon name="i-lucide-message-square-dashed" class="size-5" />
          </div>
          <p class="mt-4 text-sm font-semibold text-neutral-950 dark:text-neutral-50">
            No saved conversations yet
          </p>
          <p
            class="mt-1 max-w-[22rem] text-xs leading-relaxed text-neutral-500 dark:text-neutral-400"
          >
            Start a new thread from this panel and it will appear here automatically.
          </p>
          <UButton
            color="neutral"
            variant="soft"
            class="mt-4 rounded-full"
            icon="i-lucide-square-pen"
            @click="handleStartNewConversation"
          >
            Start new conversation
          </UButton>
        </div>

        <div v-else class="space-y-3">
          <button
            v-for="conversation in visibleHistory"
            :key="conversation.id"
            type="button"
            class="w-full rounded-[1.5rem] border px-4 py-4 text-left transition-all duration-200"
            :class="
              conversation.id === activeConversationId
                ? 'border-neutral-900 bg-neutral-900 text-white shadow-lg shadow-black/10 dark:border-white dark:bg-white dark:text-neutral-900'
                : 'border-neutral-200/80 bg-white/85 hover:border-neutral-300 hover:bg-white dark:border-neutral-800/80 dark:bg-neutral-900/80 dark:hover:border-neutral-700 dark:hover:bg-neutral-900'
            "
            @click="handleSelectConversation(conversation.id)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold">
                  {{ conversation.label }}
                </p>
                <p
                  class="mt-1 line-clamp-2 text-xs leading-relaxed"
                  :class="
                    conversation.id === activeConversationId
                      ? 'text-white/75 dark:text-neutral-600'
                      : 'text-neutral-500 dark:text-neutral-400'
                  "
                >
                  {{ conversation.preview }}
                </p>
              </div>
              <UIcon
                v-if="conversation.id === activeConversationId"
                name="i-lucide-check"
                class="mt-0.5 size-4 shrink-0"
              />
            </div>
            <p
              class="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em]"
              :class="
                conversation.id === activeConversationId
                  ? 'text-white/60 dark:text-neutral-500'
                  : 'text-neutral-400'
              "
            >
              {{ conversation.meta }}
            </p>
          </button>
        </div>
      </div>
    </div>

    <template v-else>
      <div
        ref="chatViewport"
        class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 scroll-smooth"
      >
        <template v-if="messages.length === 0 && !isLoadingConversation">
          <div class="space-y-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">
              Suggested starts
            </p>
            <div class="grid gap-2">
              <button
                v-for="prompt in promptSuggestions"
                :key="prompt"
                type="button"
                class="rounded-[1.5rem] border border-neutral-200/80 bg-white/85 px-4 py-3 text-left text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-white dark:border-neutral-800/80 dark:bg-neutral-900/80 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
                @click="handlePromptClick(prompt)"
              >
                {{ prompt }}
              </button>
            </div>
          </div>
        </template>

        <div
          v-for="message in messages"
          :key="message.id"
          class="flex flex-col gap-2"
          :class="message.role === 'user' ? 'items-end' : 'items-start'"
        >
          <div
            class="max-w-[88%] px-5 py-4 text-sm leading-relaxed"
            :class="[
              message.role === 'user'
                ? 'rounded-[1.6rem] rounded-br-md bg-neutral-900 text-neutral-100 shadow-lg shadow-black/10 dark:bg-white dark:text-neutral-900'
                : 'rounded-[1.6rem] rounded-bl-md border border-neutral-200/70 bg-white/90 text-neutral-800 shadow-lg shadow-black/5 dark:border-neutral-800/70 dark:bg-neutral-900/90 dark:text-neutral-200',
            ]"
          >
            <p v-if="message.role === 'user'" class="whitespace-pre-wrap">
              {{ message.content }}
            </p>
            <div
              v-else
              class="prose prose-sm max-w-none text-inherit prose-headings:text-inherit prose-p:text-inherit prose-strong:text-inherit dark:prose-invert"
              v-html="renderAssistantMessage(message.content)"
            />
          </div>

          <div v-if="message.contextNodeTitles?.length" class="flex flex-wrap gap-2 px-1">
            <span
              v-for="title in message.contextNodeTitles"
              :key="title"
              class="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
            >
              {{ title }}
            </span>
          </div>

          <div
            v-if="message.role === 'assistant' && (message.model || message.toolsCalled.length > 0)"
            class="flex flex-wrap gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400"
          >
            <span v-if="message.model">{{ message.model }}</span>
            <span v-for="toolName in message.toolsCalled" :key="toolName">
              {{ toolName }}
            </span>
          </div>
        </div>

        <div v-if="isLoadingConversation" class="flex justify-start">
          <div
            class="rounded-full border border-neutral-200/70 bg-white/85 px-4 py-2 text-xs text-neutral-500 dark:border-neutral-800/70 dark:bg-neutral-900/85"
          >
            Loading conversation...
          </div>
        </div>

        <div v-if="isPending" class="flex justify-start">
          <div
            class="flex items-center gap-2 rounded-full border border-neutral-200/70 bg-white/85 px-4 py-2 text-xs text-neutral-500 dark:border-neutral-800/70 dark:bg-neutral-900/85"
          >
            <UIcon name="i-lucide-loader-2" class="size-3 animate-spin text-primary-500" />
            Thinking...
          </div>
        </div>
      </div>

      <div
        class="border-t border-neutral-200/50 bg-[linear-gradient(180deg,rgba(250,250,249,0.72),rgba(244,244,243,0.95))] p-5 dark:border-neutral-800/50 dark:bg-[linear-gradient(180deg,rgba(18,18,18,0.7),rgba(12,12,12,0.96))]"
      >
        <div v-if="selectedNodes.length > 0" class="mb-3 flex flex-wrap items-center gap-2">
          <button
            v-for="node in selectedNodes"
            :key="node.id"
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-neutral-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm transition hover:border-neutral-300 dark:border-neutral-800/80 dark:bg-neutral-900/90 dark:text-neutral-300 dark:hover:border-neutral-700"
            @click="removeMentionedNode(node.id)"
          >
            <span class="truncate max-w-[10rem]">{{ node.title }}</span>
            <UIcon name="i-lucide-x" class="size-3.5" />
          </button>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            class="rounded-full"
            @click="clearMentionedNodes"
          >
            Clear scope
          </UButton>
        </div>

        <div class="relative">
          <div
            v-if="activeMention && mentionSuggestions.length > 0"
            class="absolute bottom-[calc(100%+0.75rem)] left-0 right-0 z-20 rounded-[1.5rem] border border-neutral-200/80 bg-white/95 p-2 shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-neutral-800/80 dark:bg-neutral-950/95"
          >
            <p
              class="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400"
            >
              Mention a node
            </p>
            <button
              v-for="node in mentionSuggestions"
              :key="node.id"
              type="button"
              class="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left transition hover:bg-neutral-100 dark:hover:bg-neutral-900"
              @mousedown.prevent="handleMentionPick(node)"
            >
              <span class="min-w-0">
                <span
                  class="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100"
                >
                  {{ node.title }}
                </span>
                <span class="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {{ node.label || node.id }}
                </span>
              </span>
              <UIcon name="i-lucide-corner-down-left" class="size-4 shrink-0 text-neutral-400" />
            </button>
          </div>

          <div
            v-else-if="emptyMentionResults"
            class="absolute bottom-[calc(100%+0.75rem)] left-0 right-0 z-20 rounded-[1.5rem] border border-neutral-200/80 bg-white/95 px-4 py-3 text-xs text-neutral-500 shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-neutral-800/80 dark:bg-neutral-950/95 dark:text-neutral-400"
          >
            No nodes match that mention.
          </div>

          <UTextarea
            v-model="draft"
            :rows="2"
            autoresize
            :placeholder="composerPlaceholder"
            variant="none"
            class="w-full rounded-[1.75rem] border border-neutral-200/80 bg-white/90 px-5 py-4 pr-14 text-sm shadow-sm transition focus:ring-2 focus:ring-primary-500/15 dark:border-neutral-800/80 dark:bg-neutral-900/90"
            @keydown.enter.exact="handleEnterKeydown"
          />

          <UButton
            size="sm"
            icon="i-lucide-arrow-up"
            color="neutral"
            class="absolute bottom-2.5 right-2.5 flex size-10 items-center justify-center rounded-2xl border border-neutral-200/80 bg-neutral-900 p-0 text-white shadow-lg shadow-black/10 dark:border-neutral-700/80 dark:bg-white dark:text-neutral-900"
            :loading="isPending"
            :disabled="!canSend"
            @click="handleSubmit"
          />
        </div>

        <div class="mt-2 flex items-center justify-between gap-3">
          <p class="min-w-0 truncate text-[11px] text-neutral-500 dark:text-neutral-400">
            {{ selectedModelOption?.description || modelHint }}
          </p>
          <span
            class="shrink-0 rounded-full border border-neutral-200/80 bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 dark:border-neutral-800/80 dark:bg-neutral-900/90 dark:text-neutral-400"
          >
            {{ scopeLabel }}
          </span>
        </div>

        <div class="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex min-w-0 items-center gap-2 rounded-full border border-neutral-200/80 bg-white/90 px-3 py-2 text-left shadow-sm transition hover:border-neutral-300 dark:border-neutral-800/80 dark:bg-neutral-900/90 dark:hover:border-neutral-700"
            :title="selectedToolPresetOption?.description"
            @click="cycleToolPreset"
          >
            <UIcon
              name="i-lucide-sliders-horizontal"
              class="size-3.5 shrink-0 text-neutral-500 dark:text-neutral-400"
            />
            <span class="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
              Mode
            </span>
            <span class="truncate text-xs font-semibold text-neutral-950 dark:text-neutral-50">
              {{ selectedToolPresetOption?.label }}
            </span>
          </button>

          <button
            type="button"
            class="inline-flex min-w-0 flex-1 items-center gap-2 rounded-full border border-neutral-200/80 bg-white/90 px-3 py-2 text-left shadow-sm transition hover:border-neutral-300 dark:border-neutral-800/80 dark:bg-neutral-900/90 dark:hover:border-neutral-700"
            @click="toggleModelLibrary"
          >
            <UIcon
              name="i-lucide-cpu"
              class="size-3.5 shrink-0 text-neutral-500 dark:text-neutral-400"
            />
            <span class="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
              Model
            </span>
            <span
              class="min-w-0 flex-1 truncate text-xs font-semibold text-neutral-950 dark:text-neutral-50"
            >
              {{ selectedModelOption?.label || "Default model" }}
            </span>
            <span
              class="rounded-full border border-neutral-200/80 bg-neutral-50/90 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 dark:border-neutral-800/80 dark:bg-neutral-800/80 dark:text-neutral-400"
            >
              {{ modelCount }}
            </span>
          </button>
        </div>

        <div v-if="topModelOptions.length > 0" class="mt-2">
          <div
            class="rounded-[1.2rem] border border-neutral-200/80 bg-white/85 p-2 shadow-sm dark:border-neutral-800/80 dark:bg-neutral-900/80"
          >
            <div class="mb-1.5 flex items-center justify-between gap-2 px-1">
              <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                Quick models
              </p>
              <button
                type="button"
                class="rounded-full border border-neutral-200/80 bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 transition hover:border-neutral-300 dark:border-neutral-800/80 dark:bg-neutral-900/90 dark:text-neutral-400 dark:hover:border-neutral-700"
                @click="toggleModelLibrary"
              >
                Browse
              </button>
            </div>

            <div class="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-0.5">
              <div
                v-for="model in topModelOptions"
                :key="model.id"
                class="relative min-w-[10.5rem] shrink-0 rounded-[1rem] border px-3 py-2.5 text-left shadow-sm transition"
                :class="
                  selectedModelId === model.id
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                    : 'border-neutral-200/80 bg-white/95 text-neutral-700 hover:border-neutral-300 dark:border-neutral-800/80 dark:bg-neutral-900/95 dark:text-neutral-300 dark:hover:border-neutral-700'
                "
              >
                <button type="button" class="w-full text-left" @click="selectModel(model.id)">
                  <p class="truncate pr-6 text-xs font-semibold">
                    {{ model.label }}
                  </p>
                  <p
                    class="mt-1 truncate text-[10px]"
                    :class="
                      selectedModelId === model.id
                        ? 'text-white/70 dark:text-neutral-500'
                        : 'text-neutral-500 dark:text-neutral-400'
                    "
                  >
                    {{ model.description }}
                  </p>
                </button>
                <button
                  type="button"
                  class="absolute right-2 top-2 rounded-full p-1 transition"
                  :class="
                    selectedModelId === model.id
                      ? 'hover:bg-white/10 dark:hover:bg-neutral-200/70'
                      : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
                  "
                  @click.stop="toggleFavoriteModel(model.id)"
                >
                  <UIcon
                    :name="isFavoriteModel(model.id) ? 'i-lucide-star' : 'i-lucide-star-off'"
                    class="size-3.5"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <UAlert
          v-if="error"
          class="mt-4 rounded-2xl"
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          title="Copilot error"
          :description="error"
        />
      </div>
    </template>

    <UModal
      :open="isModelLibraryOpen"
      title="Model library"
      description="Pick a model, set your new default, and star the ones you want pinned."
      :ui="{
        content: 'sm:max-w-3xl overflow-hidden rounded-[28px]',
        body: 'space-y-4 p-4 sm:p-5',
      }"
      @update:open="(value) => (isModelLibraryOpen = value)"
    >
      <template #body>
        <div
          v-if="isLoadingModels"
          class="px-2 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400"
        >
          Loading models...
        </div>

        <div v-else class="space-y-4">
          <div v-if="favoriteModelOptions.length > 0" class="space-y-2">
            <p class="px-1 text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">
              Starred
            </p>
            <div class="space-y-2">
              <div
                v-for="model in favoriteModelOptions"
                :key="model.id"
                class="rounded-[1.2rem] border border-neutral-200/80 bg-neutral-50/80 p-3 dark:border-neutral-800/80 dark:bg-neutral-900/70"
              >
                <div class="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    class="min-w-0 flex-1 text-left"
                    @click="selectModel(model.id)"
                  >
                    <p class="truncate text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                      {{ model.label }}
                    </p>
                    <p class="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {{ model.description }}
                    </p>
                  </button>
                  <div class="flex items-center gap-1">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      :icon="
                        currentDefaultModelId === model.id
                          ? 'i-lucide-badge-check'
                          : 'i-lucide-circle'
                      "
                      class="rounded-full"
                      @click="setPreferredDefaultModel(model.id)"
                    />
                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      :icon="isFavoriteModel(model.id) ? 'i-lucide-star' : 'i-lucide-star-off'"
                      class="rounded-full"
                      @click="toggleFavoriteModel(model.id)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <p class="px-1 text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">
              All models
            </p>
            <div class="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
              <div
                v-for="model in modelOptions"
                :key="model.id"
                class="rounded-[1.2rem] border p-3 transition"
                :class="
                  selectedModelId === model.id
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                    : 'border-neutral-200/80 bg-neutral-50/80 dark:border-neutral-800/80 dark:bg-neutral-900/70'
                "
              >
                <div class="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    class="min-w-0 flex-1 text-left"
                    @click="selectModel(model.id)"
                  >
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="truncate text-sm font-semibold">
                        {{ model.label }}
                      </p>
                      <UBadge
                        v-if="currentDefaultModelId === model.id"
                        color="neutral"
                        variant="soft"
                        size="sm"
                      >
                        Default
                      </UBadge>
                    </div>
                    <p
                      class="mt-1 truncate text-xs"
                      :class="
                        selectedModelId === model.id
                          ? 'text-white/70 dark:text-neutral-500'
                          : 'text-neutral-500 dark:text-neutral-400'
                      "
                    >
                      {{ model.description }}
                    </p>
                  </button>

                  <div class="flex items-center gap-1">
                    <UButton
                      color="neutral"
                      :variant="selectedModelId === model.id ? 'outline' : 'ghost'"
                      size="xs"
                      :icon="
                        currentDefaultModelId === model.id
                          ? 'i-lucide-badge-check'
                          : 'i-lucide-circle'
                      "
                      class="rounded-full"
                      @click="setPreferredDefaultModel(model.id)"
                    />
                    <UButton
                      color="neutral"
                      :variant="selectedModelId === model.id ? 'outline' : 'ghost'"
                      size="xs"
                      :icon="isFavoriteModel(model.id) ? 'i-lucide-star' : 'i-lucide-star-off'"
                      class="rounded-full"
                      @click="toggleFavoriteModel(model.id)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <UAlert
          v-if="modelError"
          class="mt-1 rounded-2xl"
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          title="Model catalog error"
          :description="modelError"
        />
      </template>
    </UModal>

    <UModal
      :open="isRenameDialogOpen"
      title="Rename conversation"
      description="Update the title shown in your conversation history."
      :ui="{
        content: 'sm:max-w-md overflow-hidden rounded-[28px]',
        body: 'space-y-4 p-6',
        footer: 'flex items-center justify-end gap-3 border-t border-muted/20 bg-elevated/20 p-5',
      }"
      @update:open="(value) => !value && closeRenameDialog()"
    >
      <template #body>
        <UFormField label="Title">
          <UInput
            v-model="renameDraft"
            class="w-full"
            maxlength="80"
            placeholder="Conversation title"
          />
        </UFormField>
      </template>

      <template #footer>
        <UButton color="neutral" variant="ghost" @click="closeRenameDialog"> Cancel </UButton>
        <UButton
          color="primary"
          icon="i-lucide-check"
          :loading="isRenamingConversation"
          :disabled="renameDraft.trim().length === 0"
          @click="submitRenameConversation"
        >
          Save
        </UButton>
      </template>
    </UModal>

    <UModal
      :open="isDeleteDialogOpen"
      title="Delete conversation"
      description="This permanently removes the conversation and all of its messages."
      :ui="{
        content: 'sm:max-w-md overflow-hidden rounded-[28px]',
        body: 'space-y-4 p-6',
        footer: 'flex items-center justify-end gap-3 border-t border-muted/20 bg-elevated/20 p-5',
      }"
      @update:open="(value) => !value && closeDeleteDialog()"
    >
      <template #body>
        <div
          class="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-neutral-600 dark:text-neutral-300"
        >
          <p class="font-semibold text-neutral-900 dark:text-neutral-100">
            {{ activeConversationTitle }}
          </p>
          <p class="mt-1">This action cannot be undone.</p>
        </div>
      </template>

      <template #footer>
        <UButton color="neutral" variant="ghost" @click="closeDeleteDialog"> Cancel </UButton>
        <UButton
          color="error"
          icon="i-lucide-trash-2"
          :loading="isDeletingConversation"
          @click="confirmDeleteConversation"
        >
          Delete
        </UButton>
      </template>
    </UModal>
  </section>
</template>

<style scoped>
:deep(.prose) {
  color: inherit;
}

:deep(.prose :first-child) {
  margin-top: 0;
}

:deep(.prose :last-child) {
  margin-bottom: 0;
}

::-webkit-scrollbar {
  width: 5px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(24, 24, 27, 0.14);
}

.dark ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.14);
}
</style>
