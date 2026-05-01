<script setup lang="ts">
/**
 * Agency Resourcing — member × week capacity heatmap.
 *
 * Reads the `capacity.list` stub for the next 4 weeks. Today the stub
 * returns an empty array so the surface lands on its empty state. The
 * grid composition below is the production shape: when capacity rows
 * arrive each cell colors by utilization (logged + booked / capacity)
 * on a state-success → state-warning → state-error scale. Anchor:
 * Productive.io Resourcing without the Salesforce density.
 */
import { useQuery } from "@tanstack/vue-query";

import { formatDuration } from "~/utils/format-duration";
import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
  teamId: string;
}>();

const orpc = useOrpc();

const teamId = computed(() => props.teamId);

const WEEKS_AHEAD = 4;

function startOfWeekUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const diff = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

const weekStartIso = computed(() => startOfWeekUtc(new Date()).toISOString());

const upcomingWeekStarts = computed(() => {
  const base = startOfWeekUtc(new Date());
  return Array.from({ length: WEEKS_AHEAD }, (_, index) => {
    const next = new Date(base);
    next.setUTCDate(next.getUTCDate() + index * 7);
    return next;
  });
});

const capacityQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.capacity.list.queryOptions({
      input: {
        teamId: teamId.value,
        weekStart: weekStartIso.value,
        weeks: WEEKS_AHEAD,
      },
    }),
    enabled: Boolean(teamId.value),
  })),
);

const weeks = computed(() => capacityQuery.data.value?.weeks ?? []);

// Aggregate to member rows so the same dataset renders as a heatmap once
// the stub returns data. Today this collapses to an empty array.
type MemberRow = {
  userId: string;
  userName: string;
  cells: { weekStart: string; capacity: number; logged: number; booked: number }[];
};

const memberRows = computed<MemberRow[]>(() => {
  const map = new Map<string, MemberRow>();
  for (const week of weeks.value) {
    for (const member of week.members) {
      const existing = map.get(member.userId) ?? {
        userId: member.userId,
        userName: member.userName,
        cells: [],
      };
      existing.cells.push({
        weekStart: week.weekStart,
        capacity: member.capacitySeconds,
        logged: member.loggedSeconds,
        booked: member.bookedSeconds,
      });
      map.set(member.userId, existing);
    }
  }
  return [...map.values()];
});

const isLoading = computed(() => capacityQuery.isPending.value);
const isError = computed(() => Boolean(capacityQuery.error.value));

function formatWeekLabel(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function utilizationPct(cell: MemberRow["cells"][number]): number {
  if (cell.capacity <= 0) return 0;
  return Math.round(((cell.logged + cell.booked) / cell.capacity) * 100);
}

function utilizationTone(pct: number): string {
  if (pct === 0) return "bg-elevated text-dimmed";
  if (pct < 70) return "bg-success/15 text-success";
  if (pct < 95) return "bg-warning/20 text-warning";
  return "bg-error/20 text-error";
}
</script>

<template>
  <div class="agency-resourcing space-y-4">
    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div class="h-12 animate-pulse rounded-2xl bg-elevated/60" />
      <div class="h-64 animate-pulse rounded-2xl bg-elevated/60" />
    </div>

    <!-- Error -->
    <div
      v-else-if="isError"
      class="rounded-2xl border border-error/30 bg-error/5 p-6 text-center"
    >
      <UIcon name="i-lucide-alert-triangle" class="mx-auto size-5 text-error" />
      <p class="mt-3 text-sm font-bold text-highlighted">Couldn't load capacity.</p>
      <p class="mt-1 text-xs text-muted">
        {{ getErrorMessage(capacityQuery.error.value, "Try refreshing.") }}
      </p>
      <UButton
        label="Retry"
        color="neutral"
        variant="soft"
        size="xs"
        class="mt-3"
        @click="capacityQuery.refetch()"
      />
    </div>

    <template v-else>
      <!-- Heatmap shell, always rendered. The header rehearses the eventual
           grid so the empty state teaches the shape rather than hiding it. -->
      <div class="overflow-x-auto rounded-2xl border border-default bg-default">
        <table class="w-full min-w-[40rem] text-xs">
          <thead class="border-b border-default bg-muted">
            <tr class="text-left text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              <th class="w-56 px-4 py-2.5 font-bold">Member</th>
              <th
                v-for="(weekStart, index) in upcomingWeekStarts"
                :key="weekStart.toISOString()"
                class="px-3 py-2.5 text-center font-bold"
              >
                {{ index === 0 ? "This week" : formatWeekLabel(weekStart.toISOString()) }}
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="memberRows.length === 0">
              <td
                :colspan="upcomingWeekStarts.length + 1"
                class="px-4 py-12 text-center"
              >
                <UIcon
                  name="i-lucide-calendar-range"
                  class="mx-auto size-6 text-muted"
                />
                <p class="mt-3 text-sm font-bold text-highlighted">
                  Capacity isn't set.
                </p>
                <p class="mx-auto mt-1 max-w-md text-xs text-muted">
                  Add weekly hours per member in Settings · Member rates to
                  see utilization across the team. Once set, this grid colors
                  each cell by how much of a member's week is committed.
                </p>
                <ul class="mx-auto mt-5 max-w-md space-y-1.5 text-left text-[11px] text-muted">
                  <li class="flex items-start gap-2">
                    <UIcon
                      name="i-lucide-corner-down-right"
                      class="mt-0.5 size-3.5 shrink-0 text-dimmed"
                    />
                    <span>Green under 70%, amber 70–94%, red at or over 95%.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <UIcon
                      name="i-lucide-corner-down-right"
                      class="mt-0.5 size-3.5 shrink-0 text-dimmed"
                    />
                    <span>Click a cell to rebalance assignments without leaving the page.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <UIcon
                      name="i-lucide-corner-down-right"
                      class="mt-0.5 size-3.5 shrink-0 text-dimmed"
                    />
                    <span>Forecast next week alongside committed project budgets.</span>
                  </li>
                </ul>
              </td>
            </tr>

            <tr
              v-for="row in memberRows"
              :key="row.userId"
              class="border-b border-default last:border-b-0"
            >
              <td class="px-4 py-3">
                <span class="truncate font-bold text-highlighted">{{ row.userName }}</span>
              </td>
              <td
                v-for="cell in row.cells"
                :key="cell.weekStart"
                class="px-2 py-2"
              >
                <div
                  class="flex h-12 flex-col items-center justify-center rounded-xl text-[11px] font-bold"
                  :class="utilizationTone(utilizationPct(cell))"
                >
                  <span class="font-mono tabular-nums">{{ utilizationPct(cell) }}%</span>
                  <span class="font-mono text-[10px] tabular-nums opacity-70">
                    {{ formatDuration(cell.logged + cell.booked, "short") }}
                    /
                    {{ formatDuration(cell.capacity, "short") }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
