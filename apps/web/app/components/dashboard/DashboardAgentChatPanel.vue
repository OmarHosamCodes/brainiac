<script setup lang="ts">
import type {
  AgentToolCall,
  AgentToolCallEntry,
  DashboardAgentToolPreset,
  DashboardConversationMessage,
} from "@brainiac/agent";
import type { WorkspaceNode } from "@brainiac/workspace";
import { computed, reactive, ref, toRef } from "vue";

import { renderSimpleMarkdown } from "~/utils/render-simple-markdown";

type DashboardToolResponsePreview = {
  toolName: string;
  message: DashboardConversationMessage;
};

const props = withDefaults(
  defineProps<{
    nodes: WorkspaceNode[];
    compact?: boolean;
    scopeKind?: "nodes" | "blocks";
    activeTabId?: string | null;
  }>(),
  {
    scopeKind: "nodes",
    activeTabId: null,
  },
);

defineEmits(["close"]);

const activePane = ref<"chat" | "history">("chat");
const isModelLibraryOpen = ref(false);
const canInspectToolResponses = import.meta.dev;
const activeToolResponsePreview = ref<DashboardToolResponsePreview | null>(null);
const {
  accessFilter,
  accountBalanceLabel,
  accountStatusError,
  accountUsageLabel,
  activeConversationId,
  activeConversationToolPresetOption,
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
  confirmDeleteConversation,
  conversationList,
  conversationOptions,
  creatorFilterOptions,
  currentDefaultModelId,
  draft,
  error,
  favoriteModelOptions,
  favoritesOnly,
  filteredModelCount,
  filteredModelOptions,
  hasConversations,
  hasPendingToolPresetChange,
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
  selectedToolPreset,
  selectedToolPresetOption,
  sendMessage,
  selectToolPreset,
  setPreferredDefaultModel,
  startNewConversation,
  submitRenameConversation,
  toggleCreatorFilter,
  toggleFavoriteModel,
  topModelOptions,
  toolPresetOptions,
  toolPresetStatusLabel,
  toolsOnly,
} = useDashboardAgentChat(toRef(props, "nodes"), toRef(props, "activeTabId"));

const isBlockScope = computed(() => props.scopeKind === "blocks");
const activeConversationMeta = computed(
  () =>
    conversationOptions.value.find((conversation) => conversation.id === activeConversationId.value)
      ?.meta ?? displayScopeLabel.value,
);
const panelTitle = computed(() =>
  activePane.value === "history" ? "History" : activeConversationTitle.value,
);
const panelDescription = computed(() =>
  activePane.value === "history"
    ? `${conversationList.value.length} thread${conversationList.value.length === 1 ? "" : "s"}`
    : activeConversationMeta.value,
);
const visibleHistory = computed(() => conversationOptions.value);
const emptyMentionResults = computed(
  () => activeMention.value && mentionSuggestions.value.length === 0,
);
const displayScopeLabel = computed(() => {
  if (!isBlockScope.value) {
    return scopeLabel.value;
  }

  if (selectedNodes.value.length > 0) {
    return `${selectedNodes.value.length} selected block${
      selectedNodes.value.length === 1 ? "" : "s"
    } in scope`;
  }

  if (props.nodes.length === 1 && isScopedBlockNode(props.nodes[0])) {
    return `"${getScopeItemLabel(props.nodes[0])}" in scope`;
  }

  const blockCount = getScopedBlockCount(props.nodes);

  return `All ${blockCount} block${blockCount === 1 ? "" : "s"} in scope`;
});
const displayComposerPlaceholder = computed(() => {
  return selectedToolPreset.value === "agent" ? "Tell the agent what to do" : "Ask about anything";
});
const emptyStateHelperText = computed(() =>
  isBlockScope.value
    ? "Ask for summaries, patterns, next actions, or type @ to narrow the turn to a block."
    : "Ask for summaries, patterns, next actions, or narrow the turn with `@node`.",
);
const mentionHeading = computed(() => (isBlockScope.value ? "Match blocks" : "Match nodes"));
const emptyMentionResultsText = computed(() =>
  isBlockScope.value
    ? "No matching blocks in the current scope."
    : "No matching nodes in the current workspace.",
);
const messageStatus = computed(() => {
  if (error.value) {
    return "error";
  }

  if (isPending.value) {
    return "streaming";
  }

  if (isLoadingConversation.value) {
    return "submitted";
  }

  return "ready";
});

const PROGRESS_PHASES: { label: string; afterMs: number }[] = [
  { label: "Thinking", afterMs: 0 },
  { label: "Reading your workspace", afterMs: 1800 },
  { label: "Working through it", afterMs: 5000 },
  { label: "Composing response", afterMs: 9000 },
  { label: "Almost there", afterMs: 16000 },
];

const progressPhaseStartedAt = ref<number | null>(null);
const progressPhaseTick = ref(0);
let progressPhaseInterval: ReturnType<typeof setInterval> | null = null;

watch(
  isPending,
  (pending) => {
    if (pending) {
      progressPhaseStartedAt.value = Date.now();
      progressPhaseTick.value = 0;
      if (progressPhaseInterval) clearInterval(progressPhaseInterval);
      progressPhaseInterval = setInterval(() => {
        progressPhaseTick.value += 1;
      }, 750);
    } else {
      progressPhaseStartedAt.value = null;
      if (progressPhaseInterval) {
        clearInterval(progressPhaseInterval);
        progressPhaseInterval = null;
      }
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (progressPhaseInterval) {
    clearInterval(progressPhaseInterval);
    progressPhaseInterval = null;
  }
});

const progressPhaseLabel = computed(() => {
  // Reactive on the tick so the label refreshes as elapsed time crosses thresholds.
  void progressPhaseTick.value;
  const startedAt = progressPhaseStartedAt.value;
  if (!startedAt) return PROGRESS_PHASES[0]!.label;
  const elapsed = Date.now() - startedAt;
  let active = PROGRESS_PHASES[0]!;
  for (const phase of PROGRESS_PHASES) {
    if (elapsed >= phase.afterMs) {
      active = phase;
    } else {
      break;
    }
  }
  return active.label;
});
const composerSupportText = computed(
  () => modelError.value ?? accountStatusError.value ?? modelHint.value,
);
const hasComposerSupportError = computed(() =>
  Boolean(modelError.value || accountStatusError.value),
);
const activeToolResponseModalTitle = computed(() => {
  const preview = activeToolResponsePreview.value;

  return preview ? `Response after ${preview.toolName}` : "Model response";
});
const activeToolResponseModalDescription = computed(() => {
  const preview = activeToolResponsePreview.value;

  if (!preview) {
    return "Development-only model response inspector";
  }

  const details = ["Development only"];

  if (preview.message.model) {
    details.push(preview.message.model);
  }

  details.push(formatMessageTimestamp(preview.message.createdAt));

  return details.join(" · ");
});
const toolResponsePreviewHtml = computed(() =>
  activeToolResponsePreview.value
    ? renderAssistantMessage(activeToolResponsePreview.value.message.content)
    : "",
);

function formatTokenCount(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatMessageTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getUsageWidth(
  summary:
    | {
        latest?: {
          inputTokens: number;
          contextLength: number | null;
        } | null;
      }
    | null
    | undefined,
) {
  const latest = summary?.latest;

  if (!latest?.contextLength) {
    return 0;
  }

  return Math.min((latest.inputTokens / latest.contextLength) * 100, 100);
}

function isScopedBlockNode(node: WorkspaceNode | undefined) {
  return Boolean(node?.id.includes("::context::"));
}

function getScopeItemLabel(node: WorkspaceNode | undefined) {
  if (node && isBlockScope.value && isScopedBlockNode(node)) {
    const block = node.tabs[0]?.blocks[0];

    if (block) {
      return block.title.trim() || "Untitled block";
    }
  }

  return node?.title?.trim() || (isBlockScope.value ? "Untitled block" : "Untitled node");
}

function getScopedBlockCount(nodes: WorkspaceNode[]) {
  if (nodes.every((node) => isScopedBlockNode(node))) {
    return nodes.length;
  }

  return nodes.reduce(
    (total, node) => total + node.tabs.reduce((tabTotal, tab) => tabTotal + tab.blocks.length, 0),
    0,
  );
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

function getToolPresetIcon(preset: DashboardAgentToolPreset) {
  return preset === "agent" ? "i-lucide-bot" : "i-lucide-message-square-more";
}

function renderAssistantMessage(content: string) {
  return renderSimpleMarkdown(content);
}

type NormalizedToolCall = {
  key: string;
  name: string;
  label: string;
  summary: string;
  status: "completed" | "error" | "in_progress";
  error: string | null;
  input: unknown;
  output: unknown;
  hasDetails: boolean;
  linkCard: FetchedLinkCard | null;
};

interface FetchedLinkCard {
  url: string;
  finalUrl: string;
  host: string;
  title: string | null;
  excerpt: string | null;
  truncated: boolean;
  faviconUrl: string;
}

function extractFetchedLinkCard(
  name: string,
  status: NormalizedToolCall["status"],
  input: unknown,
  output: unknown,
): FetchedLinkCard | null {
  if (name !== "fetch_web_page" || status === "error") {
    return null;
  }

  const inputObj =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : null;
  const outputObj =
    output && typeof output === "object" && !Array.isArray(output)
      ? (output as Record<string, unknown>)
      : null;

  if (outputObj && typeof outputObj.error === "string" && outputObj.error.length > 0) {
    return null;
  }

  const url =
    (outputObj?.url as string | undefined) ?? (inputObj?.url as string | undefined) ?? "";
  const finalUrl = (outputObj?.finalUrl as string | undefined) ?? url;

  if (!url && !finalUrl) {
    return null;
  }

  let host = "";
  try {
    const parsed = new URL(finalUrl || url);
    host = parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }

  const title = (outputObj?.title as string | null | undefined) ?? null;
  const rawExcerpt = (outputObj?.excerpt as string | null | undefined) ?? null;
  const excerpt =
    rawExcerpt && rawExcerpt.trim().length > 0 ? truncateString(rawExcerpt, 220) : null;

  return {
    url: url || finalUrl,
    finalUrl: finalUrl || url,
    host,
    title: title && title.trim().length > 0 ? title : null,
    excerpt,
    truncated: Boolean(outputObj?.truncated),
    faviconUrl: `https://www.google.com/s2/favicons?domain=${host}&sz=64`,
  };
}

const TOOL_LABELS: Record<string, string> = {
  list_dashboard_nodes: "Listed dashboard nodes",
  search_dashboard: "Searched the workspace",
  list_marketplace_items: "Listed marketplace items",
  search_marketplace: "Searched the marketplace",
  get_node_details: "Inspected a node",
  get_tab_details: "Inspected a tab",
  get_block_details: "Inspected a block",
  get_marketplace_item_details: "Inspected a marketplace item",
  create_node: "Created a node",
  replace_node: "Replaced a node",
  delete_node: "Deleted a node",
  create_tab: "Created a tab",
  replace_tab: "Replaced a tab",
  delete_tab: "Deleted a tab",
  create_block: "Created a block",
  patch_block: "Patched a block",
  replace_block: "Replaced a block",
  delete_block: "Deleted a block",
  fetch_web_page: "Fetched a web page",
  get_current_time: "Checked the current time",
};

function humanizeToolName(name: string) {
  if (TOOL_LABELS[name]) {
    return TOOL_LABELS[name];
  }

  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function truncateString(value: string, max = 80) {
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max - 1)}…` : collapsed;
}

function summarizeToolCall(name: string, input: unknown, output: unknown): string {
  const inputObj =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : null;
  const outputObj =
    output && typeof output === "object" && !Array.isArray(output)
      ? (output as Record<string, unknown>)
      : null;

  switch (name) {
    case "fetch_web_page": {
      const url = (inputObj?.url as string | undefined) ?? "";
      const title = outputObj?.title as string | null | undefined;
      try {
        const host = url ? new URL(url).hostname.replace(/^www\./, "") : "";
        return title ? `${truncateString(title, 60)} · ${host}` : host || "web page";
      } catch {
        return title ? truncateString(title, 60) : url || "web page";
      }
    }
    case "search_dashboard":
    case "search_marketplace": {
      const query = (inputObj?.query as string | undefined) ?? "";
      return query ? `“${truncateString(query, 60)}”` : "results";
    }
    case "get_node_details":
    case "get_tab_details":
    case "get_block_details":
    case "get_marketplace_item_details": {
      const summary = outputObj?.summary as Record<string, unknown> | null | undefined;
      const title =
        (summary?.title as string | undefined) ??
        (outputObj?.title as string | undefined) ??
        "";
      return title ? truncateString(title, 70) : "";
    }
    case "create_block":
    case "patch_block":
    case "replace_block":
    case "delete_block": {
      const blockType =
        (inputObj?.blockType as string | undefined) ??
        (inputObj?.type as string | undefined) ??
        "";
      const title =
        (inputObj?.title as string | undefined) ??
        ((inputObj?.block as Record<string, unknown> | undefined)?.title as string | undefined) ??
        "";
      const parts = [blockType, title].filter(Boolean).map((part) => truncateString(part, 40));
      return parts.join(" · ");
    }
    case "create_node":
    case "replace_node":
    case "delete_node": {
      const title = (inputObj?.title as string | undefined) ?? "";
      return title ? truncateString(title, 60) : "";
    }
    case "create_tab":
    case "replace_tab":
    case "delete_tab": {
      const title =
        (inputObj?.title as string | undefined) ??
        ((inputObj?.tab as Record<string, unknown> | undefined)?.title as string | undefined) ??
        "";
      return title ? truncateString(title, 60) : "";
    }
    case "list_dashboard_nodes": {
      const nodes = outputObj?.nodes;
      if (Array.isArray(nodes)) {
        return `${nodes.length} node${nodes.length === 1 ? "" : "s"}`;
      }
      return "";
    }
    default:
      return "";
  }
}

function normalizeToolCall(entry: AgentToolCallEntry, index: number): NormalizedToolCall {
  if (typeof entry === "string") {
    return {
      key: `${index}:${entry}`,
      name: entry,
      label: humanizeToolName(entry),
      summary: "",
      status: "completed",
      error: null,
      input: undefined,
      output: undefined,
      hasDetails: false,
      linkCard: null,
    };
  }

  const call = entry as AgentToolCall;
  const summary = summarizeToolCall(call.name, call.input, call.output);
  const hasDetails =
    call.input !== undefined || call.output !== undefined || Boolean(call.error);

  return {
    key: `${index}:${call.id ?? call.name}`,
    name: call.name,
    label: humanizeToolName(call.name),
    summary,
    status: call.status,
    error: call.error ?? null,
    input: call.input,
    output: call.output,
    hasDetails,
    linkCard: extractFetchedLinkCard(call.name, call.status, call.input, call.output),
  };
}

function getMessageToolCalls(message: DashboardConversationMessage): NormalizedToolCall[] {
  const entries = (message.toolsCalled ?? []) as AgentToolCallEntry[];
  return entries.map((entry, index) => normalizeToolCall(entry, index));
}

function getToolStatusIcon(call: NormalizedToolCall) {
  if (call.status === "error") {
    return "i-lucide-circle-alert";
  }
  if (call.status === "in_progress") {
    return "i-lucide-loader-circle";
  }
  return getToolIcon(call.name);
}

function getToolIcon(name: string) {
  if (name === "fetch_web_page") {
    return "i-lucide-globe";
  }
  if (name.startsWith("search_") || name === "list_dashboard_nodes" || name === "list_marketplace_items") {
    return "i-lucide-search";
  }
  if (name.startsWith("get_")) {
    return "i-lucide-eye";
  }
  if (name.startsWith("create_")) {
    return "i-lucide-plus";
  }
  if (name.startsWith("delete_")) {
    return "i-lucide-trash-2";
  }
  if (name.startsWith("patch_") || name.startsWith("replace_")) {
    return "i-lucide-pencil-line";
  }
  if (name === "get_current_time") {
    return "i-lucide-clock";
  }
  return "i-lucide-wrench";
}

function formatToolPayload(value: unknown) {
  if (value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

interface FetchedLinkCard {
  url: string;
  finalUrl: string;
  host: string;
  title: string | null;
  excerpt: string | null;
  truncated: boolean;
  faviconUrl: string;
}

const expandedToolCalls = reactive<Set<string>>(new Set());

function isToolCallExpanded(messageId: string, key: string) {
  return expandedToolCalls.has(`${messageId}::${key}`);
}

function toggleToolCallExpanded(messageId: string, key: string) {
  const id = `${messageId}::${key}`;
  if (expandedToolCalls.has(id)) {
    expandedToolCalls.delete(id);
  } else {
    expandedToolCalls.add(id);
  }
}

function inspectToolResponse(
  isOpen: boolean,
  message: DashboardConversationMessage,
  toolName: string,
) {
  if (!canInspectToolResponses || !isOpen || message.role !== "assistant") {
    return;
  }

  activeToolResponsePreview.value = {
    toolName,
    message,
  };
}

function closeToolResponsePreview() {
  activeToolResponsePreview.value = null;
}
</script>

<template>
  <section
    class="relative flex h-full min-h-0 w-full flex-col overflow-hidden border border-neutral-200/70 bg-white/92 shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-neutral-800/70 dark:bg-neutral-950/94"
    :class="compact ? 'rounded-[1.5rem]' : 'rounded-[2rem]'"
  >
    <header
      class="shrink-0 border-b border-neutral-200/60 bg-white/75 dark:border-neutral-800/60 dark:bg-neutral-950/70"
    >
      <UDashboardNavbar
        :title="panelTitle"
        :description="panelDescription"
        :ui="{
          left: compact ? 'min-w-0 gap-2' : 'min-w-0 gap-3',
          right: compact ? 'gap-0.5' : 'gap-1',
          root: compact ? 'px-3 py-3' : 'px-4 py-4',
        }"
      >
        <template #leading>
          <div
            class="flex shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-md dark:bg-white dark:text-neutral-950"
            :class="compact ? 'size-8' : 'size-10'"
          >
            <UIcon name="i-lucide-sparkles" :class="compact ? 'size-3.5' : 'size-4.5'" />
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

    <main
      class="relative min-h-0 flex-1 overflow-hidden bg-gradient-to-b from-transparent via-neutral-50/35 to-neutral-50/60 dark:via-neutral-950/15 dark:to-neutral-900/45"
    >
      <div
        v-if="activePane === 'history'"
        class="absolute inset-0 flex min-h-0 flex-col overflow-hidden"
      >
        <div class="shrink-0 px-4 py-4 sm:px-5">
          <div
            class="flex items-center justify-between gap-3 rounded-[1.5rem] border border-neutral-200/70 bg-white/80 p-4 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-900/70"
          >
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">
                Past threads
              </p>
              <p class="mt-1 text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                Re-open a previous conversation or start fresh.
              </p>
            </div>
            <UButton
              color="neutral"
              variant="soft"
              size="xs"
              icon="i-lucide-plus"
              class="shrink-0 rounded-xl"
              @click="handleStartNewConversation"
            >
              New
            </UButton>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-5 sm:px-5 sm:pb-6">
          <div
            v-if="!hasConversations"
            class="flex h-full flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-neutral-300/70 bg-white/50 px-6 py-10 text-center dark:border-neutral-700/70 dark:bg-neutral-900/35"
          >
            <UIcon name="i-lucide-message-square-dashed" class="size-8 text-neutral-400/80" />
            <p class="mt-4 text-sm font-semibold text-neutral-950 dark:text-neutral-50">
              No history yet
            </p>
            <p class="mt-1 max-w-xs text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              Your previous agent conversations will appear here once you start chatting.
            </p>
          </div>

          <div v-else class="space-y-2.5">
            <button
              v-for="conversation in visibleHistory"
              :key="conversation.id"
              type="button"
              class="w-full rounded-[1.35rem] border p-4 text-left transition-all"
              :class="
                conversation.id === activeConversationId
                  ? 'border-neutral-950 bg-neutral-950 text-white shadow-lg dark:border-white dark:bg-white dark:text-neutral-950'
                  : 'border-neutral-200/70 bg-white/80 shadow-sm hover:border-neutral-300 dark:border-neutral-800/70 dark:bg-neutral-900/55 dark:hover:border-neutral-700'
              "
              @click="handleSelectConversation(conversation.id)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold">
                    {{ conversation.label }}
                  </p>
                  <p class="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">
                    {{ conversation.meta }}
                  </p>
                  <p class="mt-2 line-clamp-2 text-xs leading-relaxed opacity-80">
                    {{ conversation.preview }}
                  </p>
                </div>
                <UIcon
                  v-if="conversation.id === activeConversationId"
                  name="i-lucide-check"
                  class="mt-0.5 size-4 shrink-0"
                />
              </div>

              <div v-if="conversation.usageSummary.latest" class="mt-3 space-y-2">
                <div
                  class="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] opacity-60"
                >
                  <span>{{ conversation.usageLabel }}</span>
                  <span>{{ Math.round(getUsageWidth(conversation.usageSummary)) }}%</span>
                </div>
                <div class="h-1.5 rounded-full bg-current/10">
                  <div
                    class="h-full rounded-full bg-current transition-all"
                    :style="{
                      width: `${getUsageWidth(conversation.usageSummary)}%`,
                    }"
                  />
                </div>
                <p class="text-[11px] opacity-70">
                  {{ conversation.usageProgressLabel }}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <template v-else>
        <UChatMessages
          :messages="messages"
          :status="messageStatus"
          :should-auto-scroll="true"
          :should-scroll-to-bottom="true"
          :compact="compact"
          :assistant="{
            icon: 'i-lucide-sparkles',
            ui: {
              leadingIcon:
                'mt-1 size-5 rounded-full bg-neutral-100 p-1 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300',
            },
          }"
          class="chat-panel-messages absolute inset-0"
          :ui="{
            root: 'h-full overflow-y-auto px-4 py-4 sm:px-5 sm:py-5',
            autoScroll: 'bottom-4 sm:bottom-5',
          }"
        >
          <template #content="{ message }">
            <div
              v-if="message.role === 'user'"
              class="whitespace-pre-wrap text-sm leading-6 text-neutral-950 dark:text-neutral-50"
            >
              {{ message.content }}
            </div>
            <div
              v-else
              class="prose prose-sm max-w-none prose-neutral dark:prose-invert prose-p:leading-relaxed prose-pre:rounded-2xl prose-pre:border prose-pre:border-neutral-200 prose-pre:bg-neutral-950 prose-pre:text-neutral-50 dark:prose-pre:border-neutral-800 dark:prose-pre:bg-neutral-900"
              v-html="renderAssistantMessage(message.content)"
            />

            <div
              v-if="getMessageToolCalls(message).length"
              class="mt-3 flex flex-col gap-1.5"
            >
              <div
                v-for="call in getMessageToolCalls(message)"
                :key="call.key"
                class="rounded-lg border border-neutral-200/70 bg-neutral-50/60 text-xs dark:border-neutral-800/70 dark:bg-neutral-900/40"
                :class="{
                  'border-rose-200/80 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/30':
                    call.status === 'error',
                }"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-neutral-100/70 dark:hover:bg-neutral-900/60 disabled:cursor-default disabled:hover:bg-transparent"
                  :disabled="!call.hasDetails"
                  :aria-expanded="isToolCallExpanded(message.id, call.key)"
                  @click="call.hasDetails && toggleToolCallExpanded(message.id, call.key)"
                >
                  <UIcon
                    :name="getToolStatusIcon(call)"
                    class="size-3.5 shrink-0"
                    :class="{
                      'text-rose-500 dark:text-rose-400': call.status === 'error',
                      'text-neutral-500 dark:text-neutral-400': call.status !== 'error',
                      'animate-spin': call.status === 'in_progress',
                    }"
                  />
                  <span
                    class="font-medium text-neutral-700 dark:text-neutral-200"
                  >
                    {{ call.label }}
                  </span>
                  <span
                    v-if="call.summary"
                    class="min-w-0 flex-1 truncate text-neutral-500 dark:text-neutral-400"
                  >
                    {{ call.summary }}
                  </span>
                  <span v-else class="flex-1" />
                  <UIcon
                    v-if="call.hasDetails"
                    name="i-lucide-chevron-down"
                    class="size-3.5 shrink-0 text-neutral-400 transition-transform"
                    :class="{ 'rotate-180': isToolCallExpanded(message.id, call.key) }"
                  />
                </button>
                <a
                  v-if="call.linkCard"
                  :href="call.linkCard.finalUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="group/link mx-2 mb-2 mt-0.5 flex gap-2.5 rounded-md border border-neutral-200/60 bg-white/70 p-2.5 transition hover:border-neutral-300 hover:bg-white dark:border-neutral-800/60 dark:bg-neutral-950/40 dark:hover:border-neutral-700 dark:hover:bg-neutral-950/70"
                >
                  <img
                    :src="call.linkCard.faviconUrl"
                    :alt="`${call.linkCard.host} favicon`"
                    width="16"
                    height="16"
                    class="mt-0.5 size-4 shrink-0 rounded-sm bg-neutral-100 object-contain dark:bg-neutral-900"
                    loading="lazy"
                    @error="($event.target as HTMLImageElement).style.visibility = 'hidden'"
                  />
                  <div class="min-w-0 flex-1">
                    <div
                      class="truncate text-[12px] font-semibold text-neutral-800 group-hover/link:text-neutral-950 dark:text-neutral-200 dark:group-hover/link:text-neutral-50"
                    >
                      {{ call.linkCard.title || call.linkCard.host }}
                    </div>
                    <div
                      class="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-neutral-500 dark:text-neutral-400"
                    >
                      <UIcon name="i-lucide-link" class="size-3 shrink-0" />
                      <span class="truncate">{{ call.linkCard.host }}</span>
                      <span
                        v-if="call.linkCard.truncated"
                        class="ml-auto shrink-0 rounded-sm bg-neutral-200/70 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/70 dark:text-neutral-400"
                      >
                        truncated
                      </span>
                    </div>
                    <p
                      v-if="call.linkCard.excerpt"
                      class="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400"
                    >
                      {{ call.linkCard.excerpt }}
                    </p>
                  </div>
                  <UIcon
                    name="i-lucide-arrow-up-right"
                    class="mt-0.5 size-3.5 shrink-0 text-neutral-400 transition group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 group-hover/link:text-neutral-600 dark:group-hover/link:text-neutral-200"
                  />
                </a>
                <div
                  v-if="call.hasDetails && isToolCallExpanded(message.id, call.key)"
                  class="border-t border-neutral-200/60 px-3 py-2.5 text-[11px] dark:border-neutral-800/60"
                >
                  <p
                    v-if="call.error"
                    class="mb-2 rounded-md bg-rose-100/70 px-2 py-1 font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    {{ call.error }}
                  </p>
                  <div v-if="call.input !== undefined" class="mb-2">
                    <div
                      class="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400"
                    >
                      Input
                    </div>
                    <pre
                      class="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-neutral-100/70 px-2 py-1.5 font-mono text-[11px] leading-relaxed text-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300"
                    >{{ formatToolPayload(call.input) }}</pre>
                  </div>
                  <div v-if="call.output !== undefined">
                    <div
                      class="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400"
                    >
                      Result
                    </div>
                    <pre
                      class="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-neutral-100/70 px-2 py-1.5 font-mono text-[11px] leading-relaxed text-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300"
                    >{{ formatToolPayload(call.output) }}</pre>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="message.contextNodeTitles?.length" class="mt-3 flex flex-wrap gap-1.5">
              <span
                v-for="title in message.contextNodeTitles"
                :key="title"
                class="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
              >
                {{ title }}
              </span>
            </div>
          </template>

          <template #footer="{ message }">
            <div
              v-if="message.role === 'assistant' && message.model"
              class="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400"
            >
              {{ message.model }}
            </div>
          </template>

          <template v-if="messages.length === 0 && !isLoadingConversation" #default>
            <div class="flex h-full flex-col items-center justify-center px-4 py-8 sm:px-5">
              <div class="mt-5 grid gap-2">
                <button
                  v-for="prompt in promptSuggestions"
                  :key="prompt"
                  type="button"
                  class="rounded-[1.15rem] border border-neutral-200/70 bg-white px-4 py-3 text-left text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800/70 dark:bg-neutral-950/70 dark:text-neutral-300 dark:hover:border-neutral-700"
                  @click="handlePromptClick(prompt)"
                >
                  {{ prompt }}
                </button>
              </div>
            </div>
          </template>
        </UChatMessages>
      </template>
    </main>

    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      leave-active-class="transition-all duration-150 ease-in"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="activePane === 'chat' && isPending"
        class="agent-progress shrink-0 border-t border-neutral-200/60 bg-white/78 px-4 py-2 dark:border-neutral-800/60 dark:bg-neutral-950/78"
        role="status"
        aria-live="polite"
      >
        <div class="flex items-center gap-2.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
          <span class="agent-progress-pulse relative flex size-1.5 shrink-0">
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full bg-neutral-400/60 opacity-75 dark:bg-neutral-500/60"
            />
            <span class="relative inline-flex size-1.5 rounded-full bg-neutral-500 dark:bg-neutral-400" />
          </span>
          <Transition
            mode="out-in"
            enter-active-class="transition-opacity duration-200"
            enter-from-class="opacity-0"
            leave-active-class="transition-opacity duration-150"
            leave-to-class="opacity-0"
          >
            <span :key="progressPhaseLabel" class="tabular-nums">
              {{ progressPhaseLabel }}<span class="agent-progress-dots" aria-hidden="true">…</span>
            </span>
          </Transition>
        </div>
      </div>
    </Transition>

    <footer
      v-if="activePane === 'chat'"
      class="shrink-0 border-t border-neutral-200/60 bg-white/78 p-4 dark:border-neutral-800/60 dark:bg-neutral-950/78"
    >
      <div class="space-y-3">
        <slot name="scope-badges" />

        <div v-if="selectedNodes.length > 0" class="flex items-start justify-between gap-2">
          <div class="flex min-w-0 flex-wrap items-center gap-1.5">
            <UBadge
              v-for="node in selectedNodes"
              :key="node.id"
              color="neutral"
              variant="soft"
              size="sm"
              class="rounded-full pl-2.5 pr-1.5"
            >
              <span class="max-w-[10rem] truncate text-[11px] font-medium">
                {{ getScopeItemLabel(node) }}
              </span>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-x"
                class="ml-1 size-4 rounded-full p-0"
                @click="removeMentionedNode(node.id)"
              />
            </UBadge>
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-eraser"
            class="shrink-0 rounded-full"
            @click="clearMentionedNodes"
          />
        </div>

        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          title="Message failed"
          :description="error"
          class="rounded-[1.25rem]"
        />

        <UChatPrompt
          v-model="draft"
          :placeholder="displayComposerPlaceholder"
          :rows="1"
          :maxrows="8"
          autoresize
          class="shadow-sm"
          :ui="{
            root: 'gap-3 rounded-[1.7rem] border border-neutral-200/80 bg-white px-3 py-3 ring-1 ring-black/5 dark:border-neutral-800/80 dark:bg-neutral-950 dark:ring-white/5',
            footer: 'flex-col items-stretch gap-3',
          }"
          @submit.prevent="handleSubmit"
          @keydown.enter.exact="handleEnterKeydown"
        >
          <template #footer>
            <div class="flex flex-wrap items-center gap-2">
              <UPopover :ui="{ content: 'w-72 rounded-[1.5rem] p-4' }">
                <UButton color="neutral" variant="soft" size="sm" class="rounded-xl" type="button">
                  <UIcon name="i-lucide-cpu" class="size-3.5" />
                  <span class="max-w-[11rem] truncate">
                    {{
                      selectedModelOption?.label ||
                      (isLoadingModels ? "Loading models" : "Choose model")
                    }}
                  </span>
                </UButton>

                <template #content>
                  <div class="space-y-3">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p
                          class="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400"
                        >
                          Quick picks
                        </p>
                        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                          {{ modelCount }} models in catalog
                        </p>
                      </div>
                      <UButton
                        color="neutral"
                        variant="link"
                        size="xs"
                        type="button"
                        @click="openModelLibrary"
                      >
                        Library
                      </UButton>
                    </div>

                    <div v-if="topModelOptions.length > 0" class="space-y-1">
                      <button
                        v-for="model in topModelOptions"
                        :key="model.id"
                        type="button"
                        class="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left transition"
                        :class="
                          selectedModelId === model.id
                            ? 'bg-neutral-100 dark:bg-neutral-800'
                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                        "
                        @click="selectModel(model.id)"
                      >
                        <div class="min-w-0">
                          <p
                            class="truncate text-sm font-semibold text-neutral-950 dark:text-neutral-50"
                          >
                            {{ model.label }}
                          </p>
                          <p
                            class="mt-0.5 truncate text-[11px] text-neutral-500 dark:text-neutral-400"
                          >
                            {{ model.compactPricingLabel }}
                          </p>
                        </div>
                        <UIcon
                          v-if="selectedModelId === model.id"
                          name="i-lucide-check"
                          class="mt-0.5 size-4 shrink-0 text-neutral-500"
                        />
                      </button>
                    </div>

                    <div
                      v-else
                      class="rounded-xl border border-dashed border-neutral-200/80 bg-neutral-50/80 p-3 text-xs leading-relaxed text-neutral-500 dark:border-neutral-800/80 dark:bg-neutral-900/70 dark:text-neutral-400"
                    >
                      Open the library to browse the full catalog and pin favorite models.
                    </div>

                    <div
                      v-if="selectedModelOption"
                      class="border-t border-neutral-100 pt-3 dark:border-neutral-800"
                    >
                      <p class="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                        {{ selectedModelOption.description }}
                      </p>
                    </div>
                  </div>
                </template>
              </UPopover>

              <UPopover :ui="{ content: 'w-80 rounded-[1.5rem] p-4' }">
                <UButton color="neutral" variant="soft" size="sm" class="rounded-xl" type="button">
                  <UIcon
                    :name="getToolPresetIcon(selectedToolPresetOption?.value ?? 'ask')"
                    class="size-3.5"
                  />
                  {{ selectedToolPresetOption?.label }}
                  <UBadge
                    v-if="hasPendingToolPresetChange"
                    color="neutral"
                    variant="subtle"
                    size="sm"
                    class="rounded-full px-2 py-0.5 text-[10px]"
                  >
                    Next
                  </UBadge>
                </UButton>

                <template #content>
                  <div class="space-y-3">
                    <div class="space-y-1">
                      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                        Turn mode
                      </p>
                      <p class="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                        Switch between ask and agent mid-thread. The next reply uses the selected
                        mode.
                      </p>
                    </div>

                    <div class="space-y-1">
                      <button
                        v-for="preset in toolPresetOptions"
                        :key="preset.value"
                        type="button"
                        class="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left transition"
                        :class="
                          selectedToolPresetOption?.value === preset.value
                            ? 'bg-neutral-100 dark:bg-neutral-800'
                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                        "
                        @click="selectToolPreset(preset.value)"
                      >
                        <div class="min-w-0">
                          <div class="flex items-center gap-2">
                            <UIcon
                              :name="getToolPresetIcon(preset.value)"
                              class="size-3.5 text-neutral-500 dark:text-neutral-400"
                            />
                            <p class="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                              {{ preset.label }}
                            </p>
                          </div>
                          <p
                            class="mt-1 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400"
                          >
                            {{ preset.description }}
                          </p>
                        </div>

                        <div class="flex shrink-0 items-center gap-1.5">
                          <UBadge
                            v-if="
                              activeConversationId &&
                              activeConversationToolPresetOption?.value === preset.value
                            "
                            color="neutral"
                            variant="soft"
                            size="sm"
                            class="rounded-full px-2 py-0.5 text-[10px]"
                          >
                            Thread
                          </UBadge>
                          <UBadge
                            v-if="
                              selectedToolPresetOption?.value === preset.value &&
                              hasPendingToolPresetChange
                            "
                            color="neutral"
                            variant="subtle"
                            size="sm"
                            class="rounded-full px-2 py-0.5 text-[10px]"
                          >
                            Next
                          </UBadge>
                          <UBadge
                            v-else-if="selectedToolPresetOption?.value === preset.value"
                            color="neutral"
                            variant="subtle"
                            size="sm"
                            class="rounded-full px-2 py-0.5 text-[10px]"
                          >
                            Selected
                          </UBadge>
                        </div>
                      </button>
                    </div>

                    <div
                      class="rounded-xl border border-neutral-200/80 bg-neutral-50/80 p-3 text-[11px] leading-relaxed text-neutral-500 dark:border-neutral-800/80 dark:bg-neutral-900/70 dark:text-neutral-400"
                    >
                      {{ toolPresetStatusLabel }}
                    </div>
                  </div>
                </template>
              </UPopover>

              <UPopover :ui="{ content: 'w-64 rounded-[1.5rem] p-4' }">
                <UButton color="neutral" variant="soft" size="sm" class="rounded-xl" type="button">
                  <UIcon name="i-lucide-wallet" class="size-3.5" />
                  {{ accountBalanceLabel }}
                </UButton>

                <template #content>
                  <div class="space-y-2">
                    <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                      Credits
                    </span>
                    <p class="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                      {{ accountBalanceLabel }}
                    </p>
                    <p class="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                      {{ accountUsageLabel }}
                    </p>
                  </div>
                </template>
              </UPopover>

              <UPopover
                v-if="activeConversationUsageSummary"
                :ui="{ content: 'w-72 rounded-[1.5rem] p-4' }"
              >
                <UButton color="neutral" variant="soft" size="sm" class="rounded-xl" type="button">
                  <UIcon name="i-lucide-activity" class="size-3.5" />
                  Usage
                </UButton>

                <template #content>
                  <div class="space-y-4">
                    <div class="space-y-1.5">
                      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                        Context
                      </p>
                      <div class="flex items-center justify-between text-xs font-semibold">
                        <span>{{ activeConversationUsageLabel }}</span>
                      </div>
                      <div class="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div
                          class="h-full rounded-full bg-neutral-950 transition-all dark:bg-white"
                          :style="{
                            width: `${(activeConversationUsageRatio ?? 0) * 100}%`,
                          }"
                        />
                      </div>
                    </div>

                    <div
                      class="grid grid-cols-2 gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500"
                    >
                      <div v-if="activeConversationUsageSummary.latest" class="space-y-0.5">
                        <p class="opacity-60">In</p>
                        <p class="text-neutral-950 dark:text-white">
                          {{ formatTokenCount(activeConversationUsageSummary.latest.inputTokens) }}
                        </p>
                      </div>
                      <div v-if="activeConversationUsageSummary.latest" class="space-y-0.5">
                        <p class="opacity-60">Out</p>
                        <p class="text-neutral-950 dark:text-white">
                          {{ formatTokenCount(activeConversationUsageSummary.latest.outputTokens) }}
                        </p>
                      </div>
                    </div>
                    <p
                      class="border-t border-neutral-100 pt-2 text-[11px] text-neutral-400 dark:border-neutral-800"
                    >
                      {{ activeConversationUsageTotalsLabel }}
                    </p>
                  </div>
                </template>
              </UPopover>
            </div>

            <div class="flex items-end justify-between gap-3">
              <div class="min-w-0 space-y-1">
                <p class="text-[11px] font-medium leading-5 text-neutral-700 dark:text-neutral-300">
                  {{ toolPresetStatusLabel }}
                </p>
                <p class="min-w-0 text-[11px] leading-5 text-neutral-500 dark:text-neutral-400">
                  <span
                    v-if="composerSupportText"
                    :class="hasComposerSupportError ? 'text-red-600 dark:text-red-400' : ''"
                  >
                    {{
                      hasComposerSupportError
                        ? ` ${composerSupportText}`
                        : ` · ${composerSupportText}`
                    }}
                  </span>
                </p>
              </div>

              <UChatPromptSubmit
                :disabled="!canSend"
                :loading="isPending"
                color="neutral"
                class="size-10 shrink-0 justify-center rounded-2xl bg-neutral-950 p-0 text-white dark:bg-white dark:text-neutral-950"
                icon="i-lucide-arrow-up"
              />
            </div>
          </template>
        </UChatPrompt>

        <div
          v-if="activeMention"
          class="rounded-[1.4rem] border border-neutral-200/70 bg-white/90 p-2 shadow-lg dark:border-neutral-800/70 dark:bg-neutral-950/90"
        >
          <p class="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
            {{ mentionHeading }}
          </p>

          <div v-if="mentionSuggestions.length > 0" class="space-y-1">
            <button
              v-for="node in mentionSuggestions.slice(0, 4)"
              :key="node.id"
              type="button"
              class="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-neutral-100 dark:hover:bg-neutral-900"
              @mousedown.prevent="handleMentionPick(node)"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                  {{ getScopeItemLabel(node) }}
                </p>
              </div>
              <UIcon name="i-lucide-corner-down-left" class="size-3.5 shrink-0 text-neutral-400" />
            </button>
          </div>

          <div
            v-else-if="emptyMentionResults"
            class="px-3 py-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400"
          >
            {{ emptyMentionResultsText }}
          </div>
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
      :open="Boolean(activeToolResponsePreview)"
      :title="activeToolResponseModalTitle"
      :description="activeToolResponseModalDescription"
      :ui="{ content: 'sm:max-w-3xl rounded-[2rem]' }"
      scrollable
      @update:open="(value) => !value && closeToolResponsePreview()"
    >
      <template #body>
        <div v-if="activeToolResponsePreview" class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <UBadge color="neutral" variant="soft" class="rounded-full px-3 py-1">
              {{ activeToolResponsePreview.toolName }}
            </UBadge>
            <UBadge
              v-if="activeToolResponsePreview.message.model"
              color="neutral"
              variant="soft"
              class="rounded-full px-3 py-1"
            >
              {{ activeToolResponsePreview.message.model }}
            </UBadge>
            <UBadge color="neutral" variant="soft" class="rounded-full px-3 py-1">
              {{ formatMessageTimestamp(activeToolResponsePreview.message.createdAt) }}
            </UBadge>
          </div>

          <div
            class="prose prose-sm max-w-none prose-neutral dark:prose-invert prose-p:leading-relaxed prose-pre:rounded-2xl prose-pre:border prose-pre:border-neutral-200 prose-pre:bg-neutral-950 prose-pre:text-neutral-50 dark:prose-pre:border-neutral-800 dark:prose-pre:bg-neutral-900"
            v-html="toolResponsePreviewHtml"
          />
        </div>
      </template>
    </UModal>

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
        <UButton color="neutral" variant="ghost" size="sm" @click="closeRenameDialog"
          >Cancel</UButton
        >
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
        <p class="text-xs text-neutral-500">
          Permanently remove this thread? This cannot be undone.
        </p>
      </template>
      <template #footer>
        <UButton color="neutral" variant="ghost" size="sm" @click="closeDeleteDialog"
          >Cancel</UButton
        >
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

/* Keep the message feed readable when assistant prose includes wide blocks. */
:deep(.chat-panel-messages pre),
:deep(.chat-panel-messages code) {
  white-space: pre-wrap;
  word-break: break-word;
}

/* Custom scrollbar for long history/message regions. */
:deep(.overflow-y-auto) {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.08) transparent;
}

.dark :deep(.overflow-y-auto) {
  scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
}
</style>
