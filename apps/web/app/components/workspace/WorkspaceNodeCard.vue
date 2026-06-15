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
import { getWorkspaceNodeTintStyle } from "~/utils/workspace-node-dashboard";

const props = defineProps<{
  node: CanvasNodeModel;
  selected: boolean;
  allNodes?: CanvasNodeModel[];
}>();

const workspaceNode = computed(() => props.node as WorkspaceNode);
const allWorkspaceNodes = computed(() => (props.allNodes ?? []) as WorkspaceNode[]);
const featuredDetails = computed(() =>
  getWorkspaceNodeDashboardDetails(workspaceNode.value, allWorkspaceNodes.value),
);
const preview = computed(() =>
  getWorkspaceNodePreview(workspaceNode.value, featuredDetails.value.length > 0 ? 120 : 180),
);
const stats = computed(() => getWorkspaceNodeStats(workspaceNode.value, allWorkspaceNodes.value));
const tintStyle = computed(() => getWorkspaceNodeTintStyle(workspaceNode.value.dashboard.tint));
const outboundConnectionCount = computed(() =>
  workspaceNode.value.nodeType === "orchestrator" ? workspaceNode.value.connections.length : 0,
);
const linkedOrchestratorCount = computed(
  () =>
    allWorkspaceNodes.value.filter(
      (node) =>
        node.nodeType === "orchestrator" &&
        node.connections.some((connection) => connection.targetNodeId === workspaceNode.value.id),
    ).length,
);
const nodeTypeMeta = computed(() => {
  if (workspaceNode.value.nodeType === "orchestrator") {
    const label =
      outboundConnectionCount.value === 1
        ? "1 linked node"
        : `${outboundConnectionCount.value} linked nodes`;

    return {
      label: "Orchestrator",
      icon: "i-lucide-waypoints",
      accentClass:
        "border-[rgb(var(--workspace-node-rgb)/0.24)] bg-[rgb(var(--workspace-node-rgb)/0.12)] text-[rgb(var(--workspace-node-rgb))]",
      detail: label,
      footer: outboundConnectionCount.value > 0 ? label : "Ready to coordinate",
    };
  }

  const label =
    linkedOrchestratorCount.value > 0
      ? `Linked to ${linkedOrchestratorCount.value} orchestrator${linkedOrchestratorCount.value === 1 ? "" : "s"}`
      : "Standalone";

  return {
    label: "Standard",
    icon: "i-lucide-square-stack",
    accentClass: "border-default bg-elevated text-toned",
    detail: label,
    footer: label,
  };
});

function getDetailEntry(type: WorkspaceBlock["type"]) {
  return getWorkspaceBlockRegistryEntry(type);
}
</script>

<template>
  <div
    class="node-card group relative flex h-full flex-col rounded-[2rem] p-6 transition-colors duration-200"
    :class="selected ? 'ring-2 ring-primary/40' : ''"
    :style="tintStyle"
  >
    <div class="absolute inset-0 -z-20 rounded-[2rem] bg-default/50" />
    <div
      v-if="workspaceNode.nodeType === 'orchestrator'"
      class="absolute inset-0 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_top_right,rgb(var(--workspace-node-rgb)/0.14),transparent_55%)]"
    />
    <div
      class="absolute inset-0 -z-10 rounded-[2rem] border border-[rgb(var(--workspace-node-rgb)/0.2)] bg-[rgb(var(--workspace-node-rgb)/0.05)] dark:bg-[rgb(var(--workspace-node-rgb)/0.08)]"
    />

    <div class="mb-4 flex items-start justify-between gap-2.5">
      <div class="flex min-w-0 items-start gap-2.5">
        <div
          class="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border"
          :class="nodeTypeMeta.accentClass"
        >
          <UIcon :name="nodeTypeMeta.icon" class="size-5" />
        </div>

        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
              :class="nodeTypeMeta.accentClass"
            >
              {{ nodeTypeMeta.label }}
            </span>
          </div>

          <p class="mt-2 text-xs font-semibold text-toned">
            {{ nodeTypeMeta.detail }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <div
          class="rounded-md bg-[rgb(var(--workspace-node-rgb)/0.1)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[rgb(var(--workspace-node-rgb))]"
        >
          {{ stats.blocksCount }} blks
        </div>
        <div
          v-if="stats.overdueTasks > 0"
          class="rounded-md bg-warning/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning"
        >
          Overdue
        </div>
      </div>
    </div>

    <div class="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
      <p class="whitespace-pre-wrap text-sm font-medium leading-relaxed text-toned">
        {{ preview }}
      </p>

      <div v-if="featuredDetails.length > 0" class="space-y-2">
        <div
          v-for="detail in featuredDetails"
          :key="`${detail.tabId}-${detail.blockId}`"
          class="rounded-lg bg-primary/5 px-3 py-2"
        >
          <div class="mb-1 flex items-center justify-between">
            <div class="flex min-w-0 items-center gap-1.5">
              <UIcon
                :name="getDetailEntry(detail.blockType).icon"
                class="size-3 shrink-0 text-primary"
              />
              <span class="max-w-[120px] truncate text-[10px] font-bold text-highlighted">
                {{ detail.blockTitle }}
              </span>
            </div>
            <span class="text-[8px] font-bold uppercase tracking-widest text-muted">
              {{ detail.tabTitle }}
            </span>
          </div>

          <p class="line-clamp-2 text-[11px] leading-relaxed text-muted">
            {{ detail.summary }}
          </p>
        </div>
      </div>
    </div>

    <div class="mt-6 flex items-center justify-between border-t border-default pt-3">
      <div class="flex items-center gap-2">
        <div class="h-1 w-12 overflow-hidden rounded-full bg-muted">
          <div
            class="h-full bg-primary transition-all duration-500"
            :style="{ width: `${(stats.completedTasks / (stats.totalTasks || 1)) * 100}%` }"
          />
        </div>
        <span class="text-[9px] font-bold uppercase tracking-widest text-muted">
          {{ stats.completedTasks }}/{{ stats.totalTasks }}
        </span>
      </div>

      <div
        class="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
        :class="nodeTypeMeta.accentClass"
      >
        {{ nodeTypeMeta.footer }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.node-card {
  --workspace-node-rgb: 148 163 184;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 3px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
}
</style>
