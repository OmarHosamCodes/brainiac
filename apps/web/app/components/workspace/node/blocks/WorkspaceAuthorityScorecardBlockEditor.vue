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
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">On Target</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-primary">
          {{ summary.atTargetCount }}/{{ summary.metricCount }}
        </p>
      </div>

      <div class="rounded-[28px] bg-secondary/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary/80">
          Avg Progress
        </p>
        <p class="mt-2 text-4xl font-black tracking-tight text-secondary">
          {{ summary.averageProgress }}%
        </p>
      </div>

      <div class="rounded-[28px] bg-success/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-success/70">Strongest</p>
        <p class="mt-2 text-2xl font-black tracking-tight text-success">
          {{
            summary.strongestMetric
              ? workspaceAuthorityScoreMetricLabels[summary.strongestMetric]
              : "None"
          }}
        </p>
      </div>
    </div>

    <div class="flex items-center justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Authority scorecard</p>
        <p class="text-sm text-muted">
          Click a card to increment the current count. Direct current and target edits are also
          available inside each card.
        </p>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <button
        v-for="metricKey in metricKeys"
        :key="metricKey"
        type="button"
        class="rounded-[30px] border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
        :class="getProgressTone(summary.metrics[metricKey].progress).surface"
        @click="incrementMetric(metricKey)"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-3">
            <div
              class="flex size-11 items-center justify-center rounded-2xl border border-white/60 bg-default/80 text-toned"
            >
              <UIcon :name="workspaceAuthorityScoreMetricIcons[metricKey]" class="size-5" />
            </div>

            <div>
              <p class="text-xs font-bold uppercase tracking-[0.22em] text-muted">
                {{ workspaceAuthorityScoreMetricLabels[metricKey] }}
              </p>
              <p
                class="mt-2 text-4xl font-black tracking-tight"
                :class="getProgressTone(summary.metrics[metricKey].progress).badge"
              >
                {{ formatValue(block.metrics[metricKey].value) }}
              </p>
            </div>
          </div>

          <UBadge
            :color="getProgressTone(summary.metrics[metricKey].progress).progress"
            variant="soft"
            size="sm"
            class="rounded-full px-3"
          >
            {{ summary.metrics[metricKey].progress }}%
          </UBadge>
        </div>

        <div class="mt-5 space-y-2">
          <div
            class="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-muted"
          >
            <span>Progress</span>
            <span>Target {{ formatValue(block.metrics[metricKey].target) }}</span>
          </div>
          <UProgress
            :model-value="summary.metrics[metricKey].progress"
            size="sm"
            class="rounded-full"
            :color="getProgressTone(summary.metrics[metricKey].progress).progress"
          />
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3" @click.stop>
          <div>
            <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Current</p>
            <UInput
              :model-value="String(block.metrics[metricKey].value)"
              type="number"
              size="sm"
              class="rounded-xl"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'authority-scorecard') return;
                  entry.metrics[metricKey].value = toInteger(
                    $event ?? '0',
                    entry.metrics[metricKey].value,
                  );
                })
              "
            />
          </div>

          <div>
            <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Target</p>
            <UInput
              :model-value="String(block.metrics[metricKey].target)"
              type="number"
              size="sm"
              class="rounded-xl"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'authority-scorecard') return;
                  entry.metrics[metricKey].target = Math.max(
                    1,
                    toInteger($event ?? '1', entry.metrics[metricKey].target),
                  );
                })
              "
            />
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
