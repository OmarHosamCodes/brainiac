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
    ? "Set the node title, summary, and board identity before it lands on the workspace."
    : "Refine the node identity and choose which block summaries appear on the dashboard card.",
);
const draftTitle = computed(() =>
  props.title.trim().length > 0
    ? props.title.trim()
    : props.mode === "create"
      ? "Untitled draft"
      : "Untitled node",
);
const draftSummary = computed(() =>
  props.content.trim().length > 0
    ? props.content.trim()
    : "No summary yet. Add a short description for the workspace card.",
);
const nodeTypeLabel = computed(() =>
  props.nodeType === "orchestrator" ? "Orchestrator" : "Standard",
);
const nodeTypeDescription = computed(() =>
  props.nodeType === "orchestrator"
    ? "Can connect to standard nodes and coordinate work across the workspace."
    : "A regular workspace node with no graph links or orchestration layer.",
);
const selectedBlockKeys = computed(
  () => new Set(props.featuredBlocks.map((entry) => `${entry.tabId}:${entry.blockId}`)),
);
const selectedCount = computed(() => props.featuredBlocks.length);
const selectionLimitReached = computed(
  () => selectedCount.value >= WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT,
);
const selectionBadgeLabel = computed(() => {
  if (props.mode === "create") {
    return "Unlocks after creation";
  }

  if (props.availableBlocks.length === 0) {
    return "No blocks yet";
  }

  return `${selectedCount.value}/${WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT} selected`;
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
      content: 'sm:max-w-5xl rounded-[28px] overflow-hidden',
      body: 'space-y-6 p-6',
      footer: 'flex items-center justify-end gap-3 border-t border-muted/20 bg-elevated/20 p-4',
    }"
    @update:open="handleOpenChange"
  >
    <template #body>
      <div
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-muted/30 bg-elevated/20 p-4"
      >
        <div class="min-w-0">
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted">Workspace Node</p>
          <h3 class="mt-1 truncate text-lg font-semibold text-highlighted">
            {{ draftTitle }}
          </h3>
          <p class="mt-1 text-xs text-muted">
            {{ nodeTypeDescription }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UBadge color="neutral" variant="soft" size="sm">
            {{ props.mode === "create" ? "New Draft" : "Editing" }}
          </UBadge>
          <UBadge color="neutral" variant="soft" size="sm">
            {{ nodeTypeLabel }}
          </UBadge>
          <UBadge color="neutral" variant="soft" size="sm">
            {{ selectionBadgeLabel }}
          </UBadge>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div class="space-y-6">
          <div class="rounded-2xl border border-muted/30 bg-default/60 p-4">
            <p class="text-sm font-semibold text-highlighted">Node Details</p>
            <p class="mt-1 text-sm text-muted">
              Set the title and summary that identify this node across the board and its card
              preview.
            </p>

            <div class="mt-4 space-y-4">
              <UFormField label="Title" name="title" required>
                <UInput
                  :model-value="props.title"
                  placeholder="Strategy lane"
                  autofocus
                  @update:model-value="emit('update:title', $event ?? '')"
                />
              </UFormField>

              <UFormField
                label="Summary"
                name="content"
                description="Optional board preview text that sits above the featured block details."
              >
                <UTextarea
                  :model-value="props.content"
                  :rows="6"
                  autoresize
                  placeholder="Add a short summary for the canvas card."
                  @update:model-value="emit('update:content', $event ?? '')"
                />
              </UFormField>
            </div>
          </div>

          <div class="rounded-2xl border border-muted/30 bg-default/60 p-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-highlighted">Node Type</p>
                <p class="mt-1 text-sm text-muted">
                  Choose whether this node stands alone or orchestrates work across connected nodes.
                </p>
              </div>

              <UBadge color="neutral" variant="soft" size="sm">
                {{ nodeTypeLabel }}
              </UBadge>
            </div>

            <div class="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                class="rounded-2xl border p-3 text-left transition"
                :class="
                  props.nodeType === 'standard'
                    ? 'border-primary/40 bg-default'
                    : 'border-muted/60 bg-elevated/40 hover:border-muted hover:bg-elevated/70'
                "
                @click="emit('update:node-type', 'standard')"
              >
                <p class="text-sm font-medium text-highlighted">Standard</p>
                <p class="mt-1 text-xs text-muted">Regular workspace node with no graph links.</p>
              </button>

              <button
                type="button"
                class="rounded-2xl border p-3 text-left transition"
                :class="
                  props.nodeType === 'orchestrator'
                    ? 'border-primary/40 bg-default'
                    : 'border-muted/60 bg-elevated/40 hover:border-muted hover:bg-elevated/70'
                "
                @click="emit('update:node-type', 'orchestrator')"
              >
                <p class="text-sm font-medium text-highlighted">Orchestrator</p>
                <p class="mt-1 text-xs text-muted">
                  Can connect to standard nodes and aggregate cross-node tasks.
                </p>
              </button>
            </div>
          </div>

          <div class="rounded-2xl border border-muted/30 bg-default/60 p-4">
            <p class="text-sm font-semibold text-highlighted">Node Tint</p>
            <p class="mt-1 text-sm text-muted">
              Give the node a visual identity on the canvas without changing its structure.
            </p>

            <div class="mt-4 flex flex-wrap gap-3">
              <button
                v-for="option in workspaceNodeTintOptions"
                :key="option.value"
                type="button"
                class="node-tint-option relative flex size-11 items-center justify-center rounded-full border transition"
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
                <span class="node-tint-swatch size-5 rounded-full border" />
                <UIcon
                  v-if="props.tint === option.value"
                  name="i-lucide-check"
                  class="absolute size-4 text-highlighted"
                />
                <span class="sr-only">{{ option.label }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-muted/30 bg-default/60 p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-highlighted">Featured Block Details</p>
              <p class="mt-1 text-sm text-muted">
                Choose which blocks surface structured summaries on the dashboard card.
              </p>
            </div>

            <UBadge color="neutral" variant="soft" size="sm">
              {{ selectionBadgeLabel }}
            </UBadge>
          </div>

          <div class="mt-4 space-y-4">
            <UAlert
              v-if="props.mode === 'create'"
              color="neutral"
              variant="soft"
              icon="i-lucide-layout-template"
              title="Featured details unlock after creation"
              description="Create the node first, add blocks inside the node page, then return here to choose which blocks should be summarized on the dashboard."
            />

            <UAlert
              v-else-if="groupedBlockOptions.length === 0"
              color="neutral"
              variant="soft"
              icon="i-lucide-blocks"
              title="No blocks available yet"
              description="Open the node, add blocks to one of its tabs, then choose the ones that should appear on the dashboard card."
            />

            <template v-else>
              <UAlert
                color="primary"
                variant="soft"
                icon="i-lucide-sparkles"
                title="Structured summaries"
                description="Task lists show progress, kanban boards show card counts, scorecards show target coverage, and other block types are summarized automatically."
              />

              <UAlert
                v-if="selectionLimitReached"
                color="neutral"
                variant="soft"
                icon="i-lucide-check-check"
                :title="`Selection limit reached (${WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT})`"
                description="Deselect one of the current blocks if you want to feature a different summary."
              />

              <div class="max-h-[28rem] space-y-4 overflow-y-auto pr-1">
                <section
                  v-for="group in groupedBlockOptions"
                  :key="group.tabId"
                  class="space-y-3 rounded-2xl border border-muted/30 bg-elevated/20 p-3"
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                      {{ group.tabTitle }}
                    </p>
                    <UBadge color="neutral" variant="subtle" size="sm">
                      {{ group.options.length }} blocks
                    </UBadge>
                  </div>

                  <div class="grid gap-2 xl:grid-cols-2">
                    <button
                      v-for="option in group.options"
                      :key="option.blockId"
                      type="button"
                      class="block-option rounded-2xl border p-3 text-left transition"
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
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <div class="flex items-center gap-2">
                            <UIcon
                              :name="getWorkspaceBlockRegistryEntry(option.blockType).icon"
                              class="size-4 shrink-0 text-highlighted"
                            />
                            <p class="truncate text-sm font-medium text-highlighted">
                              {{ option.blockTitle }}
                            </p>
                          </div>
                          <p class="mt-1 text-xs text-muted">
                            {{ getWorkspaceBlockRegistryEntry(option.blockType).label }}
                          </p>
                        </div>

                        <span
                          class="rounded-full border px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide"
                          :class="
                            isFeaturedBlockSelected(option)
                              ? 'border-primary/40 bg-primary/10 text-primary'
                              : 'border-muted/60 bg-default/80 text-muted'
                          "
                        >
                          {{ isFeaturedBlockSelected(option) ? "Shown" : "Hidden" }}
                        </span>
                      </div>
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
