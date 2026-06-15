<script setup lang="ts">
import { computed } from "vue";

import { dashboardEmptyPanelClass, dashboardLabelClass } from "~/utils/dashboard-ui";

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
      <div class="grid max-h-[70vh] gap-0 md:grid-cols-[17rem_minmax(0,1fr)]">
        <aside class="border-b border-default bg-elevated p-5 md:border-b-0 md:border-r">
          <div class="space-y-6">
            <div class="rounded-2xl border border-default bg-default p-5">
              <div>
                <p :class="dashboardLabelClass">Account balance</p>
                <div class="mt-2.5 flex items-baseline gap-1">
                  <p class="text-2xl font-bold tracking-tight text-highlighted">
                    {{ accountBalanceLabel }}
                  </p>
                </div>
                <p class="mt-1 text-[11px] leading-relaxed text-muted">
                  {{ accountUsageLabel }}
                </p>

                <div
                  v-if="availableCredits <= 0"
                  class="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[10px] leading-normal text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                >
                  <UIcon name="i-lucide-alert-triangle" class="mt-0.5 size-3 shrink-0" />
                  <span>Paid models disabled until credits are added.</span>
                </div>
              </div>
            </div>

            <!-- Filters Section -->
            <div class="space-y-3">
              <div class="flex items-center justify-between px-1">
                <p :class="dashboardLabelClass">Filters</p>
                <UButton
                  variant="link"
                  color="neutral"
                  size="xs"
                  class="px-0 py-0 text-[10px] font-bold uppercase tracking-[0.1em] opacity-60 transition hover:opacity-100"
                  @click="emit('reset-filters')"
                >
                  Reset
                </UButton>
              </div>

              <div class="space-y-1.5">
                <UButton
                  block
                  :variant="favoritesOnlyValue ? 'solid' : 'outline'"
                  color="neutral"
                  size="sm"
                  class="justify-between rounded-xl px-3"
                  :icon="favoritesOnlyValue ? 'i-lucide-star' : 'i-lucide-star'"
                  @click="favoritesOnlyValue = !favoritesOnlyValue"
                >
                  <span>Favorites only</span>
                </UButton>

                <div class="grid grid-cols-3 gap-1.5">
                  <UButton
                    v-for="filterOption in [
                      { value: 'all', label: 'All' },
                      { value: 'free', label: 'Free' },
                      { value: 'paid', label: 'Paid' },
                    ]"
                    :key="filterOption.value"
                    :variant="accessFilterValue === filterOption.value ? 'solid' : 'outline'"
                    color="neutral"
                    size="sm"
                    class="justify-center rounded-xl px-0"
                    @click="accessFilterValue = filterOption.value as 'all' | 'free' | 'paid'"
                  >
                    {{ filterOption.label }}
                  </UButton>
                </div>

                <UButton
                  block
                  :variant="toolsOnlyValue ? 'solid' : 'outline'"
                  color="neutral"
                  size="sm"
                  class="justify-between rounded-xl px-3"
                  icon="i-lucide-wrench"
                  @click="toolsOnlyValue = !toolsOnlyValue"
                >
                  <span>Tools enabled</span>
                </UButton>
              </div>
            </div>

            <!-- Creator Section -->
            <div class="space-y-3">
              <p
                class="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500"
              >
                Creators
              </p>
              <div
                class="max-h-96 space-y-1.5 overflow-y-scroll pr-1 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800"
              >
                <button
                  v-for="creator in creatorFilterOptions"
                  :key="creator.creatorId"
                  type="button"
                  class="group flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-medium transition-all"
                  :class="
                    selectedCreatorIds.includes(creator.creatorId)
                      ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                      : 'border-neutral-200/60 bg-white/50 text-neutral-600 hover:border-neutral-300 dark:border-neutral-800/60 dark:bg-neutral-900/50 dark:text-neutral-400 dark:hover:border-neutral-700'
                  "
                  @click="emit('toggle-creator', creator.creatorId)"
                >
                  <span class="truncate">{{ creator.creatorLabel }}</span>
                  <span
                    class="rounded-lg px-1.5 py-0.5 text-[9px] font-bold transition-colors"
                    :class="
                      selectedCreatorIds.includes(creator.creatorId)
                        ? 'bg-white/20 text-white dark:bg-black/10 dark:text-neutral-900'
                        : 'bg-neutral-100 text-neutral-400 group-hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:group-hover:bg-neutral-700'
                    "
                  >
                    {{ creator.count }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        <section class="min-h-0 bg-default p-4 sm:p-6">
          <div class="space-y-5">
            <div class="flex items-center gap-3">
              <UInput
                v-model="modelSearchValue"
                class="w-full"
                icon="i-lucide-search"
                placeholder="Search models, creators, or ids..."
                size="md"
                :ui="{
                  base: 'rounded-xl bg-white/80 dark:bg-neutral-900/80 border-neutral-200/60 dark:border-neutral-800/60 focus:ring-primary-500/20 transition-all',
                }"
              />
              <UBadge
                color="neutral"
                variant="soft"
                size="sm"
                class="shrink-0 rounded-lg font-bold tracking-tight"
              >
                {{ filteredModelCount }} models
              </UBadge>
            </div>

            <div
              v-if="isLoadingModels"
              class="flex flex-col items-center justify-center py-16 text-center"
            >
              <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-primary-500" />
              <p
                class="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500"
              >
                Syncing catalog
              </p>
            </div>

            <template v-else>
              <div v-if="favoriteModelOptions.length > 0" class="space-y-3">
                <div class="flex items-center gap-2 px-1">
                  <UIcon name="i-lucide-pin" class="size-3.5 text-primary-500" />
                  <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500"
                  >
                    Pinned quick picks
                  </p>
                </div>
                <div class="grid gap-2 sm:grid-cols-2">
                  <div
                    v-for="(model, index) in favoriteModelOptions"
                    :key="model.id"
                    class="group relative overflow-hidden rounded-[1.2rem] border border-neutral-200/80 bg-neutral-50/50 p-4 transition-all hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800/80 dark:bg-neutral-900/40 dark:hover:border-neutral-700 dark:hover:bg-neutral-900/60"
                  >
                    <div class="flex flex-col gap-3">
                      <div class="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          class="min-w-0 flex-1 text-left outline-none"
                          @click="emit('select-model', model.id)"
                        >
                          <div class="flex items-center gap-2">
                            <p
                              class="truncate text-[15px] font-bold tracking-tight text-neutral-950 dark:text-neutral-50"
                            >
                              {{ model.label }}
                            </p>
                            <UIcon
                              v-if="currentDefaultModelId === model.id"
                              name="i-lucide-check-circle"
                              class="size-3.5 shrink-0 text-primary-500"
                            />
                          </div>
                          <p
                            class="mt-0.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400"
                          >
                            {{ model.creatorLabel }}
                          </p>
                        </button>

                        <div
                          class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
                        >
                          <UButton
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            icon="i-lucide-chevron-up"
                            class="rounded-lg"
                            :disabled="index === 0"
                            @click="
                              emit('move-favorite', {
                                modelId: model.id,
                                direction: -1,
                              })
                            "
                          />
                          <UButton
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            icon="i-lucide-chevron-down"
                            class="rounded-lg"
                            :disabled="index === favoriteModelOptions.length - 1"
                            @click="
                              emit('move-favorite', {
                                modelId: model.id,
                                direction: 1,
                              })
                            "
                          />
                        </div>
                      </div>

                      <div class="flex flex-wrap items-center gap-1.5">
                        <UBadge
                          :color="model.isFree ? 'neutral' : 'primary'"
                          variant="soft"
                          size="sm"
                          class="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        >
                          {{ model.isFree ? "Free" : "Paid" }}
                        </UBadge>
                        <UBadge
                          v-if="model.supportsTools"
                          color="neutral"
                          variant="outline"
                          size="sm"
                          class="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border-neutral-200 dark:border-neutral-800"
                        >
                          <UIcon name="i-lucide-wrench" class="mr-1 size-3" />
                          Tools
                        </UBadge>
                        <span
                          class="text-[10px] font-medium text-neutral-400 dark:text-neutral-500"
                        >
                          {{ model.compactPricingLabel }}
                        </span>
                      </div>

                      <div
                        class="flex items-center justify-end gap-1 border-t border-neutral-200/60 pt-2 dark:border-neutral-800/60"
                      >
                        <UButton
                          :color="currentDefaultModelId === model.id ? 'primary' : 'neutral'"
                          variant="ghost"
                          size="xs"
                          :label="currentDefaultModelId === model.id ? 'Default' : 'Set default'"
                          :icon="
                            currentDefaultModelId === model.id
                              ? 'i-lucide-check-circle'
                              : 'i-lucide-circle'
                          "
                          class="rounded-lg text-[10px] font-bold uppercase tracking-wider"
                          :disabled="!isModelSelectable(model)"
                          @click="emit('set-default', model.id)"
                        />
                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          icon="i-lucide-star-off"
                          class="rounded-lg"
                          @click="emit('toggle-favorite', model.id)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-3">
                <p
                  class="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500"
                >
                  All available models
                </p>
                <div v-if="filteredModelOptions.length === 0" :class="dashboardEmptyPanelClass">
                  <div class="flex size-12 items-center justify-center rounded-2xl bg-elevated">
                    <UIcon name="i-lucide-search-x" class="size-6 text-muted" />
                  </div>
                  <p class="mt-4 text-sm font-bold text-highlighted">No models found</p>
                  <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Try adjusting your filters or search terms.
                  </p>
                  <UButton
                    variant="link"
                    color="primary"
                    size="xs"
                    class="mt-4 font-bold uppercase tracking-wider"
                    @click="emit('reset-filters')"
                  >
                    Clear all filters
                  </UButton>
                </div>

                <div
                  v-else
                  class="max-h-[50vh] space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800"
                >
                  <div
                    v-for="model in filteredModelOptions"
                    :key="model.id"
                    class="group relative rounded-[1.2rem] border p-3.5 transition-all"
                    :class="
                      selectedModelId === model.id
                        ? 'border-primary-500/50 bg-primary-50/30 ring-1 ring-primary-500/20 dark:border-primary-400/50 dark:bg-primary-950/20'
                        : 'border-neutral-200/60 bg-white/50 hover:border-neutral-300 hover:bg-white dark:border-neutral-800/60 dark:bg-neutral-900/40 dark:hover:border-neutral-700 dark:hover:bg-neutral-900/60'
                    "
                  >
                    <div class="flex items-start justify-between gap-4">
                      <button
                        type="button"
                        class="min-w-0 flex-1 text-left outline-none"
                        :disabled="!isModelSelectable(model)"
                        @click="emit('select-model', model.id)"
                      >
                        <div class="flex flex-wrap items-center gap-2">
                          <p
                            class="truncate text-sm font-bold tracking-tight"
                            :class="
                              selectedModelId === model.id
                                ? 'text-primary-700 dark:text-primary-300'
                                : 'text-neutral-950 dark:text-neutral-50'
                            "
                          >
                            {{ model.label }}
                          </p>
                          <UBadge
                            v-if="currentDefaultModelId === model.id"
                            color="primary"
                            variant="subtle"
                            size="sm"
                            class="rounded-md px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider"
                          >
                            Default
                          </UBadge>
                          <UBadge
                            :color="model.isFree ? 'neutral' : 'primary'"
                            variant="soft"
                            size="sm"
                            class="rounded-md px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider"
                          >
                            {{ model.isFree ? "Free" : "Paid" }}
                          </UBadge>
                          <UIcon
                            v-if="model.supportsTools"
                            name="i-lucide-wrench"
                            class="size-3 text-neutral-400 dark:text-neutral-500"
                          />
                        </div>
                        <p
                          class="mt-1 line-clamp-1 text-[11px] leading-relaxed"
                          :class="
                            selectedModelId === model.id
                              ? 'text-primary-600/80 dark:text-primary-400/80'
                              : 'text-neutral-500 dark:text-neutral-400'
                          "
                        >
                          {{ model.creatorLabel }} ·
                          {{ model.description }}
                        </p>
                        <p
                          v-if="!isModelSelectable(model)"
                          class="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400"
                        >
                          <UIcon name="i-lucide-lock" class="size-3" />
                          Credits required
                        </p>
                      </button>

                      <div
                        class="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
                      >
                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          :icon="
                            currentDefaultModelId === model.id
                              ? 'i-lucide-badge-check'
                              : 'i-lucide-circle'
                          "
                          class="rounded-lg"
                          :disabled="!isModelSelectable(model)"
                          @click="emit('set-default', model.id)"
                        />
                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          :icon="isFavoriteModel(model.id) ? 'i-lucide-star' : 'i-lucide-star'"
                          :class="[
                            'rounded-lg',
                            isFavoriteModel(model.id) ? 'text-amber-500' : 'text-neutral-400',
                          ]"
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
