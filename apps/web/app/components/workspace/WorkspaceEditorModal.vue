<script setup lang="ts">
import {
  WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT,
  type WorkspaceNodeDashboardFeaturedBlock,
  type WorkspaceNodeDashboardSelectableBlock,
  type WorkspaceNodeTint,
  type WorkspaceNodeType,
} from "@brainiac/workspace";

import { getWorkspaceBlockRegistryEntry } from "~/utils/workspace-block-registry";
import {
  getWorkspaceNodeTintStyle,
  workspaceNodeTintOptions,
} from "~/utils/workspace-node-dashboard";

const props = defineProps<{
  availableBlocks: WorkspaceNodeDashboardSelectableBlock[];
  content: string;
  featuredBlocks: WorkspaceNodeDashboardFeaturedBlock[];
  mode: "create" | "edit";
  nodeType: WorkspaceNodeType;
  open: boolean;
  tint: WorkspaceNodeTint;
  title: string;
  valid: boolean;
}>();

const emit = defineEmits<{
  close: [];
  submit: [];
  "update:featured-blocks": [value: WorkspaceNodeDashboardFeaturedBlock[]];
  "update:content": [value: string];
  "update:node-type": [value: WorkspaceNodeType];
  "update:tint": [value: WorkspaceNodeTint];
  "update:title": [value: string];
}>();

const modalTitle = computed(() => (props.mode === "create" ? "Create node" : "Edit node"));
const modalDescription = computed(() =>
  props.mode === "create"
    ? "Set the title, summary, and visual identity for the new workspace node."
    : "Refine the node identity and choose which block summaries appear on the dashboard card.",
);
const selectedBlockKeys = computed(
  () => new Set(props.featuredBlocks.map((entry) => `${entry.tabId}:${entry.blockId}`)),
);
const selectedCount = computed(() => props.featuredBlocks.length);
const selectionLimitReached = computed(
  () => selectedCount.value >= WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT,
);
const selectionBadgeLabel = computed(() => {
  if (props.availableBlocks.length === 0) {
    return "No blocks";
  }

  return `${selectedCount.value}/${WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT}`;
});
const groupedBlockOptions = computed(() => {
  const groups: Array<{
    tabId: string;
    tabTitle: string;
    options: WorkspaceNodeDashboardSelectableBlock[];
  }> = [];

  for (const option of props.availableBlocks) {
    const existingGroup = groups.find((entry) => entry.tabId === option.tabId);

    if (existingGroup) {
      existingGroup.options.push(option);
      continue;
    }

    groups.push({
      tabId: option.tabId,
      tabTitle: option.tabTitle,
      options: [option],
    });
  }

  return groups;
});
const submitLabel = computed(() => (props.mode === "create" ? "Create node" : "Save changes"));

function handleOpenChange(isOpen: boolean) {
  if (!isOpen) {
    emit("close");
  }
}

function isFeaturedBlockSelected(option: WorkspaceNodeDashboardSelectableBlock) {
  return selectedBlockKeys.value.has(`${option.tabId}:${option.blockId}`);
}

function toggleFeaturedBlock(option: WorkspaceNodeDashboardSelectableBlock) {
  const isSelected = isFeaturedBlockSelected(option);

  if (isSelected) {
    emit(
      "update:featured-blocks",
      props.featuredBlocks.filter(
        (entry) => !(entry.tabId === option.tabId && entry.blockId === option.blockId),
      ),
    );
    return;
  }

  if (selectionLimitReached.value) {
    return;
  }

  emit("update:featured-blocks", [
    ...props.featuredBlocks,
    {
      tabId: option.tabId,
      blockId: option.blockId,
    },
  ]);
}

function getTintOptionStyle(value: WorkspaceNodeTint) {
  return getWorkspaceNodeTintStyle(value);
}
</script>

<template>
  <UModal
    :open="props.open"
    :title="modalTitle"
    :description="modalDescription"
    :ui="{
      content: `rounded-[28px] overflow-hidden ${props.mode === 'create' ? 'sm:max-w-2xl' : 'sm:max-w-3xl'}`,
      body: 'space-y-5 p-5',
      footer: 'flex items-center justify-end gap-3 border-t border-muted/20 bg-elevated/20 p-4',
    }"
    @update:open="handleOpenChange"
  >
    <template #body>
      <template v-if="props.mode === 'create'">
        <div class="space-y-5">
          <UFormField label="Title" name="title" required>
            <UInput
              :model-value="props.title"
              placeholder="Strategy lane"
              autofocus
              @update:model-value="emit('update:title', $event ?? '')"
            />
          </UFormField>

          <UFormField label="Summary" name="content">
            <UTextarea
              :model-value="props.content"
              :rows="3"
              autoresize
              placeholder="Add a short summary for the canvas card."
              @update:model-value="emit('update:content', $event ?? '')"
            />
          </UFormField>

          <hr class="border-muted/20" />

          <div>
            <p class="mb-2 text-sm font-semibold text-highlighted">Node Type</p>
            <div
              class="flex overflow-hidden rounded-full border border-muted/60 bg-elevated/40 p-0.5"
            >
              <button
                type="button"
                class="rounded-full px-3 py-1 text-xs font-semibold transition"
                :class="
                  props.nodeType === 'standard'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-highlighted'
                "
                @click="emit('update:node-type', 'standard')"
              >
                Standard
              </button>
              <button
                type="button"
                class="rounded-full px-3 py-1 text-xs font-semibold transition"
                :class="
                  props.nodeType === 'orchestrator'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-highlighted'
                "
                @click="emit('update:node-type', 'orchestrator')"
              >
                Orchestrator
              </button>
            </div>
          </div>

          <hr class="border-muted/20" />

          <div>
            <p class="mb-2 text-sm font-semibold text-highlighted">Tint</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="option in workspaceNodeTintOptions"
                :key="option.value"
                type="button"
                class="node-tint-option relative flex size-9 items-center justify-center rounded-full border transition"
                :class="
                  props.tint === option.value
                    ? 'border-primary/60 bg-default shadow-sm'
                    : 'border-muted/60 bg-elevated/40 hover:border-muted hover:bg-elevated/70'
                "
                :style="getTintOptionStyle(option.value)"
                :aria-label="option.label"
                :title="option.label"
                @click="emit('update:tint', option.value)"
              >
                <span class="node-tint-swatch size-4 rounded-full border" />
                <UIcon
                  v-if="props.tint === option.value"
                  name="i-lucide-check"
                  class="absolute size-3.5 text-highlighted"
                />
                <span class="sr-only">{{ option.label }}</span>
              </button>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="grid gap-5 sm:grid-cols-[1fr_1.2fr]">
          <div class="space-y-5">
            <UFormField label="Title" name="title" required>
              <UInput
                :model-value="props.title"
                placeholder="Strategy lane"
                autofocus
                @update:model-value="emit('update:title', $event ?? '')"
              />
            </UFormField>

            <UFormField label="Summary" name="content">
              <UTextarea
                :model-value="props.content"
                :rows="3"
                autoresize
                placeholder="Add a short summary for the canvas card."
                @update:model-value="emit('update:content', $event ?? '')"
              />
            </UFormField>

            <hr class="border-muted/20" />

            <div>
              <p class="mb-2 text-sm font-semibold text-highlighted">Node Type</p>
              <div
                class="flex overflow-hidden rounded-full border border-muted/60 bg-elevated/40 p-0.5"
              >
                <button
                  type="button"
                  class="rounded-full px-3 py-1 text-xs font-semibold transition"
                  :class="
                    props.nodeType === 'standard'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted hover:text-highlighted'
                  "
                  @click="emit('update:node-type', 'standard')"
                >
                  Standard
                </button>
                <button
                  type="button"
                  class="rounded-full px-3 py-1 text-xs font-semibold transition"
                  :class="
                    props.nodeType === 'orchestrator'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted hover:text-highlighted'
                  "
                  @click="emit('update:node-type', 'orchestrator')"
                >
                  Orchestrator
                </button>
              </div>
            </div>

            <hr class="border-muted/20" />

            <div>
              <p class="mb-2 text-sm font-semibold text-highlighted">Tint</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="option in workspaceNodeTintOptions"
                  :key="option.value"
                  type="button"
                  class="node-tint-option relative flex size-9 items-center justify-center rounded-full border transition"
                  :class="
                    props.tint === option.value
                      ? 'border-primary/60 bg-default shadow-sm'
                      : 'border-muted/60 bg-elevated/40 hover:border-muted hover:bg-elevated/70'
                  "
                  :style="getTintOptionStyle(option.value)"
                  :aria-label="option.label"
                  :title="option.label"
                  @click="emit('update:tint', option.value)"
                >
                  <span class="node-tint-swatch size-4 rounded-full border" />
                  <UIcon
                    v-if="props.tint === option.value"
                    name="i-lucide-check"
                    class="absolute size-3.5 text-highlighted"
                  />
                  <span class="sr-only">{{ option.label }}</span>
                </button>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-muted/30 bg-elevated/20 p-4">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-highlighted">Featured Block Details</p>
              <UBadge color="neutral" variant="soft" size="sm">
                {{ selectionBadgeLabel }}
              </UBadge>
            </div>

            <div class="mt-4">
              <UAlert
                v-if="groupedBlockOptions.length === 0"
                color="neutral"
                variant="soft"
                icon="i-lucide-blocks"
                title="No blocks available yet"
                description="Open the node, add blocks to one of its tabs, then choose the ones that should appear on the dashboard card."
              />

              <template v-else>
                <div class="max-h-[24rem] space-y-3 overflow-y-auto pr-1">
                  <section v-for="group in groupedBlockOptions" :key="group.tabId">
                    <p class="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted">
                      {{ group.tabTitle }}
                    </p>

                    <div class="grid gap-1.5">
                      <button
                        v-for="option in group.options"
                        :key="option.blockId"
                        type="button"
                        class="flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition"
                        :class="
                          isFeaturedBlockSelected(option)
                            ? 'border-primary/40 bg-primary/10'
                            : selectionLimitReached
                              ? 'border-muted/40 bg-elevated/20 opacity-60'
                              : 'border-muted/60 bg-default/80 hover:border-primary/30 hover:bg-default'
                        "
                        :disabled="selectionLimitReached && !isFeaturedBlockSelected(option)"
                        @click="toggleFeaturedBlock(option)"
                      >
                        <UIcon
                          :name="getWorkspaceBlockRegistryEntry(option.blockType).icon"
                          class="size-4 shrink-0"
                          :class="isFeaturedBlockSelected(option) ? 'text-primary' : 'text-muted'"
                        />
                        <span class="min-w-0 flex-1 truncate text-sm font-medium text-highlighted">
                          {{ option.blockTitle }}
                        </span>
                        <UIcon
                          v-if="isFeaturedBlockSelected(option)"
                          name="i-lucide-check"
                          class="size-4 shrink-0 text-primary"
                        />
                      </button>
                    </div>
                  </section>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" @click="emit('close')">Cancel</UButton>
      <UButton :disabled="!props.valid" icon="i-lucide-save" @click="emit('submit')">
        {{ submitLabel }}
      </UButton>
    </template>
  </UModal>
</template>

<style scoped>
.node-tint-option {
  --workspace-node-rgb: 148 163 184;
}

.node-tint-swatch {
  background-color: rgb(var(--workspace-node-rgb) / 0.35);
  border-color: rgb(var(--workspace-node-rgb) / 0.45);
  box-shadow: 0 0 0 6px rgb(var(--workspace-node-rgb) / 0.12);
}
</style>
