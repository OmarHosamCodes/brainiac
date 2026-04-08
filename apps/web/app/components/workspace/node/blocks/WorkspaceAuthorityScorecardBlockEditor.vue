<script setup lang="ts">
import {
  WORKSPACE_AUTHORITY_SCORECARD_METRICS,
  getAuthorityScorecardSummary,
  getAuthorityScoreMetricProgress,
  workspaceAuthorityScoreMetricIcons,
  workspaceAuthorityScoreMetricLabels,
  type WorkspaceAuthorityScoreMetricKey,
  type WorkspaceAuthorityScorecardBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceAuthorityScorecardBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getAuthorityScorecardSummary(props.block));
const metricKeys = WORKSPACE_AUTHORITY_SCORECARD_METRICS;

function formatValue(value: number) {
  return value.toLocaleString("en-US");
}

function toInteger(value: string, fallback: number) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.round(numeric));
}

function getProgressTone(progress: number) {
  if (progress >= 75) {
    return {
      badge: "text-success",
      surface: "border-success/25 bg-success/5",
      progress: "success" as const,
    };
  }

  if (progress >= 40) {
    return {
      badge: "text-warning",
      surface: "border-warning/25 bg-warning/5",
      progress: "warning" as const,
    };
  }

  return {
    badge: "text-error",
    surface: "border-error/25 bg-error/5",
    progress: "error" as const,
  };
}

function incrementMetric(metricKey: WorkspaceAuthorityScoreMetricKey) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "authority-scorecard") {
      return;
    }

    block.metrics[metricKey].value += 1;
  });
}

function updateMetricValue(metricKey: WorkspaceAuthorityScoreMetricKey, value: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "authority-scorecard") {
      return;
    }

    block.metrics[metricKey].value = toInteger(value, block.metrics[metricKey].value);
  });
}

function updateMetricTarget(metricKey: WorkspaceAuthorityScoreMetricKey, value: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "authority-scorecard") {
      return;
    }

    block.metrics[metricKey].target = Math.max(1, toInteger(value, block.metrics[metricKey].target));
  });
}
</script>

<template>
  <div class="space-y-6">
    <!-- Summary Stats -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-2xl bg-primary/10 border border-primary/20 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">On Target</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-primary">
          {{ summary.atTargetCount }}/{{ summary.metricCount }}
        </p>
      </div>

      <div class="rounded-2xl bg-secondary/10 border border-secondary/20 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/80">
          Avg Progress
        </p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-secondary">
          {{ summary.averageProgress }}%
        </p>
      </div>

      <div class="rounded-2xl bg-success/10 border border-success/20 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-success/70">Strongest</p>
        <p class="mt-2 text-lg sm:text-xl font-black tracking-tight text-success">
          {{
            summary.strongestMetric
              ? workspaceAuthorityScoreMetricLabels[summary.strongestMetric]
              : "None"
          }}
        </p>
      </div>
    </div>

    <!-- Section Header -->
    <div class="flex items-center justify-between gap-3 px-1">
      <div>
        <h2 class="text-sm font-black text-highlighted tracking-tight">Authority Metrics</h2>
        <p class="text-xs text-muted">Track key authority indicators with quick increments and precise editing.</p>
      </div>
    </div>

    <!-- Metric Cards -->
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="metricKey in metricKeys"
        :key="metricKey"
        class="rounded-2xl border p-4 transition-all"
        :class="getProgressTone(summary.metrics[metricKey].progress).surface"
      >
        <!-- Card Header: Icon, Label, Value, Progress Badge, Increment Button -->
        <div class="flex items-start justify-between gap-3 mb-4">
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              class="flex size-9 items-center justify-center rounded-xl border border-muted/20 bg-default/80 text-toned shrink-0"
            >
              <UIcon :name="workspaceAuthorityScoreMetricIcons[metricKey]" class="size-4.5" />
            </div>

            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
                {{ workspaceAuthorityScoreMetricLabels[metricKey] }}
              </p>
              <p
                class="mt-0.5 text-xl sm:text-2xl font-black tracking-tight truncate"
                :class="getProgressTone(summary.metrics[metricKey].progress).badge"
              >
                {{ formatValue(block.metrics[metricKey].value) }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <UBadge
              :color="getProgressTone(summary.metrics[metricKey].progress).progress"
              variant="soft"
              size="sm"
              class="rounded-xl px-2.5 py-0.5"
            >
              {{ summary.metrics[metricKey].progress }}%
            </UBadge>
            <UButton
              color="primary"
              variant="soft"
              icon="i-lucide-plus"
              size="sm"
              class="rounded-lg"
              aria-label="Increment {{ workspaceAuthorityScoreMetricLabels[metricKey] }}"
              @click="incrementMetric(metricKey)"
            />
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="mb-4 space-y-2">
          <div
            class="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
          >
            <span>Progress</span>
            <span>Target: {{ formatValue(block.metrics[metricKey].target) }}</span>
          </div>
          <UProgress
            :model-value="summary.metrics[metricKey].progress"
            size="sm"
            class="rounded-full"
            :color="getProgressTone(summary.metrics[metricKey].progress).progress"
          />
        </div>

        <!-- Editable Inputs -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label
              :for="'current-' + metricKey"
              class="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
            >
              Current
            </label>
            <UInput
              :id="'current-' + metricKey"
              :model-value="String(block.metrics[metricKey].value)"
              type="number"
              size="sm"
              class="rounded-xl"
              @update:model-value="updateMetricValue(metricKey, $event as string)"
            />
          </div>

          <div>
            <label
              :for="'target-' + metricKey"
              class="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
            >
              Target
            </label>
            <UInput
              :id="'target-' + metricKey"
              :model-value="String(block.metrics[metricKey].target)"
              type="number"
              size="sm"
              class="rounded-xl"
              @update:model-value="updateMetricTarget(metricKey, $event as string)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
