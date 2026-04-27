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
    accentClass:
      "border-neutral-200/80 bg-white/70 text-neutral-700 dark:border-neutral-800/80 dark:bg-neutral-900/70 dark:text-neutral-200",
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
    class="node-card group relative flex h-full flex-col p-6 transition-all duration-300 rounded-[2rem]"
    :style="tintStyle"
  >
    <!-- Tinted Background Layer -->
    <div class="absolute inset-0 rounded-[2rem] bg-neutral-50/50 dark:bg-neutral-950/50 -z-20" />
    <div
      v-if="
        workspaceNode.nodeType === 'orchestrator'
      "
      class="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top_right,rgb(var(--workspace-node-rgb)/0.18),transparent_48%),linear-gradient(140deg,rgb(var(--workspace-node-rgb)/0.12),transparent_60%)] -z-20"
    />
    <div
      class="absolute inset-0 rounded-[2rem] bg-[rgb(var(--workspace-node-rgb)/0.05)] dark:bg-[rgb(var(--workspace-node-rgb)/0.1)] border border-[rgb(var(--workspace-node-rgb)/0.2)] dark:border-[rgb(var(--workspace-node-rgb)/0.3)] -z-10"
    />
    <div
      v-if="
        workspaceNode.nodeType === 'orchestrator'
      "
      class="absolute inset-3 rounded-[1.55rem] border border-[rgb(var(--workspace-node-rgb)/0.18)] bg-[linear-gradient(120deg,rgb(var(--workspace-node-rgb)/0.08),transparent_48%)] -z-10"
    />

    <!-- Selection Glow -->
    <div
      v-if="selected"
      class="absolute -inset-[2px] rounded-[2.1rem] bg-primary-500/50 -z-10 opacity-50 blur-[2px]"
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
            <span class="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              {{ selected ? "Active" : "Saved" }}
            </span>
            <span
              class="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
              :class="nodeTypeMeta.accentClass"
            >
              {{ nodeTypeMeta.label }}
            </span>
          </div>

          <p class="mt-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            {{ nodeTypeMeta.detail }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <div
          class="px-2 py-0.5 rounded-md bg-[rgb(var(--workspace-node-rgb)/0.1)] text-[9px] font-bold text-[rgb(var(--workspace-node-rgb))] uppercase tracking-wider"
        >
          {{ stats.blocksCount }} blks
        </div>
        <div
          v-if="stats.overdueTasks > 0"
          class="px-2 py-0.5 rounded-md bg-red-500/10 text-[9px] font-bold text-red-500 uppercase tracking-wider"
        >
          Alert
        </div>
      </div>
    </div>

    <div class="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
      <p
        class="text-sm font-medium leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap"
      >
        {{ preview }}
      </p>

      <div v-if="featuredDetails.length > 0" class="space-y-2.5">
        <div
          v-for="detail in featuredDetails"
          :key="`${detail.tabId}-${detail.blockId}`"
          class="relative border-l-2 border-primary-500/20 pl-3 py-1.5"
        >
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-1.5">
              <UIcon
                :name="getDetailEntry(detail.blockType).icon"
                class="size-3 text-primary-500"
              />
              <span
                class="text-[10px] font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-[120px]"
              >
                {{ detail.blockTitle }}
              </span>
            </div>
            <span class="text-[8px] font-bold uppercase tracking-widest text-neutral-400">
              {{ detail.tabTitle }}
            </span>
          </div>

          <p
            class="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2"
          >
            {{ detail.summary }}
          </p>
        </div>
      </div>
    </div>

    <div
      class="mt-6 pt-3 border-t border-neutral-200/30 dark:border-neutral-800/30 flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <div class="w-12 h-1 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
          <div
            class="h-full bg-primary-500 transition-all duration-500"
            :style="{ width: `${(stats.completedTasks / (stats.totalTasks || 1)) * 100}%` }"
          />
        </div>
        <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
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
