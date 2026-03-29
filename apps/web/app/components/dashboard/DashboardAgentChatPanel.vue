<script setup lang="ts">
import type { WorkspaceNode } from "@brainiac/workspace";
import { computed, nextTick, ref, toRef, useTemplateRef, watch } from "vue";

import { renderSimpleMarkdown } from "~/utils/render-simple-markdown";

const props = defineProps<{
  nodes: WorkspaceNode[];
  compact?: boolean;
}>();

defineEmits(["close"]);

const chatViewport = useTemplateRef<HTMLDivElement>("chatViewport");
const activePane = ref<"chat" | "history">("chat");
const isModelLibraryOpen = ref(false);
const {
  accessFilter,
  accountBalanceLabel,
  accountStatusError,
  accountUsageLabel,
  activeConversationId,
  activeConversationTitle,
  activeConversationUsageLabel,
  activeConversationUsageRatio,
  activeConversationUsageSummary,
  activeConversationUsageTotalsLabel,
  activeMention,
  addMentionedNode,
  availableCredits,
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
  creatorFilterOptions,
  currentDefaultModelId,
  cycleToolPreset,
  draft,
  error,
  favoriteModelOptions,
  favoritesOnly,
  filteredModelCount,
  filteredModelOptions,
  hasConversations,
  isDeleteDialogOpen,
  isDeletingConversation,
  isFavoriteModel,
  isLoadingAccountStatus,
  isLoadingConversation,
  isLoadingModels,
  isModelSelectable,
  isPending,
  isRenameDialogOpen,
  isRenamingConversation,
  mentionSuggestions,
  messages,
  modelCount,
  modelError,
  modelHint,
  modelOptions,
  modelSearch,
  moveFavoriteModel,
  openDeleteDialog,
  openRenameDialog,
  promptSuggestions,
  removeMentionedNode,
  renameDraft,
  resetModelFilters,
  scopeLabel,
  selectedCreatorIds,
  selectedModelId,
  selectedModelOption,
  selectedNodes,
  selectedToolPresetOption,
  sendMessage,
  setPreferredDefaultModel,
  startNewConversation,
  submitRenameConversation,
  toggleCreatorFilter,
  toggleFavoriteModel,
  topModelOptions,
  toolsOnly,
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

function formatTokenCount(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function getUsageWidth(summary: any | null | undefined) {
  const latest = summary?.latest;

  if (!latest?.contextLength) {
    return 0;
  }

  return Math.min((latest.inputTokens / latest.contextLength) * 100, 100);
}

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

function openModelLibrary() {
  resetModelFilters();
  isModelLibraryOpen.value = true;
}

function selectModel(modelId: string) {
  const model = modelOptions.value.find((entry) => entry.id === modelId);

  if (!model || !isModelSelectable(model)) {
    return;
  }

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
    class="flex h-screen max-h-screen flex-col overflow-hidden border-l border-neutral-200/60 bg-white/90 shadow-2xl backdrop-blur-3xl dark:border-neutral-800/60 dark:bg-neutral-900/95"
    :class="compact ? 'w-80' : 'w-full max-w-[420px]'"
  >
    <header class="shrink-0 border-b border-neutral-200/50 dark:border-neutral-800/50">
      <UDashboardNavbar
        :title="activePane === 'history' ? 'History' : activeConversationTitle"
        :description="activePane === 'history' ? `${conversationList.length} threads` : activeConversationMeta"
        :ui="{ 
          left: compact ? 'gap-2' : 'gap-3', 
          right: compact ? 'gap-0.5' : 'gap-1',
          root: 'px-4 py-3'
        }"
      >
        <template #leading>
          <div
            class="flex shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white shadow-md dark:bg-white dark:text-neutral-950"
            :class="compact ? 'size-7' : 'size-9'"
          >
            <UIcon name="i-lucide-sparkles" :class="compact ? 'size-3.5' : 'size-4'" />
          </div>
        </template>

        <template #trailing>
          <UButton
            color="neutral"
            :variant="activePane === 'history' ? 'soft' : 'ghost'"
            :size="compact ? 'xs' : 'sm'"
            icon="i-lucide-history"
            class="rounded-full"
            @click="toggleHistoryPane"
          />
          <UButton
            color="neutral"
            variant="ghost"
            :size="compact ? 'xs' : 'sm'"
            icon="i-lucide-square-pen"
            class="rounded-full"
            @click="handleStartNewConversation"
          />
          <UDropdownMenu
            :items="[
              [
                {
                  label: 'Rename',
                  icon: 'i-lucide-pencil-line',
                  disabled: !canRenameConversation,
                  onSelect: openRenameDialog,
                },
                {
                  label: 'Delete',
                  icon: 'i-lucide-trash-2',
                  disabled: !canDeleteConversation,
                  onSelect: openDeleteDialog,
                  color: 'error' as const,
                },
              ],
            ]"
          >
            <UButton
              color="neutral"
              variant="ghost"
              :size="compact ? 'xs' : 'sm'"
              icon="i-lucide-ellipsis"
              class="rounded-full"
              :disabled="!canRenameConversation && !canDeleteConversation"
            />
          </UDropdownMenu>
          <UButton
            color="neutral"
            variant="ghost"
            :size="compact ? 'xs' : 'sm'"
            icon="i-lucide-x"
            class="rounded-full"
            @click="$emit('close')"
          />
        </template>
      </UDashboardNavbar>
    </header>

    <main class="min-h-0 flex-1 overflow-hidden relative">
      <div v-if="activePane === 'history'" class="absolute inset-0 flex flex-col overflow-hidden">
        <div class="px-5 py-3 shrink-0">
          <div
            class="rounded-2xl border border-neutral-200/50 bg-neutral-50/40 p-3 dark:border-neutral-800/50 dark:bg-neutral-800/10"
          >
            <p class="text-xs font-semibold text-neutral-950 dark:text-neutral-50">
              Past threads
            </p>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          <div
            v-if="!hasConversations"
            class="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300/60 py-10 text-center dark:border-neutral-700/60"
          >
            <UIcon name="i-lucide-message-square-dashed" class="size-8 text-neutral-400 opacity-50" />
            <p class="mt-4 text-xs font-semibold text-neutral-500">No history yet</p>
          </div>

          <div v-else class="space-y-2">
            <button
              v-for="conversation in visibleHistory"
              :key="conversation.id"
              type="button"
              class="w-full rounded-xl border p-3 text-left transition-all"
              :class="
                conversation.id === activeConversationId
                  ? 'border-neutral-950 bg-neutral-950 text-white shadow-lg dark:border-white dark:bg-white dark:text-neutral-950'
                  : 'border-neutral-200/50 bg-white hover:border-neutral-300 dark:border-neutral-800/50 dark:bg-neutral-900/40 dark:hover:border-neutral-700'
              "
              @click="handleSelectConversation(conversation.id)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-xs font-semibold">{{ conversation.label }}</p>
                  <p
                    class="mt-0.5 line-clamp-1 text-[11px] opacity-70"
                  >
                    {{ conversation.preview }}
                  </p>
                </div>
                <UIcon
                  v-if="conversation.id === activeConversationId"
                  name="i-lucide-check"
                  class="mt-0.5 size-3.5 shrink-0"
                />
              </div>

              <div v-if="conversation.usageSummary.latest" class="mt-2.5 space-y-1.5">
                <div class="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider opacity-60">
                  <span>{{ conversation.usageLabel }}</span>
                  <span>{{ Math.round(getUsageWidth(conversation.usageSummary)) }}%</span>
                </div>
                <div class="h-1 rounded-full bg-current/10">
                  <div
                    class="h-full rounded-full bg-current transition-all"
                    :style="{ width: `${getUsageWidth(conversation.usageSummary)}%` }"
                  />
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <template v-else>
        <UChatMessages
          ref="chatViewport"
          :messages="messages"
          :status="isPending ? 'streaming' : (isLoadingConversation ? 'submitted' : 'ready')"
          class="absolute inset-0 px-5 py-6 overflow-y-auto"
        >
          <template #content="{ message }">
            <UChatMessage
              :message="message"
              :side="message.role === 'user' ? 'right' : 'left'"
            >
              <template #content>
                <div v-if="message.role === 'user'" class="whitespace-pre-wrap text-sm leading-relaxed">
                  {{ message.content }}
                </div>
                <div
                  v-else
                  class="prose prose-sm max-w-none prose-neutral dark:prose-invert prose-p:leading-relaxed"
                  v-html="renderAssistantMessage(message.content)"
                />

                <div v-if="message.toolsCalled?.length" class="mt-3 flex flex-wrap gap-2">
                  <UChatTool
                    v-for="tool in message.toolsCalled"
                    :key="tool"
                    :text="tool"
                    variant="card"
                    size="sm"
                    icon="i-lucide-wrench"
                  />
                </div>

                <div v-if="message.contextNodeTitles?.length" class="mt-3 flex flex-wrap gap-1">
                  <span
                    v-for="title in message.contextNodeTitles"
                    :key="title"
                    class="rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                  >
                    {{ title }}
                  </span>
                </div>
              </template>

              <template #footer>
                <div v-if="message.role === 'assistant' && message.model" class="mt-1 text-[9px] font-bold uppercase tracking-widest text-neutral-400">
                  {{ message.model }}
                </div>
              </template>
            </UChatMessage>
          </template>

          <template v-if="messages.length === 0 && !isLoadingConversation" #default>
            <div class="flex h-full flex-col items-center justify-center px-6 py-8">
              <div class="max-w-md w-full space-y-4 text-center">
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                  Quick starts
                </p>
                <div class="grid gap-1.5">
                  <button
                    v-for="prompt in promptSuggestions"
                    :key="prompt"
                    type="button"
                    class="rounded-xl border border-neutral-200/50 bg-white px-4 py-2.5 text-left text-xs font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800/50 dark:bg-neutral-900/40 dark:text-neutral-300 dark:hover:border-neutral-700"
                    @click="handlePromptClick(prompt)"
                  >
                    {{ prompt }}
                  </button>
                </div>
              </div>
            </div>
          </template>
        </UChatMessages>
      </template>
    </main>

    <footer v-if="activePane === 'chat'" class="shrink-0 border-t border-neutral-200/50 bg-neutral-50/10 p-4 dark:border-neutral-800/50">
      <div v-if="selectedNodes.length > 0" class="mb-2 flex flex-wrap items-center gap-1.5 px-1">
        <UBadge
          v-for="node in selectedNodes"
          :key="node.id"
          color="neutral"
          variant="soft"
          size="sm"
          class="rounded-full pl-2 pr-1"
        >
          <span class="max-w-[8rem] truncate text-[10px] font-medium">{{ node.title }}</span>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            class="ml-1 size-3.5 rounded-full p-0"
            @click="removeMentionedNode(node.id)"
          />
        </UBadge>
      </div>

      <UChatPrompt
        v-model="draft"
        :placeholder="composerPlaceholder"
        :rows="1"
        autoresize
        class="rounded-2xl border border-neutral-200/80 bg-white shadow-sm ring-primary-500/10 focus-within:ring-4 dark:border-neutral-800/80 dark:bg-neutral-950"
        @keydown.enter.exact="handleEnterKeydown"
      >
        <template #footer>
          <div class="flex flex-1 items-center justify-between gap-1 px-0.5">
            <div class="flex items-center gap-0.5">
              <UPopover :ui="{ content: 'w-64 p-4 rounded-2xl' }">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  class="rounded-xl px-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                >
                  <UIcon name="i-lucide-cpu" class="size-3.5" />
                  <span class="truncate max-w-[70px]">{{ selectedModelOption?.label || "Model" }}</span>
                </UButton>

                <template #content>
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Selector</span>
                      <UButton color="neutral" variant="link" size="xs" @click="openModelLibrary">Library</UButton>
                    </div>
                    
                    <div class="space-y-1">
                      <button
                        v-for="model in topModelOptions"
                        :key="model.id"
                        type="button"
                        class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition"
                        :class="selectedModelId === model.id ? 'bg-neutral-100 dark:bg-neutral-800 font-semibold' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'"
                        @click="selectModel(model.id)"
                      >
                        <span class="truncate">{{ model.label }}</span>
                        <UIcon v-if="selectedModelId === model.id" name="i-lucide-check" class="size-3.5" />
                      </button>
                    </div>

                    <div v-if="selectedModelOption" class="border-t border-neutral-100 dark:border-neutral-800 pt-2.5">
                      <p class="text-[10px] leading-relaxed text-neutral-500">
                        {{ selectedModelOption.description }}
                      </p>
                    </div>
                  </div>
                </template>
              </UPopover>

              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                class="rounded-xl px-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                @click="cycleToolPreset"
              >
                <UIcon name="i-lucide-sliders-horizontal" class="size-3.5" />
                {{ selectedToolPresetOption?.label }}
              </UButton>

              <UPopover :ui="{ content: 'w-64 p-4 rounded-2xl' }">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  class="rounded-xl px-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                >
                  <UIcon name="i-lucide-wallet" class="size-3.5" />
                  {{ accountBalanceLabel }}
                </UButton>

                <template #content>
                  <div class="space-y-2">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Credits</span>
                    <p class="text-sm font-semibold">{{ accountBalanceLabel }}</p>
                    <p class="text-xs text-neutral-500">{{ accountUsageLabel }}</p>
                  </div>
                </template>
              </UPopover>
            </div>

            <div class="flex items-center gap-1.5">
              <UPopover v-if="activeConversationUsageSummary" :ui="{ content: 'w-72 p-4 rounded-2xl' }">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  class="rounded-full size-8 p-0 text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                  icon="i-lucide-activity"
                />

                <template #content>
                  <div class="space-y-4">
                    <div class="space-y-1">
                      <p class="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Context</p>
                      <div class="flex items-center justify-between text-xs font-semibold">
                        <span>{{ activeConversationUsageLabel }}</span>
                      </div>
                      <div class="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div
                          class="h-full rounded-full bg-neutral-950 transition-all dark:bg-white"
                          :style="{ width: `${(activeConversationUsageRatio ?? 0) * 100}%` }"
                        />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      <div v-if="activeConversationUsageSummary.latest" class="space-y-0.5">
                        <p class="opacity-60">In</p>
                        <p class="text-neutral-950 dark:text-white">{{ formatTokenCount(activeConversationUsageSummary.latest.inputTokens) }}</p>
                      </div>
                      <div v-if="activeConversationUsageSummary.latest" class="space-y-0.5">
                        <p class="opacity-60">Out</p>
                        <p class="text-neutral-950 dark:text-white">{{ formatTokenCount(activeConversationUsageSummary.latest.outputTokens) }}</p>
                      </div>
                    </div>
                    <p class="text-[10px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 pt-2">
                      {{ activeConversationUsageTotalsLabel.split(' · ')[1] }} cost
                    </p>
                  </div>
                </template>
              </UPopover>

              <UChatPromptSubmit
                :disabled="!canSend"
                :loading="isPending"
                color="neutral"
                class="rounded-xl size-8 p-0 bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
                icon="i-lucide-arrow-up"
                @click="handleSubmit"
              />
            </div>
          </div>
        </template>
      </UChatPrompt>

      <div v-if="activeMention" class="mt-2">
         <div
          v-if="mentionSuggestions.length > 0"
          class="rounded-xl border border-neutral-200/60 bg-white/90 p-1 shadow-lg backdrop-blur-md dark:border-neutral-800/60 dark:bg-neutral-950/90"
        >
          <button
            v-for="node in mentionSuggestions.slice(0, 3)"
            :key="node.id"
            type="button"
            class="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition hover:bg-neutral-100 dark:hover:bg-neutral-900"
            @mousedown.prevent="handleMentionPick(node)"
          >
            <div class="min-w-0">
              <p class="truncate text-[11px] font-semibold">{{ node.title }}</p>
            </div>
            <UIcon name="i-lucide-corner-down-left" class="size-3 text-neutral-400" />
          </button>
        </div>
      </div>
    </footer>

    <DashboardAgentModelLibrary
      :open="isModelLibraryOpen"
      :is-loading-models="isLoadingModels"
      :is-loading-account-status="isLoadingAccountStatus"
      :model-error="modelError"
      :account-status-error="accountStatusError"
      :account-balance-label="accountBalanceLabel"
      :account-usage-label="accountUsageLabel"
      :available-credits="availableCredits"
      :current-default-model-id="currentDefaultModelId"
      :selected-model-id="selectedModelId"
      :model-search="modelSearch"
      :favorites-only="favoritesOnly"
      :access-filter="accessFilter"
      :tools-only="toolsOnly"
      :selected-creator-ids="selectedCreatorIds"
      :creator-filter-options="creatorFilterOptions"
      :filtered-model-count="filteredModelCount"
      :filtered-model-options="filteredModelOptions"
      :favorite-model-options="favoriteModelOptions"
      :is-favorite-model="isFavoriteModel"
      :is-model-selectable="isModelSelectable"
      @update:open="isModelLibraryOpen = $event"
      @update:model-search="modelSearch = $event"
      @update:favorites-only="favoritesOnly = $event"
      @update:access-filter="accessFilter = $event"
      @update:tools-only="toolsOnly = $event"
      @toggle-creator="toggleCreatorFilter"
      @reset-filters="resetModelFilters"
      @select-model="selectModel"
      @toggle-favorite="toggleFavoriteModel"
      @set-default="setPreferredDefaultModel"
      @move-favorite="moveFavoriteModel($event.modelId, $event.direction)"
    />

    <UModal
      :open="isRenameDialogOpen"
      title="Rename"
      :ui="{ content: 'sm:max-w-xs rounded-3xl' }"
      @update:open="(value) => !value && closeRenameDialog()"
    >
      <template #body>
        <UInput
          v-model="renameDraft"
          class="w-full"
          maxlength="80"
          placeholder="New title..."
          autofocus
        />
      </template>
      <template #footer>
        <UButton color="neutral" variant="ghost" size="sm" @click="closeRenameDialog">Cancel</UButton>
        <UButton
          color="primary"
          size="sm"
          :loading="isRenamingConversation"
          @click="submitRenameConversation"
        >
          Update
        </UButton>
      </template>
    </UModal>

    <UModal
      :open="isDeleteDialogOpen"
      title="Delete thread"
      :ui="{ content: 'sm:max-w-xs rounded-3xl' }"
      @update:open="(value) => !value && closeDeleteDialog()"
    >
      <template #body>
        <p class="text-xs text-neutral-500">Permanently remove this thread? This cannot be undone.</p>
      </template>
      <template #footer>
        <UButton color="neutral" variant="ghost" size="sm" @click="closeDeleteDialog">Cancel</UButton>
        <UButton
          color="error"
          size="sm"
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
  font-size: 0.875rem;
}

:deep(.prose p) {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

:deep(.prose :first-child) {
  margin-top: 0;
}

:deep(.prose :last-child) {
  margin-bottom: 0;
}

/* Custom scrollbar for message list */
:deep(.overflow-y-auto) {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.05) transparent;
}

.dark :deep(.overflow-y-auto) {
  scrollbar-color: rgba(255, 255, 255, 0.05) transparent;
}
</style>
