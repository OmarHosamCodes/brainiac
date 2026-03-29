<script setup lang="ts">
import { computed } from "vue";

type CreatorFilterOption = {
  creatorId: string;
  creatorLabel: string;
  count: number;
};

type ModelOption = {
  id: string;
  name: string;
  label: string;
  description: string;
  creatorId: string;
  creatorLabel: string;
  contextLength: number | null;
  supportsTools: boolean;
  isFree: boolean;
  pricing: {
    prompt: string;
    completion: string;
    [key: string]: string | number | undefined;
  };
  pricingLabel: string;
  compactPricingLabel: string;
  searchableText: string;
};

const props = defineProps<{
  open: boolean;
  isLoadingModels: boolean;
  isLoadingAccountStatus: boolean;
  modelError: string | null;
  accountStatusError: string | null;
  accountBalanceLabel: string;
  accountUsageLabel: string;
  availableCredits: number;
  currentDefaultModelId?: string;
  selectedModelId?: string;
  modelSearch: string;
  favoritesOnly: boolean;
  accessFilter: "all" | "free" | "paid";
  toolsOnly: boolean;
  selectedCreatorIds: string[];
  creatorFilterOptions: CreatorFilterOption[];
  filteredModelCount: number;
  filteredModelOptions: ModelOption[];
  favoriteModelOptions: ModelOption[];
  isFavoriteModel: (modelId: string) => boolean;
  isModelSelectable: (model: ModelOption) => boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  "update:modelSearch": [value: string];
  "update:favoritesOnly": [value: boolean];
  "update:accessFilter": [value: "all" | "free" | "paid"];
  "update:toolsOnly": [value: boolean];
  "toggle-creator": [creatorId: string];
  "reset-filters": [];
  "select-model": [modelId: string];
  "toggle-favorite": [modelId: string];
  "set-default": [modelId: string];
  "move-favorite": [payload: { modelId: string; direction: -1 | 1 }];
}>();

const modelSearchValue = computed({
  get: () => props.modelSearch,
  set: (value: string) => emit("update:modelSearch", value),
});

const favoritesOnlyValue = computed({
  get: () => props.favoritesOnly,
  set: (value: boolean) => emit("update:favoritesOnly", value),
});

const accessFilterValue = computed({
  get: () => props.accessFilter,
  set: (value: "all" | "free" | "paid") => emit("update:accessFilter", value),
});

const toolsOnlyValue = computed({
  get: () => props.toolsOnly,
  set: (value: boolean) => emit("update:toolsOnly", value),
});
</script>

<template>
  <UModal
    :open="open"
    title="Model library"
    description="Browse the full catalog, monitor balance, and curate your pinned quick picks."
    :ui="{
      content: 'sm:max-w-5xl overflow-hidden rounded-[28px]',
      body: 'p-0',
    }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="grid min-h-[70vh] gap-0 md:grid-cols-[17rem_minmax(0,1fr)]">
        <aside
          class="border-b border-neutral-200/70 bg-neutral-50/80 p-4 md:border-b-0 md:border-r dark:border-neutral-800/70 dark:bg-neutral-950/80"
        >
          <div class="space-y-4">
            <div
              class="rounded-[1.5rem] border border-neutral-200/80 bg-white/90 p-4 shadow-sm dark:border-neutral-800/80 dark:bg-neutral-900/90"
            >
              <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                Account balance
              </p>
              <p class="mt-2 text-2xl font-semibold text-neutral-950 dark:text-neutral-50">
                {{ accountBalanceLabel }}
              </p>
              <p class="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                {{ accountUsageLabel }}
              </p>
              <p
                v-if="availableCredits <= 0"
                class="mt-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
              >
                Paid models are visible, but selection is disabled until credits are available.
              </p>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                  Filters
                </p>
                <button
                  type="button"
                  class="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 transition hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                  @click="emit('reset-filters')"
                >
                  Reset
                </button>
              </div>

              <button
                type="button"
                class="flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-xs font-medium transition"
                :class="
                  favoritesOnlyValue
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                    : 'border-neutral-200/80 bg-white/90 text-neutral-700 hover:border-neutral-300 dark:border-neutral-800/80 dark:bg-neutral-900/90 dark:text-neutral-300 dark:hover:border-neutral-700'
                "
                @click="favoritesOnlyValue = !favoritesOnlyValue"
              >
                <span>Favorites only</span>
                <UIcon name="i-lucide-star" class="size-3.5" />
              </button>

              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="filterOption in [
                    { value: 'all', label: 'All' },
                    { value: 'free', label: 'Free' },
                    { value: 'paid', label: 'Paid' },
                  ]"
                  :key="filterOption.value"
                  type="button"
                  class="rounded-2xl border px-3 py-2 text-xs font-semibold transition"
                  :class="
                    accessFilterValue === filterOption.value
                      ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                      : 'border-neutral-200/80 bg-white/90 text-neutral-600 hover:border-neutral-300 dark:border-neutral-800/80 dark:bg-neutral-900/90 dark:text-neutral-300 dark:hover:border-neutral-700'
                  "
                  @click="accessFilterValue = filterOption.value as 'all' | 'free' | 'paid'"
                >
                  {{ filterOption.label }}
                </button>
              </div>

              <button
                type="button"
                class="flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-xs font-medium transition"
                :class="
                  toolsOnlyValue
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                    : 'border-neutral-200/80 bg-white/90 text-neutral-700 hover:border-neutral-300 dark:border-neutral-800/80 dark:bg-neutral-900/90 dark:text-neutral-300 dark:hover:border-neutral-700'
                "
                @click="toolsOnlyValue = !toolsOnlyValue"
              >
                <span>Tools enabled only</span>
                <UIcon name="i-lucide-wrench" class="size-3.5" />
              </button>
            </div>

            <div class="space-y-2">
              <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                Creator
              </p>
              <div class="max-h-[18rem] space-y-2 overflow-y-auto pr-1">
                <button
                  v-for="creator in creatorFilterOptions"
                  :key="creator.creatorId"
                  type="button"
                  class="flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-xs font-medium transition"
                  :class="
                    selectedCreatorIds.includes(creator.creatorId)
                      ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                      : 'border-neutral-200/80 bg-white/90 text-neutral-700 hover:border-neutral-300 dark:border-neutral-800/80 dark:bg-neutral-900/90 dark:text-neutral-300 dark:hover:border-neutral-700'
                  "
                  @click="emit('toggle-creator', creator.creatorId)"
                >
                  <span class="truncate">{{ creator.creatorLabel }}</span>
                  <span
                    class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    :class="
                      selectedCreatorIds.includes(creator.creatorId)
                        ? 'bg-white/15 dark:bg-neutral-200/70'
                        : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                    "
                  >
                    {{ creator.count }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        <section class="min-h-0 p-4 sm:p-5">
          <div class="space-y-4">
            <div class="flex items-center gap-3">
              <UInput
                v-model="modelSearchValue"
                class="w-full"
                icon="i-lucide-search"
                placeholder="Search models, ids, or creators"
              />
              <UBadge color="neutral" variant="soft" size="sm" class="shrink-0">
                {{ filteredModelCount }} models
              </UBadge>
            </div>

            <div v-if="isLoadingModels" class="px-2 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Loading models...
            </div>

            <template v-else>
              <div v-if="favoriteModelOptions.length > 0" class="space-y-2">
                <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                  Pinned quick picks
                </p>
                <div class="space-y-2">
                  <div
                    v-for="(model, index) in favoriteModelOptions"
                    :key="model.id"
                    class="rounded-[1.2rem] border border-neutral-200/80 bg-neutral-50/80 p-3 dark:border-neutral-800/80 dark:bg-neutral-900/70"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <button type="button" class="min-w-0 flex-1 text-left" @click="emit('select-model', model.id)">
                        <div class="flex flex-wrap items-center gap-2">
                          <p class="truncate text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                            {{ model.label }}
                          </p>
                          <UBadge color="neutral" variant="soft" size="sm">
                            {{ model.isFree ? "Free" : "Paid" }}
                          </UBadge>
                          <UBadge v-if="model.supportsTools" color="primary" variant="soft" size="sm">
                            Tools
                          </UBadge>
                        </div>
                        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                          {{ model.creatorLabel }} · {{ model.compactPricingLabel }}
                        </p>
                      </button>

                      <div class="flex items-center gap-1">
                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          icon="i-lucide-arrow-up"
                          class="rounded-full"
                          :disabled="index === 0"
                          @click="emit('move-favorite', { modelId: model.id, direction: -1 })"
                        />
                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          icon="i-lucide-arrow-down"
                          class="rounded-full"
                          :disabled="index === favoriteModelOptions.length - 1"
                          @click="emit('move-favorite', { modelId: model.id, direction: 1 })"
                        />
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
                          :disabled="!isModelSelectable(model)"
                          @click="emit('set-default', model.id)"
                        />
                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          :icon="isFavoriteModel(model.id) ? 'i-lucide-star' : 'i-lucide-star-off'"
                          class="rounded-full"
                          @click="emit('toggle-favorite', model.id)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                  All models
                </p>
                <div
                  v-if="filteredModelOptions.length === 0"
                  class="rounded-[1.5rem] border border-dashed border-neutral-300/80 bg-neutral-50/70 px-6 py-10 text-center text-sm text-neutral-500 dark:border-neutral-700/80 dark:bg-neutral-900/60 dark:text-neutral-400"
                >
                  No models match the current filters.
                </div>

                <div v-else class="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                  <div
                    v-for="model in filteredModelOptions"
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
                        :disabled="!isModelSelectable(model)"
                        @click="emit('select-model', model.id)"
                      >
                        <div class="flex flex-wrap items-center gap-2">
                          <p class="truncate text-sm font-semibold">
                            {{ model.label }}
                          </p>
                          <UBadge color="neutral" variant="soft" size="sm">
                            {{ model.isFree ? "Free" : "Paid" }}
                          </UBadge>
                          <UBadge v-if="model.supportsTools" color="primary" variant="soft" size="sm">
                            Tools
                          </UBadge>
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
                          class="mt-1 text-xs"
                          :class="
                            selectedModelId === model.id
                              ? 'text-white/70 dark:text-neutral-500'
                              : 'text-neutral-500 dark:text-neutral-400'
                          "
                        >
                          {{ model.creatorLabel }} · {{ model.description }}
                        </p>
                        <p
                          v-if="!isModelSelectable(model)"
                          class="mt-2 text-[11px] font-medium text-amber-500 dark:text-amber-300"
                        >
                          Credits required to select this paid model.
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
                          :disabled="!isModelSelectable(model)"
                          @click="emit('set-default', model.id)"
                        />
                        <UButton
                          color="neutral"
                          :variant="selectedModelId === model.id ? 'outline' : 'ghost'"
                          size="xs"
                          :icon="isFavoriteModel(model.id) ? 'i-lucide-star' : 'i-lucide-star-off'"
                          class="rounded-full"
                          @click="emit('toggle-favorite', model.id)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <UAlert
              v-if="accountStatusError"
              class="rounded-2xl"
              color="warning"
              variant="soft"
              icon="i-lucide-wallet-cards"
              title="Account status fallback"
              :description="accountStatusError"
            />

            <UAlert
              v-if="modelError"
              class="rounded-2xl"
              color="error"
              variant="soft"
              icon="i-lucide-alert-circle"
              title="Model catalog error"
              :description="modelError"
            />
          </div>
        </section>
      </div>
    </template>
  </UModal>
</template>
