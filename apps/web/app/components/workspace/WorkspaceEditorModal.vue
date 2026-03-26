<script setup lang="ts">
import {
  WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT,
  type WorkspaceNodeDashboardFeaturedBlock,
  type WorkspaceNodeDashboardSelectableBlock,
  type WorkspaceNodeTint,
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
  "update:tint": [value: WorkspaceNodeTint];
  "update:title": [value: string];
}>();

const modalTitle = computed(() => (props.mode === "create" ? "Create node" : "Edit node"));
const modalDescription = computed(() =>
  props.mode === "create"
    ? "Create the node title, summary, and tint. Featured block details can be configured after the node has blocks."
    : "Tune the node card with a tint and choose which block summaries surface on the dashboard.",
);
const selectedBlockKeys = computed(
  () => new Set(props.featuredBlocks.map((entry) => `${entry.tabId}:${entry.blockId}`)),
);
const selectedCount = computed(() => props.featuredBlocks.length);
const selectionLimitReached = computed(
  () => selectedCount.value >= WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT,
);
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
    :open="open"
    :title="modalTitle"
    :description="modalDescription"
    :ui="{
      content: 'sm:max-w-5xl',
      body: 'space-y-6',
      footer: 'flex items-center justify-end gap-3',
    }"
    @update:open="handleOpenChange"
  >
    <template #body>
      <div class="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div class="space-y-5">
          <UFormField label="Title" name="title" required>
            <UInput
              :model-value="title"
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
              :model-value="content"
              :rows="6"
              autoresize
              placeholder="Add a short summary for the canvas card."
              @update:model-value="emit('update:content', $event ?? '')"
            />
          </UFormField>

          <div class="space-y-3">
            <div>
              <p class="text-sm font-medium text-highlighted">Node tint</p>
              <p class="mt-1 text-sm text-muted">
                Give the node a visual identity on the canvas without changing its structure.
              </p>
            </div>

            <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <button
                v-for="option in workspaceNodeTintOptions"
                :key="option.value"
                type="button"
                class="node-tint-option rounded-2xl border p-3 text-left transition"
                :class="
                  tint === option.value
                    ? 'border-primary/40 bg-default'
                    : 'border-muted/60 bg-elevated/40 hover:border-muted hover:bg-elevated/70'
                "
                :style="getTintOptionStyle(option.value)"
                @click="emit('update:tint', option.value)"
              >
                <div class="flex items-center gap-3">
                  <span class="node-tint-swatch size-3 rounded-full border" />
                  <div>
                    <p class="text-sm font-medium text-highlighted">{{ option.label }}</p>
                    <p class="text-xs text-muted">{{ option.description }}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div class="space-y-4 rounded-[28px] border border-muted/60 bg-elevated/20 p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-sm font-medium text-highlighted">Featured block details</p>
              <p class="mt-1 text-sm text-muted">
                Select the blocks that should render structured summaries on the dashboard card.
              </p>
            </div>

            <UBadge color="neutral" variant="soft" size="sm">
              {{ selectedCount }}/{{ WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT }} selected
            </UBadge>
          </div>

          <UAlert
            v-if="mode === 'create'"
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

          <div v-else class="space-y-4">
            <UAlert
              color="primary"
              variant="soft"
              icon="i-lucide-sparkles"
              title="Structured summaries"
              description="Task lists show progress, kanban boards show card counts, scorecards show target coverage, and other block types are summarized automatically."
            />

            <div class="max-h-[25rem] space-y-4 overflow-y-auto pr-1">
              <section
                v-for="group in groupedBlockOptions"
                :key="group.tabId"
                class="space-y-3 rounded-2xl border border-muted/60 bg-default/70 p-3"
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
                          : 'border-muted/60 bg-elevated/25 hover:border-primary/30 hover:bg-default'
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
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" @click="emit('close')">Cancel</UButton>
      <UButton :disabled="!valid" icon="i-lucide-save" @click="emit('submit')">
        {{ mode === "create" ? "Create node" : "Save changes" }}
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
