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
  getWorkspaceNodePreview(workspaceNode.value, featuredDetails.value.length > 0 ? 120 : 180),
);
const stats = computed(() => getWorkspaceNodeStats(workspaceNode.value));
const tintOption = computed(() => getWorkspaceNodeTintOption(workspaceNode.value.dashboard.tint));
const tintStyle = computed(() => getWorkspaceNodeTintStyle(workspaceNode.value.dashboard.tint));

function getDetailEntry(type: WorkspaceBlock["type"]) {
  return getWorkspaceBlockRegistryEntry(type);
}
</script>

<template>
  <div class="node-card group relative flex h-full flex-col p-5 transition-all duration-300 rounded-[2rem]" :style="tintStyle">
    <!-- Tinted Background Layer -->
    <div class="absolute inset-0 rounded-[2rem] bg-neutral-50/50 dark:bg-neutral-950/50 -z-20" />
    <div class="absolute inset-0 rounded-[2rem] bg-[rgb(var(--workspace-node-rgb)/0.05)] dark:bg-[rgb(var(--workspace-node-rgb)/0.1)] border border-[rgb(var(--workspace-node-rgb)/0.2)] dark:border-[rgb(var(--workspace-node-rgb)/0.3)] -z-10" />

    <!-- Selection Glow -->
    <div 
        v-if="selected" 
        class="absolute -inset-[2px] rounded-[2.1rem] bg-primary-500/50 -z-10 opacity-50 blur-[2px]" 
    />

    <div class="mb-5 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
            <div 
                class="size-2 rounded-full" 
                :class="selected ? 'bg-primary-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-neutral-300 dark:bg-neutral-700'"
            />
            <span class="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                {{ selected ? 'Active' : 'Saved' }}
            </span>
        </div>

        <div class="flex items-center gap-1.5">
             <div class="px-2 py-0.5 rounded-md bg-[rgb(var(--workspace-node-rgb)/0.1)] text-[9px] font-bold text-[rgb(var(--workspace-node-rgb))] uppercase tracking-wider">
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

    <div class="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1 custom-scrollbar">
        <p class="text-sm font-medium leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
            {{ preview }}
        </p>

        <div v-if="featuredDetails.length > 0" class="space-y-3 pt-2">
            <div 
                v-for="detail in featuredDetails" 
                :key="`${detail.tabId}-${detail.blockId}`"
                class="relative p-3.5 rounded-2xl bg-white/40 dark:bg-neutral-900/40 border border-neutral-200/30 dark:border-neutral-800/30 group/detail hover:border-primary-500/30 transition-colors"
            >
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <UIcon :name="getDetailEntry(detail.blockType).icon" class="size-3 text-primary-500" />
                        <span class="text-[10px] font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-[120px]">
                            {{ detail.blockTitle }}
                        </span>
                    </div>
                     <span class="text-[8px] font-bold uppercase tracking-widest text-neutral-400">
                        {{ detail.tabTitle }}
                    </span>
                </div>

                <p class="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2">
                    {{ detail.summary }}
                </p>
            </div>
        </div>
    </div>

    <div class="mt-5 pt-4 border-t border-neutral-200/30 dark:border-neutral-800/30 flex items-center justify-between">
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

        <div class="flex -space-x-1.5">
            <div class="size-4 rounded-full border border-white dark:border-neutral-900 bg-neutral-200 dark:bg-neutral-800" />
            <div class="size-4 rounded-full border border-white dark:border-neutral-900 bg-neutral-300 dark:border-neutral-700" />
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
  background: rgba(0,0,0,0.05);
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.05);
}
</style>
