<script setup lang="ts">
import type { WorkspaceScorecardBlock } from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceScorecardBlock;
  tabId: string;
}>();

const {
  addScorecardMetric,
  mutateScorecardMetric,
  removeScorecardMetric,
} = useWorkspaceNodeEditorContext();

const summary = computed(() => {
  const metricCount = props.block.metrics.length;
  const atTarget = props.block.metrics.filter((metric) => metric.value >= metric.target).length;
  const avgProgress =
    metricCount === 0
      ? 0
      : Math.round(
          props.block.metrics.reduce((sum, metric) => sum + getMetricProgress(metric.value, metric.target), 0) /
            metricCount,
        );

  return {
    metricCount,
    atTarget,
    avgProgress,
  };
});

function toNumber(value: string, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getMetricProgress(value: number, target: number) {
  if (target === 0) {
    return value > 0 ? 100 : 0;
  }

  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

function getStatusColor(value: number, target: number) {
    const progress = getMetricProgress(value, target);
    if (progress >= 100) return 'text-success';
    if (progress >= 50) return 'text-warning';
    return 'text-error';
}
</script>

<template>
  <div class="space-y-8">
    <!-- Enhanced Summary Header -->
    <div class="grid gap-6 sm:grid-cols-3">
        <div class="flex flex-col items-center justify-center rounded-[32px] bg-primary/5 p-6 text-center">
            <p class="text-[10px] font-bold uppercase tracking-widest text-primary/60">Total Metrics</p>
            <p class="mt-1 text-4xl font-black text-primary">{{ summary.metricCount }}</p>
        </div>
        <div class="flex flex-col items-center justify-center rounded-[32px] bg-success/5 p-6 text-center">
            <p class="text-[10px] font-bold uppercase tracking-widest text-success/60">At Target</p>
            <p class="mt-1 text-4xl font-black text-success">{{ summary.atTarget }}</p>
        </div>
        <div class="flex flex-col items-center justify-center rounded-[32px] bg-warning/5 p-6 text-center">
            <p class="text-[10px] font-bold uppercase tracking-widest text-warning/60">Avg Progress</p>
            <p class="mt-1 text-4xl font-black text-warning">{{ summary.avgProgress }}%</p>
        </div>
    </div>

    <!-- Metrics Grid -->
    <div class="space-y-4">
        <div class="flex items-center justify-between px-2">
            <h3 class="text-sm font-bold uppercase tracking-widest text-muted/60">Key Performance Indicators</h3>
            <UButton 
                color="primary" 
                variant="soft" 
                size="sm" 
                icon="i-lucide-plus" 
                class="rounded-full px-4"
                @click="addScorecardMetric(tabId, block.id)"
            >
                Add Metric
            </UButton>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
            <div
                v-for="metric in block.metrics"
                :key="metric.id"
                class="group relative overflow-hidden rounded-[32px] border border-muted/20 bg-default/40 p-6 transition-all hover:border-primary/20 hover:bg-default/60 hover:shadow-lg hover:shadow-black/5"
            >
                <div class="flex items-start justify-between gap-4">
                    <div class="flex-1 space-y-1">
                        <UInput
                            :model-value="metric.label"
                            variant="none"
                            placeholder="Metric Title"
                            class="w-full"
                            :ui="{ base: 'px-0 text-lg font-bold text-highlighted placeholder:text-muted/40' }"
                            @update:model-value="mutateScorecardMetric(tabId, block.id, metric.id, (entry) => {
                                entry.label = ($event ?? '').slice(0, 120);
                            })"
                        />
                        <div class="flex items-center gap-2">
                            <span 
                                class="text-3xl font-black tracking-tighter"
                                :class="getStatusColor(metric.value, metric.target)"
                            >
                                {{ metric.value }}
                            </span>
                            <span class="text-sm font-bold text-muted/60">/ {{ metric.target }} {{ metric.unit }}</span>
                        </div>
                    </div>

                    <UButton
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        icon="i-lucide-trash-2"
                        class="rounded-xl opacity-0 transition-opacity group-hover:opacity-100 hover:text-error"
                        @click="removeScorecardMetric(tabId, block.id, metric.id)"
                    />
                </div>

                <!-- Progress Ring/Bar Area -->
                <div class="mt-6 space-y-3">
                    <div class="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
                        <span class="text-muted/60">Progress</span>
                        <span :class="getStatusColor(metric.value, metric.target)">{{ getMetricProgress(metric.value, metric.target) }}%</span>
                    </div>
                    <UProgress 
                        :model-value="getMetricProgress(metric.value, metric.target)" 
                        size="sm"
                        class="rounded-full"
                    />
                </div>

                <!-- Inline Editing Controls (Condensed) -->
                <div class="mt-6 grid grid-cols-3 gap-2 opacity-0 transition-all group-hover:opacity-100">
                    <div class="space-y-1">
                        <p class="text-[9px] font-bold uppercase tracking-widest text-muted/60">Current</p>
                        <UInput
                            :model-value="String(metric.value)"
                            type="number"
                            size="xs"
                            class="rounded-lg"
                            @update:model-value="mutateScorecardMetric(tabId, block.id, metric.id, (entry) => {
                                entry.value = toNumber($event ?? '0');
                            })"
                        />
                    </div>
                    <div class="space-y-1">
                        <p class="text-[9px] font-bold uppercase tracking-widest text-muted/60">Target</p>
                        <UInput
                            :model-value="String(metric.target)"
                            type="number"
                            size="xs"
                            class="rounded-lg"
                            @update:model-value="mutateScorecardMetric(tabId, block.id, metric.id, (entry) => {
                                entry.target = toNumber($event ?? '0', 100);
                            })"
                        />
                    </div>
                    <div class="space-y-1">
                        <p class="text-[9px] font-bold uppercase tracking-widest text-muted/60">Unit</p>
                        <UInput
                            :model-value="metric.unit"
                            size="xs"
                            placeholder="%"
                            class="rounded-lg"
                            @update:model-value="mutateScorecardMetric(tabId, block.id, metric.id, (entry) => {
                                entry.unit = ($event ?? '').slice(0, 24);
                            })"
                        />
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div 
                v-if="block.metrics.length === 0" 
                class="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-muted/30 bg-default/20 py-16 text-center md:col-span-2"
            >
                <div class="mb-4 rounded-2xl bg-muted/10 p-4 text-muted">
                    <UIcon name="i-lucide-bar-chart-3" class="size-8" />
                </div>
                <p class="text-sm font-bold text-muted/60 uppercase tracking-widest">No metrics defined</p>
            </div>
        </div>
    </div>
  </div>
</template>
