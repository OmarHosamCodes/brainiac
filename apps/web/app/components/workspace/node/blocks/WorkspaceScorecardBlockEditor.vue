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
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-2xl border border-muted/60 bg-elevated/20 p-4">
        <p class="text-xs uppercase tracking-[0.2em] text-muted">Metrics</p>
        <p class="mt-2 text-2xl font-semibold text-highlighted">{{ summary.metricCount }}</p>
      </div>
      <div class="rounded-2xl border border-muted/60 bg-elevated/20 p-4">
        <p class="text-xs uppercase tracking-[0.2em] text-muted">At target</p>
        <p class="mt-2 text-2xl font-semibold text-highlighted">{{ summary.atTarget }}</p>
      </div>
      <div class="rounded-2xl border border-muted/60 bg-elevated/20 p-4">
        <p class="text-xs uppercase tracking-[0.2em] text-muted">Average progress</p>
        <p class="mt-2 text-2xl font-semibold text-highlighted">{{ summary.avgProgress }}%</p>
      </div>
    </div>

    <div class="flex justify-end">
      <UButton color="primary" variant="soft" size="sm" icon="i-lucide-plus" @click="addScorecardMetric(tabId, block.id)">
        Add metric
      </UButton>
    </div>

    <div class="grid gap-4 xl:grid-cols-2">
      <article
        v-for="metric in block.metrics"
        :key="metric.id"
        class="rounded-2xl border border-muted/60 bg-default p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <UInput
            :model-value="metric.label"
            class="flex-1"
            variant="none"
            placeholder="Metric label"
            :ui="{ base: 'px-0 font-semibold text-highlighted' }"
            @update:model-value="mutateScorecardMetric(tabId, block.id, metric.id, (entry) => {
              entry.label = ($event ?? '').slice(0, 120);
            })"
          />
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-trash-2"
            @click="removeScorecardMetric(tabId, block.id, metric.id)"
          />
        </div>

        <div class="mt-4 grid gap-3 md:grid-cols-3">
          <UInput
            :model-value="String(metric.value)"
            type="number"
            placeholder="Value"
            @update:model-value="mutateScorecardMetric(tabId, block.id, metric.id, (entry) => {
              entry.value = toNumber($event ?? '0');
            })"
          />
          <UInput
            :model-value="String(metric.target)"
            type="number"
            placeholder="Target"
            @update:model-value="mutateScorecardMetric(tabId, block.id, metric.id, (entry) => {
              entry.target = toNumber($event ?? '0', 100);
            })"
          />
          <UInput
            :model-value="metric.unit"
            placeholder="Unit"
            @update:model-value="mutateScorecardMetric(tabId, block.id, metric.id, (entry) => {
              entry.unit = ($event ?? '').slice(0, 24);
            })"
          />
        </div>

        <div class="mt-4 rounded-2xl border border-muted/60 bg-elevated/20 p-4">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-medium text-highlighted">
              {{ metric.value }}{{ metric.unit ? ` ${metric.unit}` : '' }} / {{ metric.target }}{{ metric.unit ? ` ${metric.unit}` : '' }}
            </p>
            <UBadge color="neutral" variant="soft">
              {{ getMetricProgress(metric.value, metric.target) }}%
            </UBadge>
          </div>
          <UProgress :model-value="getMetricProgress(metric.value, metric.target)" class="mt-3" />
        </div>
      </article>

      <div v-if="block.metrics.length === 0" class="rounded-2xl border border-dashed border-muted/70 bg-elevated/20 p-6 text-sm text-muted xl:col-span-2">
        No metrics yet.
      </div>
    </div>
  </div>
</template>
