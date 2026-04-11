import type {
  DashboardAgentToolPreset,
  DashboardConversationDetail,
  DashboardConversationMessage,
  DashboardConversationSummary,
  DashboardConversationUsageSummary,
  OpenRouterCatalogModel,
} from "@brainiac/agent";
import type { WorkspaceNode } from "@brainiac/workspace";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { computed, ref, watch, type Ref } from "vue";

import {
  getActiveDashboardNodeMention,
  getDashboardNodeMentionSuggestions,
  stripActiveDashboardNodeMention,
} from "~/utils/dashboard-agent-mentions";
import { getErrorDebugDetails } from "~/utils/get-error-debug-details";
import { getErrorMessage } from "~/utils/get-error-message";

const MODEL_CATALOG_STALE_TIME_MS = 10 * 60 * 1000;
const ACCOUNT_STATUS_STALE_TIME_MS = 60 * 1000;
const MODEL_PREFERENCES_STORAGE_KEY =
  "brainiac.dashboard.agent.model-preferences";
const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});
const compactNumberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type DashboardAgentModelPreferences = {
  defaultModelId?: string;
  favoriteModelIds: string[];
};

type DashboardAgentModelAccessFilter = "all" | "free" | "paid";

type DashboardAgentModelOption = OpenRouterCatalogModel & {
  label: string;
  description: string;
  pricingLabel: string;
  compactPricingLabel: string;
  searchableText: string;
};

function formatCompactNumber(value: number | null | undefined) {
  if (!value) {
    return "0";
  }

  return compactNumberFormatter.format(value);
}

function formatContextLength(contextLength: number | null) {
  if (!contextLength) {
    return "Context unknown";
  }

  return `${formatCompactNumber(contextLength)} ctx`;
}

function formatUsd(value: number | null | undefined) {
  return usdFormatter.format(value ?? 0);
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

function formatUsdPerMillion(value?: string) {
  const numericValue = Number(value ?? "0");

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return formatUsd(numericValue * 1_000_000);
}

function formatModelPricing(model: OpenRouterCatalogModel) {
  if (model.isFree) {
    return "Free";
  }

  const promptPrice = formatUsdPerMillion(model.pricing.prompt);
  const completionPrice = formatUsdPerMillion(model.pricing.completion);

  if (promptPrice && completionPrice) {
    return `${promptPrice} in · ${completionPrice} out / 1M`;
  }

  return "Paid";
}

function formatModelPricingCompact(model: OpenRouterCatalogModel) {
  if (model.isFree) {
    return "Free";
  }

  const promptPrice = formatUsdPerMillion(model.pricing.prompt);

  return promptPrice ? `${promptPrice} / 1M in` : "Paid";
}

function formatUsageSummaryTokens(
  summary: DashboardConversationUsageSummary | null | undefined,
) {
  if (!summary) {
    return null;
  }

  return `${formatCompactNumber(summary.totals.totalTokens)} total`;
}

function getUsageRatio(
  summary: DashboardConversationUsageSummary | null | undefined,
) {
  const latest = summary?.latest;

  if (!latest?.contextLength) {
    return null;
  }

  return Math.min(latest.inputTokens / latest.contextLength, 1);
}

function formatUsageProgress(
  summary: DashboardConversationUsageSummary | null | undefined,
) {
  const latest = summary?.latest;

  if (!latest?.contextLength) {
    return "Usage appears after the first response";
  }

  const ratio = getUsageRatio(summary);

  if (ratio === null) {
    return "Usage appears after the first response";
  }

  return `${Math.round(ratio * 100)}% ctx · ${formatCompactNumber(latest.inputTokens)} / ${formatCompactNumber(latest.contextLength)}`;
}

function readModelPreferences(): DashboardAgentModelPreferences {
  if (!import.meta.client) {
    return {
      favoriteModelIds: [],
    };
  }

  try {
    const rawValue = window.localStorage.getItem(MODEL_PREFERENCES_STORAGE_KEY);

    if (!rawValue) {
      return {
        favoriteModelIds: [],
      };
    }

    const parsedValue = JSON.parse(
      rawValue,
    ) as Partial<DashboardAgentModelPreferences>;

    return {
      defaultModelId:
        typeof parsedValue.defaultModelId === "string" &&
          parsedValue.defaultModelId.trim().length > 0
          ? parsedValue.defaultModelId
          : undefined,
      favoriteModelIds: Array.isArray(parsedValue.favoriteModelIds)
        ? [
          ...new Set(
            parsedValue.favoriteModelIds.filter(
              (value): value is string => typeof value === "string",
            ),
          ),
        ]
        : [],
    };
  } catch {
    return {
      favoriteModelIds: [],
    };
  }
}

function writeModelPreferences(preferences: DashboardAgentModelPreferences) {
  if (!import.meta.client) {
    return;
  }

  window.localStorage.setItem(
    MODEL_PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences),
  );
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
    usageSummary: conversation.usageSummary,
    usageLabel: formatUsageSummaryTokens(conversation.usageSummary),
    usageProgressLabel: formatUsageProgress(conversation.usageSummary),
  };
}

function getToolPresetLabel(preset: DashboardAgentToolPreset) {
  switch (preset) {
    case "agent":
      return "Agent";
    case "ask":
    default:
      return "Ask";
  }
}

function upsertConversationSummary(
  list: DashboardConversationSummary[],
  nextConversation: DashboardConversationSummary,
) {
  return [
    nextConversation,
    ...list.filter((conversation) => conversation.id !== nextConversation.id),
  ].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
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

function toConversationSummary(
  detail: DashboardConversationDetail,
): DashboardConversationSummary {
  return {
    id: detail.id,
    title: detail.title,
    model: detail.model,
    toolPreset: detail.toolPreset,
    usageSummary: detail.usageSummary,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
    lastMessageAt: detail.lastMessageAt,
    lastMessagePreview: detail.lastMessagePreview,
  };
}

export function useDashboardAgentChat(nodes: Ref<WorkspaceNode[]>, activeTabId?: Ref<string | null>) {
  const initialModelPreferences = readModelPreferences();
  const authSession = useAuthSession();
  const orpc = useOrpc();
  const queryClient = useQueryClient();
  const workspaceStore = useWorkspaceStore();
  const { nodes: workspaceNodes } = storeToRefs(workspaceStore);
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
  const conversationDraftToolPreset = ref<DashboardAgentToolPreset>("ask");
  const syncedConversationId = ref<string | null>(null);
  const syncedConversationToolPreset = ref<DashboardAgentToolPreset | null>(
    null,
  );
  const preferredDefaultModelId = ref(initialModelPreferences.defaultModelId);
  const favoriteModelIds = ref(initialModelPreferences.favoriteModelIds);
  const modelSearch = ref("");
  const favoritesOnly = ref(false);
  const accessFilter = ref<DashboardAgentModelAccessFilter>("all");
  const toolsOnly = ref(false);
  const selectedCreatorIds = ref<string[]>([]);
  const authEnabled = computed(() => Boolean(authSession.value?.data?.user));
  const activeMention = computed(() =>
    getActiveDashboardNodeMention(draft.value),
  );
  const selectedNodeIdSet = computed(() => new Set(selectedNodeIds.value));
  const favoriteModelIdSet = computed(() => new Set(favoriteModelIds.value));
  const selectedNodes = computed(() =>
    nodes.value.filter((node) => selectedNodeIdSet.value.has(node.id)),
  );
  const singleScopeTitle = computed(() => {
    if (selectedNodes.value.length === 0 && nodes.value.length === 1) {
      return nodes.value[0]?.title?.trim() || null;
    }

    return null;
  });
  const activeContextNodeTitles = computed(() => {
    if (selectedNodes.value.length > 0) {
      return selectedNodes.value.map((node) => node.title);
    }

    return singleScopeTitle.value ? [singleScopeTitle.value] : [];
  });

  const conversationsListQueryOptions =
    orpc.agent.conversations.list.queryOptions();
  const accountStatusQueryOptions = orpc.agent.accountStatus.queryOptions();
  const modelCatalogQuery = useQuery({
    ...orpc.agent.modelCatalog.queryOptions(),
    enabled: authEnabled,
    staleTime: MODEL_CATALOG_STALE_TIME_MS,
    gcTime: MODEL_CATALOG_STALE_TIME_MS * 3,
  });
  const accountStatusQuery = useQuery({
    ...accountStatusQueryOptions,
    enabled: authEnabled,
    staleTime: ACCOUNT_STATUS_STALE_TIME_MS,
    gcTime: ACCOUNT_STATUS_STALE_TIME_MS * 3,
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
    enabled: Boolean(
      authSession.value?.data?.user && activeConversationId.value,
    ),
  }));

  const chatTurnMutation = useMutation(orpc.agent.chat.turn.mutationOptions());
  const renameConversationMutation = useMutation(
    orpc.agent.conversations.rename.mutationOptions(),
  );
  const deleteConversationMutation = useMutation(
    orpc.agent.conversations.delete.mutationOptions(),
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

  const modelOptions = computed<DashboardAgentModelOption[]>(() =>
    (modelCatalogQuery.data.value?.models ?? []).map((model) => ({
      ...model,
      label: model.name,
      pricingLabel: formatModelPricing(model),
      compactPricingLabel: formatModelPricingCompact(model),
      description: [
        model.creatorLabel,
        formatContextLength(model.contextLength),
        model.supportsTools ? "Tools enabled" : "Direct answers",
        formatModelPricing(model),
      ].join(" · "),
      searchableText: [
        model.name,
        model.id,
        model.creatorLabel,
        model.creatorId,
      ]
        .join(" ")
        .toLowerCase(),
    })),
  );
  const creatorFilterOptions = computed(() => {
    const counts = new Map<
      string,
      { creatorId: string; creatorLabel: string; count: number }
    >();

    for (const model of modelOptions.value) {
      const current = counts.get(model.creatorId);

      counts.set(model.creatorId, {
        creatorId: model.creatorId,
        creatorLabel: model.creatorLabel,
        count: (current?.count ?? 0) + 1,
      });
    }

    return [...counts.values()].sort((left, right) =>
      left.creatorLabel.localeCompare(right.creatorLabel),
    );
  });
  const filteredModelOptions = computed(() =>
    modelOptions.value.filter((model) => {
      if (favoritesOnly.value && !favoriteModelIdSet.value.has(model.id)) {
        return false;
      }

      if (accessFilter.value === "free" && !model.isFree) {
        return false;
      }

      if (accessFilter.value === "paid" && model.isFree) {
        return false;
      }

      if (toolsOnly.value && !model.supportsTools) {
        return false;
      }

      if (
        selectedCreatorIds.value.length > 0 &&
        !selectedCreatorIds.value.includes(model.creatorId)
      ) {
        return false;
      }

      if (!modelSearch.value.trim()) {
        return true;
      }

      return model.searchableText.includes(
        modelSearch.value.trim().toLowerCase(),
      );
    }),
  );
  const toolPresetOptions = computed(
    () =>
      [
        {
          value: "ask",
          label: "Ask",
        },
        {
          value: "agent",
          label: "Agent",
        },
      ] satisfies Array<{
        value: DashboardAgentToolPreset;
        label: string;
        description: string;
      }>,
  );

  const conversationList = computed(
    () => conversationsQuery.data.value?.conversations ?? [],
  );
  const conversationOptions = computed(() =>
    conversationList.value.map(buildConversationOption),
  );
  const activeConversation = computed(
    () => activeConversationQuery.data.value ?? null,
  );
  const activeConversationSummary = computed(
    () =>
      conversationList.value.find(
        (conversation) => conversation.id === activeConversationId.value,
      ) ?? null,
  );
  const activeConversationUsageSummary = computed(
    () =>
      activeConversation.value?.usageSummary ??
      activeConversationSummary.value?.usageSummary ??
      null,
  );
  const activeConversationUsageRatio = computed(() =>
    getUsageRatio(activeConversationUsageSummary.value),
  );
  const activeConversationUsageLabel = computed(() =>
    formatUsageProgress(activeConversationUsageSummary.value),
  );
  const activeConversationUsageTotalsLabel = computed(() => {
    const summary = activeConversationUsageSummary.value;

    if (!summary?.latest) {
      return "Usage appears after the first response";
    }

    return `${formatCompactNumber(summary.totals.totalTokens)} total · ${formatUsd(summary.totals.costUsd)}`;
  });
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

    if (nodes.value.length === 1 && firstNode) {
      return [
        `Summarize "${firstNode.title}".`,
        `What stands out about "${firstNode.title}"?`,
        `What should I do next based on "${firstNode.title}"?`,
      ];
    }

    return [
      "Summarize the main themes in this dashboard.",
      "Which nodes look like the highest leverage items right now?",
      firstNode
        ? `What stands out about "${firstNode.title}"?`
        : "What should I focus on first?",
    ];
  });
  const canSend = computed(
    () => draft.value.trim().length > 0 && !chatTurnMutation.isPending.value,
  );
  const composerPlaceholder = computed(() => {
    const modePrefix =
      selectedToolPreset.value === "agent"
        ? "Tell the agent what to do"
        : "Ask about anything";

    if (selectedNodes.value.length === 1) {
      return `${modePrefix} “${selectedNodes.value[0]?.title}”. Type @ to add more nodes.`;
    }

    if (selectedNodes.value.length > 1) {
      return `${modePrefix} these ${selectedNodes.value.length} selected nodes. Type @ to refine the scope.`;
    }

    if (singleScopeTitle.value) {
      return `${modePrefix} "${singleScopeTitle.value}". Type @ to refine the scope.`;
    }

    return selectedToolPreset.value === "agent"
      ? "Tell the agent what to inspect or change in this dashboard. Type @ to narrow the turn to a node."
      : "Ask the agent about this dashboard. Type @ to narrow the turn to a node.";
  });
  const scopeLabel = computed(() => {
    if (selectedNodes.value.length > 0) {
      return `${selectedNodes.value.length} selected node${selectedNodes.value.length === 1 ? "" : "s"
        } in scope`;
    }

    if (singleScopeTitle.value) {
      return `"${singleScopeTitle.value}" in scope`;
    }

    return `All ${nodes.value.length} node${nodes.value.length === 1 ? "" : "s"} in scope`;
  });
  const activeConversationTitle = computed(
    () =>
      activeConversation.value?.title ??
      activeConversationSummary.value?.title ??
      "New conversation",
  );
  const activeConversationToolPreset = computed<DashboardAgentToolPreset>(
    () =>
      activeConversation.value?.toolPreset ??
      activeConversationSummary.value?.toolPreset ??
      "ask",
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
  const effectiveDefaultModelId = computed(() => {
    const availableModelIds = new Set(
      modelOptions.value.map((model) => model.id),
    );

    if (
      preferredDefaultModelId.value &&
      availableModelIds.has(preferredDefaultModelId.value)
    ) {
      return preferredDefaultModelId.value;
    }

    const serverDefaultModelId = modelCatalogQuery.data.value?.defaultModel;

    if (serverDefaultModelId && availableModelIds.has(serverDefaultModelId)) {
      return serverDefaultModelId;
    }

    return modelOptions.value[0]?.id;
  });
  const favoriteModelOptions = computed(() =>
    favoriteModelIds.value
      .map((favoriteId) =>
        modelOptions.value.find((model) => model.id === favoriteId),
      )
      .filter((model): model is DashboardAgentModelOption => Boolean(model)),
  );
  const topModelOptions = computed(() => {
    const orderedIds = [
      ...favoriteModelIds.value,
      selectedModelId.value,
      effectiveDefaultModelId.value,
    ].filter((value): value is string => Boolean(value));

    return [...new Set(orderedIds)]
      .map((modelId) =>
        modelOptions.value.find((model) => model.id === modelId),
      )
      .filter((model): model is DashboardAgentModelOption => Boolean(model));
  });
  const modelCount = computed(() => modelOptions.value.length);
  const filteredModelCount = computed(() => filteredModelOptions.value.length);
  const selectedModelOption = computed(() =>
    modelOptions.value.find((model) => model.id === selectedModelId.value),
  );
  const selectedToolPresetOption = computed(
    () =>
      toolPresetOptions.value.find(
        (preset) => preset.value === selectedToolPreset.value,
      ) ?? toolPresetOptions.value[0],
  );
  const activeConversationToolPresetOption = computed(
    () =>
      toolPresetOptions.value.find(
        (preset) => preset.value === activeConversationToolPreset.value,
      ) ?? toolPresetOptions.value[0],
  );
  const hasPendingToolPresetChange = computed(
    () =>
      Boolean(activeConversationId.value) &&
      selectedToolPreset.value !== activeConversationToolPreset.value,
  );

  const toolPresetStatusLabel = computed(() => {
    const selectedPresetLabel = selectedToolPresetOption.value?.label ?? "Ask";

    if (!activeConversationId.value) {
      return `${selectedPresetLabel} mode will be used for this new conversation.`;
    }

    if (hasPendingToolPresetChange.value) {
      const activePresetLabel =
        activeConversationToolPresetOption.value?.label ?? "Ask";

      return `Next reply switches this thread from ${activePresetLabel} to ${selectedPresetLabel}.`;
    }

    return `${selectedPresetLabel} mode is active for this thread.`;
  });
  const availableCredits = computed(
    () => accountStatusQuery.data.value?.availableCredits ?? 0,
  );
  const accountBalanceLabel = computed(() => {
    if (accountStatusQuery.isLoading.value) {
      return "Loading balance";
    }

    return formatUsd(accountStatusQuery.data.value?.availableCredits);
  });
  const accountUsageLabel = computed(() => {
    const data = accountStatusQuery.data.value;

    if (!data) {
      return "Account usage unavailable";
    }

    return `${formatUsd(data.usageDaily)} today · ${formatUsd(data.usageMonthly)} month`;
  });
  const modelHint = computed(() => {
    const selectedModel = selectedModelOption.value;

    if (selectedModel) {
      return selectedModel.description;
    }

    if (modelCatalogQuery.isError.value) {
      return "Using the server default model until the OpenRouter catalog is available.";
    }

    if (modelCatalogQuery.isLoading.value) {
      return "Loading the OpenRouter model catalog.";
    }

    return "Choose from the current OpenRouter model catalog.";
  });
  const modelError = computed(() =>
    modelCatalogQuery.isError.value
      ? getErrorMessage(
        modelCatalogQuery.error.value,
        "Unable to load the OpenRouter model catalog.",
      )
      : null,
  );
  const modelDebugDetails = computed(() =>
    modelCatalogQuery.isError.value
      ? getErrorDebugDetails(modelCatalogQuery.error.value)
      : null,
  );
  const accountStatusError = computed(() =>
    accountStatusQuery.isError.value
      ? getErrorMessage(
        accountStatusQuery.error.value,
        "Unable to load OpenRouter account status.",
      )
      : null,
  );
  const hasConversations = computed(() => conversationList.value.length > 0);
  const canRenameConversation = computed(() =>
    Boolean(activeConversationId.value),
  );
  const canDeleteConversation = computed(() =>
    Boolean(activeConversationId.value),
  );

  watch(
    nodes,
    (nextNodes) => {
      const availableNodeIds = new Set(nextNodes.map((node) => node.id));
      selectedNodeIds.value = selectedNodeIds.value.filter((id) =>
        availableNodeIds.has(id),
      );
    },
    { deep: true },
  );

  watch(
    () => modelCatalogQuery.data.value,
    (payload) => {
      if (!payload) {
        return;
      }

      const availableIds = new Set(payload.models.map((model) => model.id));
      favoriteModelIds.value = favoriteModelIds.value.filter((modelId) =>
        availableIds.has(modelId),
      );

      if (
        preferredDefaultModelId.value &&
        !availableIds.has(preferredDefaultModelId.value)
      ) {
        preferredDefaultModelId.value = undefined;
      }

      const nextDefaultModel =
        preferredDefaultModelId.value &&
          availableIds.has(preferredDefaultModelId.value)
          ? preferredDefaultModelId.value
          : availableIds.has(payload.defaultModel)
            ? payload.defaultModel
            : payload.models[0]?.id;

      if (
        !activeConversationId.value &&
        (!conversationDraftModelId.value ||
          !availableIds.has(conversationDraftModelId.value))
      ) {
        conversationDraftModelId.value = nextDefaultModel;
      }
    },
    { immediate: true },
  );

  watch(
    () => activeConversation.value,
    (conversation) => {
      if (!conversation) {
        syncedConversationId.value = null;
        syncedConversationToolPreset.value = null;
        return;
      }

      const isNewConversation = syncedConversationId.value !== conversation.id;
      const hasLocalToolPresetOverride =
        !isNewConversation &&
        syncedConversationToolPreset.value !== null &&
        conversationDraftToolPreset.value !==
        syncedConversationToolPreset.value;

      conversationDraftModelId.value =
        conversation.model ?? conversationDraftModelId.value;

      if (isNewConversation || !hasLocalToolPresetOverride) {
        conversationDraftToolPreset.value = conversation.toolPreset;
      }

      syncedConversationId.value = conversation.id;
      syncedConversationToolPreset.value = conversation.toolPreset;
    },
    { immediate: true },
  );

  watch(activeConversationId, () => {
    draft.value = "";
    error.value = null;
    errorDebugDetails.value = null;
    pendingMessages.value = [];
    selectedNodeIds.value = [];

    if (!activeConversationId.value) {
      syncedConversationId.value = null;
      syncedConversationToolPreset.value = null;
      conversationDraftModelId.value = effectiveDefaultModelId.value;
      conversationDraftToolPreset.value = "ask";
    }
  });

  watch(
    [preferredDefaultModelId, favoriteModelIds],
    ([nextDefaultModelId, nextFavoriteModelIds]) => {
      writeModelPreferences({
        defaultModelId: nextDefaultModelId,
        favoriteModelIds: nextFavoriteModelIds,
      });
    },
    { deep: true },
  );

  function getConversationDetailQueryKey(conversationId: string) {
    return orpc.agent.conversations.get.queryOptions({
      input: {
        conversationId,
      },
    }).queryKey;
  }

  function resetModelFilters() {
    modelSearch.value = "";
    favoritesOnly.value = false;
    accessFilter.value = "all";
    toolsOnly.value = false;
    selectedCreatorIds.value = [];
  }

  function startNewConversation() {
    activeConversationId.value = null;
    draft.value = "";
    selectedNodeIds.value = [];
    pendingMessages.value = [];
    error.value = null;
    errorDebugDetails.value = null;
    syncedConversationId.value = null;
    syncedConversationToolPreset.value = null;
    conversationDraftModelId.value = effectiveDefaultModelId.value;
    conversationDraftToolPreset.value = "ask";
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

    if (
      !conversationId ||
      !title ||
      renameConversationMutation.isPending.value
    ) {
      return;
    }

    error.value = null;
    errorDebugDetails.value = null;

    try {
      const updatedConversation = await renameConversationMutation.mutateAsync({
        conversationId,
        title,
      });

      queryClient.setQueryData(
        getConversationDetailQueryKey(conversationId),
        updatedConversation,
      );
      queryClient.setQueryData(
        conversationsListQueryOptions.queryKey,
        (
          current:
            | {
              conversations?: DashboardConversationSummary[];
            }
            | undefined,
        ) => ({
          conversations: upsertConversationSummary(
            current?.conversations ?? [],
            toConversationSummary(updatedConversation),
          ),
        }),
      );

      isRenameDialogOpen.value = false;
    } catch (renameError) {
      error.value = getErrorMessage(
        renameError,
        "Failed to rename the conversation.",
      );
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
      queryClient.setQueryData(
        conversationsListQueryOptions.queryKey,
        (
          current:
            | {
              conversations?: DashboardConversationSummary[];
            }
            | undefined,
        ) => ({
          conversations: (current?.conversations ?? []).filter(
            (conversation) => conversation.id !== conversationId,
          ),
        }),
      );

      isDeleteDialogOpen.value = false;
      startNewConversation();
    } catch (deleteError) {
      error.value = getErrorMessage(
        deleteError,
        "Failed to delete the conversation.",
      );
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
      contextNodeTitles: activeContextNodeTitles.value,
      model: model ?? null,
      toolsCalled: [],
      createdAt: new Date().toISOString(),
    };
    const scopedNodes =
      selectedNodes.value.length > 0 ? selectedNodes.value : nodes.value;

    error.value = null;
    errorDebugDetails.value = null;
    draft.value = "";
    selectedNodeIds.value = [];
    pendingMessages.value = [optimisticUserMessage];

    try {
      const result = await chatTurnMutation.mutateAsync({
        conversationId: activeConversationId.value ?? undefined,
        content,
        nodes: workspaceNodes.value,
        scopeNodes: scopedNodes,
        contextNodeTitles:
          activeContextNodeTitles.value.length > 0
            ? activeContextNodeTitles.value
            : undefined,
        ...(activeTabId?.value ? { activeTabId: activeTabId.value } : {}),
        ...(model ? { model } : {}),
        toolPreset: selectedToolPreset.value,
      });

      pendingMessages.value = [];
      activeConversationId.value = result.conversation.id;
      conversationDraftModelId.value =
        result.conversation.model ?? conversationDraftModelId.value;
      conversationDraftToolPreset.value = result.conversation.toolPreset;
      syncedConversationId.value = result.conversation.id;
      syncedConversationToolPreset.value = result.conversation.toolPreset;

      queryClient.setQueryData(
        conversationsListQueryOptions.queryKey,
        (
          current:
            | {
              conversations?: DashboardConversationSummary[];
            }
            | undefined,
        ) => ({
          conversations: upsertConversationSummary(
            current?.conversations ?? [],
            result.conversation,
          ),
        }),
      );
      queryClient.setQueryData(
        getConversationDetailQueryKey(result.conversation.id),
        (current: DashboardConversationDetail | undefined) =>
          appendConversationMessages(current, result.conversation, [
            result.userMessage,
            result.assistantMessage,
          ]),
      );
      void queryClient.invalidateQueries({
        queryKey: accountStatusQueryOptions.queryKey,
      });

      if (result.workspaceSnapshot) {
        workspaceStore.applyWorkspaceSnapshot(
          result.workspaceSnapshot.nodes,
          result.workspaceSnapshot.updatedAt,
        );
      }
    } catch (mutationError) {
      pendingMessages.value = [];
      draft.value = content;
      error.value = getErrorMessage(
        mutationError,
        "Failed to reach the dashboard agent.",
      );
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

  function cycleToolPreset() {
    const currentIndex = toolPresetOptions.value.findIndex(
      (preset) => preset.value === selectedToolPreset.value,
    );
    const nextIndex =
      currentIndex >= 0
        ? (currentIndex + 1) % toolPresetOptions.value.length
        : 0;
    const nextPreset = toolPresetOptions.value[nextIndex];

    if (nextPreset) {
      selectedToolPreset.value = nextPreset.value;
    }
  }

  function selectToolPreset(value: DashboardAgentToolPreset) {
    selectedToolPreset.value = value;
  }

  function isFavoriteModel(modelId: string) {
    return favoriteModelIdSet.value.has(modelId);
  }

  function toggleFavoriteModel(modelId: string) {
    if (favoriteModelIdSet.value.has(modelId)) {
      favoriteModelIds.value = favoriteModelIds.value.filter(
        (favoriteId) => favoriteId !== modelId,
      );
      return;
    }

    favoriteModelIds.value = [...favoriteModelIds.value, modelId];
  }

  function moveFavoriteModel(modelId: string, direction: -1 | 1) {
    const currentIndex = favoriteModelIds.value.findIndex(
      (favoriteId) => favoriteId === modelId,
    );

    if (currentIndex < 0) {
      return;
    }

    const nextIndex = currentIndex + direction;

    if (nextIndex < 0 || nextIndex >= favoriteModelIds.value.length) {
      return;
    }

    const nextFavoriteModelIds = [...favoriteModelIds.value];
    const [moved] = nextFavoriteModelIds.splice(currentIndex, 1);

    if (!moved) {
      return;
    }

    nextFavoriteModelIds.splice(nextIndex, 0, moved);
    favoriteModelIds.value = nextFavoriteModelIds;
  }

  function toggleCreatorFilter(creatorId: string) {
    if (selectedCreatorIds.value.includes(creatorId)) {
      selectedCreatorIds.value = selectedCreatorIds.value.filter(
        (value) => value !== creatorId,
      );
      return;
    }

    selectedCreatorIds.value = [...selectedCreatorIds.value, creatorId];
  }

  function isModelSelectable(model: DashboardAgentModelOption) {
    return model.isFree || availableCredits.value > 0;
  }

  function setPreferredDefaultModel(modelId: string) {
    const modelExists = modelOptions.value.some(
      (model) => model.id === modelId,
    );

    if (!modelExists) {
      return;
    }

    preferredDefaultModelId.value = modelId;

    if (!activeConversationId.value) {
      conversationDraftModelId.value = modelId;
    }
  }

  return {
    accessFilter,
    accountBalanceLabel,
    accountStatus: accountStatusQuery.data,
    accountStatusError,
    accountUsageLabel,
    activeConversation,
    activeConversationId,
    activeConversationToolPreset,
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
    composerPlaceholder,
    confirmDeleteConversation,
    conversationList,
    conversationOptions,
    creatorFilterOptions,
    currentDefaultModelId: effectiveDefaultModelId,
    cycleToolPreset,
    deleteDialogOpen: isDeleteDialogOpen,
    draft,
    error,
    errorDebugDetails,
    favoriteModelOptions,
    favoritesOnly,
    filteredModelCount,
    filteredModelOptions,
    formatUsageProgress,
    formatUsageSummaryTokens,
    hasConversations,
    hasPendingToolPresetChange,
    isDeleteDialogOpen,
    isDeletingConversation: deleteConversationMutation.isPending,
    isFavoriteModel,
    isLoadingAccountStatus: accountStatusQuery.isLoading,
    isLoadingConversation: activeConversationQuery.isLoading,
    isLoadingModels: modelCatalogQuery.isLoading,
    isModelSelectable,
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
  };
}
