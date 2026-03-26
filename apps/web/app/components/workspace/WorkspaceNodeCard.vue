<script setup lang="ts">
import type { CanvasNodeModel } from "~/composables/useCanvas";

import {
  getWorkspaceNodeDashboardDetails,
  getWorkspaceNodePreview,
  getWorkspaceNodeStats,
  type WorkspaceBlock,
  type WorkspaceNode,
} from "@brainiac/workspace";

import { getWorkspaceBlockRegistryEntry } from "~/utils/workspace-block-registry";
import {
  getWorkspaceNodeTintOption,
  getWorkspaceNodeTintStyle,
} from "~/utils/workspace-node-dashboard";

const props = defineProps<{
  node: CanvasNodeModel;
  selected: boolean;
}>();

const workspaceNode = computed(() => props.node as WorkspaceNode);
const featuredDetails = computed(() => getWorkspaceNodeDashboardDetails(workspaceNode.value));
const preview = computed(() =>
  getWorkspaceNodePreview(workspaceNode.value, featuredDetails.value.length > 0 ? 96 : 140),
);
const stats = computed(() => getWorkspaceNodeStats(workspaceNode.value));
const tintOption = computed(() => getWorkspaceNodeTintOption(workspaceNode.value.dashboard.tint));
const tintStyle = computed(() => getWorkspaceNodeTintStyle(workspaceNode.value.dashboard.tint));

function getDetailEntry(type: WorkspaceBlock["type"]) {
  return getWorkspaceBlockRegistryEntry(type);
}
</script>

<template>
  <div class="node-card flex h-full min-h-0 flex-col px-4 pb-4 pt-1" :style="tintStyle">
    <div class="mb-3 flex shrink-0 items-center justify-between gap-3">
      <span
        class="rounded-full border px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide"
        :class="
          selected
            ? 'border-primary/50 bg-primary/10 text-primary'
            : 'border-muted/60 bg-elevated/80 text-toned'
        "
      >
        {{ selected ? "Selected" : "Saved" }}
      </span>

      <div class="flex items-center gap-1 text-[0.65rem] text-muted">
        <UBadge color="neutral" variant="soft" size="sm">
          {{ tintOption.label }}
        </UBadge>
        <UBadge color="neutral" variant="subtle" size="sm">
          {{ stats.tabsCount }} tabs
        </UBadge>
        <UBadge color="neutral" variant="soft" size="sm">
          {{ stats.blocksCount }} blocks
        </UBadge>
      </div>
    </div>

    <div class="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
      <p class="text-sm leading-relaxed whitespace-pre-wrap text-toned">
        {{ preview }}
      </p>

      <div v-if="featuredDetails.length > 0" class="space-y-2">
        <section
          v-for="detail in featuredDetails"
          :key="`${detail.tabId}-${detail.blockId}`"
          class="node-card-detail rounded-2xl border p-3"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <UIcon
                  :name="getDetailEntry(detail.blockType).icon"
                  class="size-3.5 shrink-0 text-highlighted"
                />
                <p class="truncate text-xs font-semibold text-highlighted">
                  {{ detail.blockTitle }}
                </p>
              </div>
              <p class="mt-1 truncate text-[0.65rem] uppercase tracking-[0.18em] text-muted">
                {{ detail.tabTitle }}
              </p>
            </div>

            <UBadge color="neutral" variant="subtle" size="sm">
              {{ getDetailEntry(detail.blockType).label }}
            </UBadge>
          </div>

          <p class="mt-2 text-xs leading-5 text-toned">
            {{ detail.summary }}
          </p>

          <div v-if="detail.metrics.length > 0" class="mt-2 flex flex-wrap gap-1.5">
            <span
              v-for="metric in detail.metrics"
              :key="`${detail.blockId}-${metric.label}`"
              class="node-card-metric rounded-full border px-2 py-0.5 text-[0.65rem] font-medium text-toned"
            >
              {{ metric.value }} {{ metric.label }}
            </span>
          </div>

          <ul v-if="detail.highlights.length > 0" class="mt-2 space-y-1">
            <li
              v-for="(highlight, index) in detail.highlights"
              :key="`${detail.blockId}-highlight-${index}`"
              class="truncate text-[0.72rem] leading-5 text-muted"
            >
              {{ highlight }}
            </li>
          </ul>
        </section>
      </div>
    </div>

    <div class="mt-3 flex shrink-0 items-center justify-between text-xs text-muted">
      <span>{{ stats.completedTasks }}/{{ stats.totalTasks }} tasks done</span>
      <span v-if="stats.overdueTasks > 0" class="font-medium text-error">
        {{ stats.overdueTasks }} overdue
      </span>
      <span v-else>On track</span>
    </div>
  </div>
</template>

<style scoped>
.node-card {
  height: 100%;
  --workspace-node-rgb: 148 163 184;
}

.node-card-detail {
  background: linear-gradient(
    180deg,
    rgb(var(--workspace-node-rgb) / 0.14),
    rgb(var(--workspace-node-rgb) / 0.05)
  );
  border-color: rgb(var(--workspace-node-rgb) / 0.18);
}

.node-card-metric {
  background-color: rgb(var(--workspace-node-rgb) / 0.12);
  border-color: rgb(var(--workspace-node-rgb) / 0.18);
}
</style>
