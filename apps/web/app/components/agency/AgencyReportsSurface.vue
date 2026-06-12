<script setup lang="ts">
/**
 * Agency Reports — three honest breakdowns + CSV export.
 *
 * Range pill (this week / this month / last 30 / custom range) drives a single
 * `reports.summary` query. Three blocks: Hours by client, Hours by project,
 * Team activity. Each block is a dense bar list — bar length = relative share
 * of total. CSV export reuses the same range/filters.
 *
 * Why bars instead of a chart library: bars are honest at a glance, scan
 * faster than donut/pie for ranking, and survive both themes without re-tinting.
 */
import { useMutation, useQuery } from "@tanstack/vue-query";

import { getErrorMessage } from "~/utils/get-error-message";
import { projectHueStyle } from "~/utils/project-palette";

const props = defineProps<{
  teamId: string;
}>();

const orpc = useOrpc();
const toast = useToast();

const teamId = computed(() => props.teamId);

type RangePreset = "week" | "month" | "last30";
const rangePreset = ref<RangePreset>("week");

function startOfWeekUtc(): Date {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

const range = computed(() => {
  const now = new Date();
  const endIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  ).toISOString();

  if (rangePreset.value === "month") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { from: start.toISOString(), to: endIso };
  }
  if (rangePreset.value === "last30") {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
    );
    return { from: start.toISOString(), to: endIso };
  }
  return { from: startOfWeekUtc().toISOString(), to: endIso };
});

const summaryQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.reports.summary.queryOptions({
      input: { teamId: teamId.value, from: range.value.from, to: range.value.to },
    }),
    enabled: Boolean(teamId.value),
  })),
);

const summary = computed(() => summaryQuery.data.value?.summary ?? null);

const isLoading = computed(() => summaryQuery.isPending.value);
const isError = computed(() => Boolean(summaryQuery.error.value));

const exportCsvMutation = useMutation(orpc.agencyOps.reports.exportCsv.mutationOptions());

async function downloadCsv() {
  if (!teamId.value) return;
  try {
    const result = await exportCsvMutation.mutateAsync({
      teamId: teamId.value,
      from: range.value.from,
      to: range.value.to,
    });
    const blob = new Blob([result.csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.add({
      title: "Export ready",
      description: `${result.totalRows} rows in ${result.fileName}`,
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Export failed",
      description: getErrorMessage(error, "Try again."),
      color: "error",
    });
  }
}

const presetLabel: Record<RangePreset, string> = {
  week: "This week",
  month: "This month",
  last30: "Last 30 days",
};

function relShare(hours: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((hours / total) * 100));
}

function formatHours(value: number): string {
  if (value === 0) return "0h";
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  if (minutes === 0) return `${whole}h`;
  return `${whole}h ${String(minutes).padStart(2, "0")}m`;
}
</script>

<template>
  <div class="agency-reports space-y-4">
    <!-- Range pill + export -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="inline-flex rounded-full border border-default bg-elevated p-1">
        <button
          v-for="preset in ['week', 'month', 'last30'] as const"
          :key="preset"
          type="button"
          class="rounded-full px-3 py-1 text-[11px] font-bold transition-colors"
          :class="
            rangePreset === preset
              ? 'bg-default text-highlighted shadow-sm'
              : 'text-muted hover:text-highlighted'
          "
          @click="rangePreset = preset"
        >
          {{ presetLabel[preset] }}
        </button>
      </div>

      <div class="ml-auto">
        <UButton
          label="Export CSV"
          icon="i-lucide-download"
          color="neutral"
          variant="soft"
          size="xs"
          :loading="exportCsvMutation.isPending.value"
          :disabled="!summary || summary.totalEntries === 0"
          @click="downloadCsv"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="grid gap-4 lg:grid-cols-3">
      <div v-for="i in 3" :key="i" class="h-64 animate-pulse rounded-2xl bg-elevated/60" />
    </div>

    <!-- Error -->
    <div v-else-if="isError" class="rounded-2xl border border-error/30 bg-error/5 p-6 text-center">
      <UIcon name="i-lucide-alert-triangle" class="mx-auto size-5 text-error" />
      <p class="mt-3 text-sm font-bold text-highlighted">Couldn't load reports.</p>
      <p class="mt-1 text-xs text-muted">
        {{ getErrorMessage(summaryQuery.error.value, "Try refreshing.") }}
      </p>
      <UButton
        label="Retry"
        color="neutral"
        variant="soft"
        size="xs"
        class="mt-3"
        @click="summaryQuery.refetch()"
      />
    </div>

    <!-- Empty -->
    <div
      v-else-if="!summary || summary.totalEntries === 0"
      class="rounded-2xl border border-dashed border-default bg-muted/20 p-10 text-center"
    >
      <UIcon name="i-lucide-bar-chart-2" class="mx-auto size-7 text-muted" />
      <p class="mt-4 text-sm font-bold text-highlighted">No time logged in this range.</p>
      <p class="mt-1 text-xs text-muted">Track time on Time, then come back here.</p>
    </div>

    <div v-else class="space-y-4">
      <!-- Header band -->
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-2xl border border-default bg-default p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Total hours</p>
          <p class="mt-1 font-mono text-2xl font-bold tabular-nums text-highlighted">
            {{ formatHours(summary.totalHours) }}
          </p>
        </div>
        <div class="rounded-2xl border border-default bg-default p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Entries</p>
          <p class="mt-1 font-mono text-2xl font-bold tabular-nums text-highlighted">
            {{ summary.totalEntries }}
          </p>
        </div>
        <div class="rounded-2xl border border-default bg-default p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Active members</p>
          <p class="mt-1 font-mono text-2xl font-bold tabular-nums text-highlighted">
            {{ summary.teamActivity.length }}
          </p>
        </div>
      </div>

      <!-- Three breakdowns -->
      <div class="grid gap-4 lg:grid-cols-3">
        <!-- By client -->
        <article class="rounded-2xl border border-default bg-default">
          <header class="border-b border-default px-4 py-3">
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              Hours by client
            </p>
          </header>
          <ul class="divide-y divide-default">
            <li
              v-for="row in summary.timeDistributionByClient"
              :key="row.clientId"
              class="px-4 py-3"
            >
              <div class="flex items-baseline justify-between gap-3">
                <span class="truncate text-xs font-bold text-highlighted">{{
                  row.clientName
                }}</span>
                <span class="font-mono text-[11px] tabular-nums text-muted">
                  {{ formatHours(row.hours) }}
                </span>
              </div>
              <div class="mt-2 h-1.5 rounded-full bg-elevated">
                <div
                  class="h-full rounded-full bg-primary"
                  :style="{ width: `${relShare(row.hours, summary.totalHours)}%` }"
                />
              </div>
            </li>
            <li
              v-if="summary.timeDistributionByClient.length === 0"
              class="px-4 py-6 text-center text-xs text-muted"
            >
              No data.
            </li>
          </ul>
        </article>

        <!-- By project -->
        <article class="rounded-2xl border border-default bg-default">
          <header class="border-b border-default px-4 py-3">
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              Hours by project
            </p>
          </header>
          <ul class="divide-y divide-default">
            <li
              v-for="row in summary.timeDistributionByProject"
              :key="row.projectId"
              class="px-4 py-3"
            >
              <div class="flex items-baseline justify-between gap-3">
                <div class="flex min-w-0 items-center gap-2">
                  <span
                    class="agency-reports__dot inline-block size-2 shrink-0 rounded-full"
                    aria-hidden="true"
                    :style="projectHueStyle(row.projectId)"
                  />
                  <span class="truncate text-xs font-bold text-highlighted">
                    {{ row.projectName }}
                  </span>
                </div>
                <span class="font-mono text-[11px] tabular-nums text-muted">
                  {{ formatHours(row.hours) }}
                </span>
              </div>
              <p class="mt-1 truncate text-[11px] text-muted">{{ row.clientName }}</p>
              <div class="mt-2 h-1.5 rounded-full bg-elevated">
                <div
                  class="agency-reports__hue-bar h-full rounded-full"
                  :style="{
                    width: `${relShare(row.hours, summary.totalHours)}%`,
                    ...projectHueStyle(row.projectId),
                  }"
                />
              </div>
            </li>
            <li
              v-if="summary.timeDistributionByProject.length === 0"
              class="px-4 py-6 text-center text-xs text-muted"
            >
              No data.
            </li>
          </ul>
        </article>

        <!-- Team activity -->
        <article class="rounded-2xl border border-default bg-default">
          <header class="border-b border-default px-4 py-3">
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              Team activity
            </p>
          </header>
          <ul class="divide-y divide-default">
            <li v-for="row in summary.teamActivity" :key="row.userId" class="px-4 py-3">
              <div class="flex items-baseline justify-between gap-3">
                <span class="truncate text-xs font-bold text-highlighted">{{ row.userName }}</span>
                <span class="font-mono text-[11px] tabular-nums text-muted">
                  {{ formatHours(row.hours) }}
                </span>
              </div>
              <p class="mt-1 truncate text-[11px] text-muted">{{ row.userEmail }}</p>
              <div class="mt-2 h-1.5 rounded-full bg-elevated">
                <div
                  class="h-full rounded-full bg-primary"
                  :style="{ width: `${relShare(row.hours, summary.totalHours)}%` }"
                />
              </div>
            </li>
            <li
              v-if="summary.teamActivity.length === 0"
              class="px-4 py-6 text-center text-xs text-muted"
            >
              No data.
            </li>
          </ul>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.agency-reports__dot,
.agency-reports__hue-bar {
  background-color: var(--project-hue, var(--ui-color-primary-500));
}
:global(.dark) .agency-reports__dot,
:global(.dark) .agency-reports__hue-bar {
  background-color: var(--project-hue-dark, var(--ui-color-primary-400));
}
</style>
