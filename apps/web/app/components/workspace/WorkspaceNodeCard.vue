<script setup lang="ts">
import {
  getWorkspaceNodePreview,
  getWorkspaceNodeStats,
  type WorkspaceNode,
} from "@brainiac/workspace";

const props = defineProps<{
  node: WorkspaceNode;
  selected: boolean;
}>();

const preview = computed(() => getWorkspaceNodePreview(props.node, 140));
const stats = computed(() => getWorkspaceNodeStats(props.node));
</script>

<template>
  <div class="node-card flex h-full min-h-0 flex-col px-4 pb-4 pt-1">
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
        <UBadge color="neutral" variant="subtle" size="sm">
          {{ stats.tabsCount }} tabs
        </UBadge>
        <UBadge color="neutral" variant="soft" size="sm">
          {{ stats.blocksCount }} blocks
        </UBadge>
      </div>
    </div>

    <p class="min-h-0 flex-1 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-toned">
      {{ preview }}
    </p>

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
}
</style>
