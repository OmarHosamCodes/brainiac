<script setup lang="ts">
import { getTrackerTrend, type WorkspaceTrackerBlock } from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { formatDateTime } from "~/utils/format-date-time";

const props = defineProps<{
  block: WorkspaceTrackerBlock;
  tabId: string;
}>();

const { addTrackerEntry, mutateBlock, mutateTrackerEntry, removeTrackerEntry } =
  useWorkspaceNodeEditorContext();

const trend = computed(() => getTrackerTrend(props.block));
const latestEntry = computed(() => props.block.entries[props.block.entries.length - 1] ?? null);
const averageValue = computed(() => {
  if (props.block.entries.length === 0) {
    return 0;
  }

  return Number(
    (
      props.block.entries.reduce((sum, entry) => sum + entry.value, 0) / props.block.entries.length
    ).toFixed(1),
  );
});
const chartHeights = computed(() => {
  const values = props.block.entries.map((entry) => entry.value);

  if (values.length === 0) {
    return [];
  }

  const min = Math.min(...values, props.block.goal ?? Number.POSITIVE_INFINITY);
  const max = Math.max(...values, props.block.goal ?? Number.NEGATIVE_INFINITY);

  if (max === min) {
    return values.map(() => 56);
  }

  return values.map((value) => Math.max(8, Math.round(((value - min) / (max - min)) * 100)));
});
const goalPosition = computed(() => {
  if (
    props.block.goal === null ||
    props.block.goal === undefined ||
    props.block.entries.length === 0
  ) {
    return null;
  }

  const values = props.block.entries.map((entry) => entry.value);
  const min = Math.min(...values, props.block.goal);
  const max = Math.max(...values, props.block.goal);

  if (max === min) {
    return 56;
  }

  return Math.max(0, Math.min(100, Math.round(((props.block.goal - min) / (max - min)) * 100)));
});

function toNumber(value: string, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatStatValue(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "None";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
</script>

<template>
  <div class="space-y-8">
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-3xl border border-primary/20 bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Latest</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-primary">
          {{ latestEntry ? formatStatValue(latestEntry.value) : "0" }}
        </p>
        <p class="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted/40">
          {{ latestEntry?.label || "No entries yet" }}
        </p>
      </div>

      <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Average</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
          {{ formatStatValue(averageValue) }}
        </p>
        <p class="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted/40">
          {{ block.entries.length }} data points
        </p>
      </div>

      <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Trend</p>
        <div class="mt-2 flex items-center gap-2">
          <UIcon
            :name="
              trend.direction === 'up'
                ? 'i-lucide-trending-up'
                : trend.direction === 'down'
                  ? 'i-lucide-trending-down'
                  : 'i-lucide-minus'
            "
            class="size-6"
            :class="
              trend.direction === 'up'
                ? 'text-success'
                : trend.direction === 'down'
                  ? 'text-error'
                  : 'text-muted'
            "
          />
          <p class="text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
            {{ trend.delta > 0 ? "+" : "" }}{{ formatStatValue(trend.delta) }}
          </p>
        </div>
        <p class="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted/40">
          {{ trend.percentChange === null ? "No baseline yet" : `${trend.percentChange}% change` }}
        </p>
      </div>

      <div class="rounded-3xl border border-warning/20 bg-warning/5 p-5">
        <div class="flex items-center justify-between gap-3">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-warning/70">Goal</p>
          <UButton
            v-if="block.goal !== null"
            color="warning"
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            class="rounded-lg"
            @click="
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== 'tracker') {
                  return;
                }

                entry.goal = null;
              })
            "
          />
        </div>
        <UInput
          :model-value="block.goal === null || block.goal === undefined ? '' : String(block.goal)"
          type="number"
          size="sm"
          class="mt-3 rounded-2xl font-mono font-bold"
          placeholder="Set target"
          @update:model-value="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== 'tracker') {
                return;
              }

              entry.goal = $event === '' || $event === null ? null : toNumber(String($event), 0);
            })
          "
        />
      </div>
    </div>

    <div
      v-if="chartHeights.length > 0"
      class="relative overflow-hidden rounded-3xl border border-muted/20 bg-default/40 p-8 shadow-inner"
    >
      <div class="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50" />
      <div class="relative flex h-36 items-end gap-2 lg:gap-3">
        <div
          v-for="(point, index) in chartHeights"
          :key="`${block.id}-chart-${index}`"
          class="group relative flex-1 min-w-[8px] rounded-t-full bg-primary/20 transition-all hover:bg-primary/60"
          :style="{ height: `${point}%` }"
        >
          <div
            class="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            {{ block.entries[index]?.value }}
          </div>
        </div>
      </div>

      <div
        v-if="goalPosition !== null"
        class="pointer-events-none absolute inset-x-8"
        :style="{ bottom: `calc(2rem + ${goalPosition}%)` }"
      >
        <div class="flex items-center gap-2">
          <span
            class="rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white"
          >
            Goal {{ formatStatValue(block.goal) }}
          </span>
          <div class="h-px flex-1 border-t border-dashed border-warning/70" />
        </div>
      </div>

      <div
        class="mt-6 flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40"
      >
        <span>Start</span>
        <span>{{ latestEntry?.label || "Current" }}</span>
      </div>
    </div>

    <div class="space-y-4">
      <div class="flex items-center justify-between px-2">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Data Log</p>
        <UButton
          color="primary"
          variant="soft"
          size="sm"
          icon="i-lucide-plus"
          class="rounded-full px-4"
          @click="addTrackerEntry(tabId, block.id)"
        >
          Add Entry
        </UButton>
      </div>

      <div class="space-y-2">
        <div
          v-for="entry in block.entries"
          :key="entry.id"
          class="group flex items-center gap-4 rounded-2xl border border-muted/20 bg-default/40 p-3 transition-all hover:border-primary/20 hover:bg-default/60"
        >
          <div class="min-w-0 flex-1">
            <UInput
              :model-value="entry.label"
              variant="none"
              placeholder="Entry context..."
              class="w-full"
              :ui="{ base: 'px-0 font-bold text-highlighted text-sm leading-tight' }"
              @update:model-value="
                mutateTrackerEntry(tabId, block.id, entry.id, (item) => {
                  item.label = ($event ?? '').slice(0, 120);
                })
              "
            />
            <p class="text-[9px] font-bold uppercase tracking-widest text-muted/40">
              {{ formatDateTime(entry.createdAt) }}
            </p>
          </div>

          <div class="flex items-center gap-3">
            <div class="w-24">
              <UInput
                :model-value="String(entry.value)"
                type="number"
                step="0.1"
                size="sm"
                class="rounded-xl font-mono font-bold"
                @update:model-value="
                  mutateTrackerEntry(tabId, block.id, entry.id, (item) => {
                    item.value = toNumber(String($event ?? '0'));
                  })
                "
              />
            </div>

            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-trash-2"
              class="rounded-lg opacity-0 group-hover:opacity-100 hover:text-error"
              @click="removeTrackerEntry(tabId, block.id, entry.id)"
            />
          </div>
        </div>

        <div
          v-if="block.entries.length === 0"
          class="rounded-3xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center"
        >
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
            No data entries
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
