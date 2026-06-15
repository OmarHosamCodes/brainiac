<script setup lang="ts">
import {
  WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT,
  type WorkspaceNodeDashboardFeaturedBlock,
  type WorkspaceNodeDashboardSelectableBlock,
  type WorkspaceNodeTint,
  type WorkspaceNodeType,
} from "@brainiac/workspace";

import {
  shellFocusRingClass,
  shellLabelClass,
  shellSegmentTabActiveClass,
  shellSegmentTabClass,
} from "~/utils/app-shell-ui";
import { getWorkspaceBlockRegistryEntry } from "~/utils/workspace-block-registry";
import {
  getWorkspaceNodeTintOption,
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

const submitAttempted = ref(false);

const modalTitle = computed(() => (props.mode === "create" ? "Create node" : "Edit node"));
const modalDescription = computed(() =>
  props.mode === "create"
    ? "Name the node and set how it appears on the canvas."
    : "Update the node and choose what shows on its dashboard card.",
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
const submitIcon = computed(() => (props.mode === "create" ? "i-lucide-plus" : "i-lucide-save"));
const titleFieldError = computed(() => {
  if (!submitAttempted.value || props.valid || props.title.trim()) {
    return undefined;
  }

  return "Title is required";
});
const nodeTypeDescription = computed(() => {
  if (props.nodeType === "orchestrator") {
    return "Coordinates linked nodes on the canvas.";
  }

  return "Standalone node for focused work.";
});
const selectedTintMeta = computed(() => getWorkspaceNodeTintOption(props.tint));

const nodeTypeOptions: Array<{ value: WorkspaceNodeType; label: string }> = [
  { value: "standard", label: "Standard" },
  { value: "orchestrator", label: "Orchestrator" },
];

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      submitAttempted.value = false;
    }
  },
);

function handleOpenChange(isOpen: boolean) {
  if (!isOpen) {
    emit("close");
  }
}

function handleSubmitClick() {
  submitAttempted.value = true;

  if (props.valid) {
    emit("submit");
  }
}

function isFeaturedBlockSelected(option: WorkspaceNodeDashboardSelectableBlock) {
  return selectedBlockKeys.value.has(`${option.tabId}:${option.blockId}`);
}

function isFeaturedBlockDisabled(option: WorkspaceNodeDashboardSelectableBlock) {
  return selectionLimitReached.value && !isFeaturedBlockSelected(option);
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
      content: 'sm:max-w-3xl rounded-[28px] overflow-hidden',
      body: 'space-y-6 p-6',
      footer: 'flex items-center justify-end gap-3 border-t border-muted/20 bg-elevated/20 p-4',
    }"
    @update:open="handleOpenChange"
  >
    <template #body>
      <div
        :class="
          props.mode === 'edit'
            ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]'
            : 'space-y-6'
        "
      >
        <div class="space-y-6">
          <section class="space-y-6">
            <UFormField label="Title" name="title" required :error="titleFieldError">
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
          </section>

          <section class="space-y-3">
            <div>
              <p class="text-sm font-semibold text-highlighted">Node type</p>
              <p class="mt-1 text-sm text-muted">
                Standard for focused work, or orchestrator to coordinate linked nodes.
              </p>
            </div>

            <div
              class="inline-flex max-w-full flex-wrap gap-1 rounded-full border border-muted/60 bg-elevated/40 p-0.5"
              role="radiogroup"
              aria-label="Node type"
            >
              <button
                v-for="option in nodeTypeOptions"
                :key="option.value"
                type="button"
                role="radio"
                :aria-checked="props.nodeType === option.value"
                :class="[
                  shellSegmentTabClass,
                  shellFocusRingClass,
                  props.nodeType === option.value ? shellSegmentTabActiveClass : '',
                ]"
                @click="emit('update:node-type', option.value)"
              >
                {{ option.label }}
              </button>
            </div>

            <p class="text-sm text-muted">{{ nodeTypeDescription }}</p>
          </section>

          <section class="space-y-3">
            <div>
              <p class="text-sm font-semibold text-highlighted">Tint</p>
              <p class="mt-1 text-sm text-muted">Color accent for this node on the canvas.</p>
            </div>

            <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Node tint">
              <button
                v-for="option in workspaceNodeTintOptions"
                :key="option.value"
                type="button"
                role="radio"
                :aria-checked="props.tint === option.value"
                :aria-label="option.label"
                :title="option.label"
                class="node-tint-option relative flex size-11 items-center justify-center rounded-full border transition-colors"
                :class="[
                  shellFocusRingClass,
                  props.tint === option.value
                    ? 'border-primary/50 ring-2 ring-primary/40 bg-default'
                    : 'border-muted/60 bg-elevated/40 hover:border-muted hover:bg-elevated/70',
                ]"
                :style="getTintOptionStyle(option.value)"
                @click="emit('update:tint', option.value)"
              >
                <span class="node-tint-swatch size-4 rounded-full border" />
                <UIcon
                  v-if="props.tint === option.value"
                  name="i-lucide-check"
                  class="absolute size-3.5 text-highlighted"
                />
              </button>
            </div>

            <p class="text-sm text-muted">
              {{ selectedTintMeta.label }} — {{ selectedTintMeta.description }}
            </p>
          </section>
        </div>

        <div
          v-if="props.mode === 'edit'"
          class="rounded-2xl border border-muted/30 bg-elevated/20 p-4"
        >
          <div class="space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-highlighted">Dashboard card</p>
                <p class="mt-1 text-sm text-muted">
                  Choose up to {{ WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT }} block summaries to show
                  on this node's dashboard card.
                </p>
              </div>
              <UBadge color="neutral" variant="soft" size="sm" class="shrink-0">
                {{ selectionBadgeLabel }}
              </UBadge>
            </div>

            <p
              v-if="selectionLimitReached && groupedBlockOptions.length > 0"
              class="text-sm text-muted"
            >
              Limit reached. Deselect a block to choose another.
            </p>
          </div>

          <div class="mt-4">
            <UAlert
              v-if="groupedBlockOptions.length === 0"
              color="neutral"
              variant="soft"
              icon="i-lucide-blocks"
              title="No blocks available yet"
              description="Add blocks inside the node first, then return here to feature them on the card."
            />

            <template v-else>
              <div class="max-h-[24rem] space-y-4 overflow-y-auto overscroll-contain pr-1">
                <section v-for="group in groupedBlockOptions" :key="group.tabId">
                  <p :class="['mb-2', shellLabelClass]">
                    {{ group.tabTitle }}
                  </p>

                  <div class="grid gap-1.5">
                    <button
                      v-for="option in group.options"
                      :key="option.blockId"
                      type="button"
                      class="flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors"
                      :class="[
                        shellFocusRingClass,
                        isFeaturedBlockSelected(option)
                          ? 'border-primary/40 bg-primary/10'
                          : isFeaturedBlockDisabled(option)
                            ? 'cursor-not-allowed border-muted/40 bg-elevated/20 opacity-60'
                            : 'border-muted/60 bg-default/80 hover:border-primary/30 hover:bg-default',
                      ]"
                      :aria-pressed="isFeaturedBlockSelected(option)"
                      :aria-disabled="isFeaturedBlockDisabled(option)"
                      :disabled="isFeaturedBlockDisabled(option)"
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

    <template #footer>
      <UButton color="neutral" variant="ghost" @click="emit('close')">Cancel</UButton>
      <UButton
        :disabled="!props.valid"
        :icon="submitIcon"
        :title="!props.valid ? 'Enter a title to continue' : undefined"
        @click="handleSubmitClick"
      >
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
