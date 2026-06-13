<script setup lang="ts">
/**
 * Agency Resourcing — member × week capacity heatmap.
 */
import { useQuery } from "@tanstack/vue-query";

import { formatDuration } from "~/utils/format-duration";
import { getErrorMessage } from "~/utils/get-error-message";
import { withAgencyLiveQueryOptions } from "~/utils/agency-query-options";

const props = defineProps<{
  teamId: string;
}>();

const orpc = useOrpc();
const agencyOps = useAgencyOpsStore();

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
  computed(() =>
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.capacity.list.queryOptions({
        input: {
          teamId: teamId.value,
          weekStart: weekStartIso.value,
          weeks: WEEKS_AHEAD,
        },
      }),
      enabled: Boolean(teamId.value),
    }),
  ),
);

const capacityQueryKey = computed(
  () =>
    orpc.agencyOps.capacity.list.queryOptions({
      input: {
        teamId: teamId.value,
        weekStart: weekStartIso.value,
        weeks: WEEKS_AHEAD,
      },
    }).queryKey,
);

watch(
  capacityQueryKey,
  (next, prev) => {
    if (prev) agencyOps.unregisterCapacityQuery(prev);
    if (teamId.value) {
      agencyOps.registerCapacityQuery({ queryKey: next, teamId: teamId.value });
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  agencyOps.unregisterCapacityQuery(capacityQueryKey.value);
});

const weeks = computed(() => capacityQuery.data.value?.weeks ?? []);

// Aggregate to member rows so the same dataset renders as a heatmap once
// the stub returns data.
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

// Cell popover: shows utilization breakdown + capacity edit input.
const activeCellPopover = ref<{ userId: string; weekStart: string } | null>(null);
// Local draft hours value (hours as string) for the capacity input.
const capacityDraftHours = ref<string>("");

function openCellPopover(userId: string, weekStart: string, currentCapacitySeconds: number) {
  if (
    activeCellPopover.value?.userId === userId &&
    activeCellPopover.value?.weekStart === weekStart
  ) {
    activeCellPopover.value = null;
    return;
  }
  activeCellPopover.value = { userId, weekStart };
  capacityDraftHours.value =
    currentCapacitySeconds > 0 ? String(Math.round(currentCapacitySeconds / 3600)) : "";
}

function closeCellPopover() {
  activeCellPopover.value = null;
}

async function saveCapacity(userId: string, weekStart: string) {
  const hours = parseFloat(capacityDraftHours.value);
  if (isNaN(hours) || hours < 0) return;

  // Snap weekStart to the nearest Monday (UTC) — the server requires it.
  const d = new Date(weekStart);
  const diff = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  const mondayIso = d.toISOString();

  await agencyOps.setCapacity(
    {
      teamId: teamId.value,
      userId,
      weekStart: mondayIso,
      capacitySeconds: Math.round(hours * 3600),
    },
    { onSuccess: closeCellPopover },
  );
}

function getCell(row: MemberRow, weekStart: string): MemberRow["cells"][number] | undefined {
  return row.cells.find((cell) => cell.weekStart === weekStart);
}

const emit = defineEmits<{
  "update:segment": [value: string];
}>();
</script>

<template>
  <div class="agency-resourcing space-y-4">
    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div class="h-12 animate-pulse rounded-2xl bg-elevated/60" />
      <div class="h-64 animate-pulse rounded-2xl bg-elevated/60" />
    </div>

    <!-- Error -->
    <div v-else-if="isError" class="rounded-2xl border border-error/30 bg-error/5 p-6 text-center">
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
              <td :colspan="upcomingWeekStarts.length + 1" class="px-4 py-12 text-center">
                <UIcon name="i-lucide-calendar-range" class="mx-auto size-6 text-muted" />
                <p class="mt-3 text-sm font-bold text-highlighted">Capacity isn't set.</p>
                <p class="mx-auto mt-1 max-w-sm text-xs text-muted">
                  Add weekly hours per member in Settings to see utilization across the team. Once
                  set, this grid colors each cell by how much of a member's week is committed.
                </p>
                <UButton
                  label="Go to Settings"
                  color="neutral"
                  variant="soft"
                  size="xs"
                  icon="i-lucide-settings"
                  class="mt-4"
                  @click="emit('update:segment', 'settings')"
                />
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
                v-for="(weekStart, colIndex) in upcomingWeekStarts"
                :key="weekStart.toISOString()"
                class="px-2 py-2"
              >
                <UPopover
                  :open="
                    activeCellPopover?.userId === row.userId &&
                    activeCellPopover?.weekStart === weekStart.toISOString()
                  "
                  :content="{ align: 'center' }"
                  @update:open="
                    (open) => {
                      if (!open) closeCellPopover();
                    }
                  "
                >
                  <button
                    type="button"
                    class="flex h-12 w-full flex-col items-center justify-center rounded-xl text-[11px] font-bold transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    :class="
                      utilizationTone(
                        utilizationPct(
                          getCell(row, weekStart.toISOString()) ?? {
                            weekStart: weekStart.toISOString(),
                            capacity: 0,
                            logged: 0,
                            booked: 0,
                          },
                        ),
                      )
                    "
                    :aria-label="`${row.userName}, ${colIndex === 0 ? 'this week' : formatWeekLabel(weekStart.toISOString())}: ${utilizationPct(getCell(row, weekStart.toISOString()) ?? { weekStart: weekStart.toISOString(), capacity: 0, logged: 0, booked: 0 })}% utilized`"
                    @click="
                      openCellPopover(
                        row.userId,
                        weekStart.toISOString(),
                        getCell(row, weekStart.toISOString())?.capacity ?? 0,
                      )
                    "
                  >
                    <span class="font-mono tabular-nums">
                      {{
                        utilizationPct(
                          getCell(row, weekStart.toISOString()) ?? {
                            weekStart: weekStart.toISOString(),
                            capacity: 0,
                            logged: 0,
                            booked: 0,
                          },
                        )
                      }}%
                    </span>
                    <span class="font-mono text-[10px] tabular-nums opacity-70">
                      {{
                        formatDuration(
                          (getCell(row, weekStart.toISOString())?.logged ?? 0) +
                            (getCell(row, weekStart.toISOString())?.booked ?? 0),
                          "short",
                        )
                      }}
                      /
                      {{
                        formatDuration(
                          getCell(row, weekStart.toISOString())?.capacity ?? 0,
                          "short",
                        )
                      }}
                    </span>
                  </button>
                  <template #content>
                    <div class="w-52 p-3 text-xs">
                      <p
                        class="font-bold uppercase tracking-[0.16em] text-muted"
                        style="font-size: 10px"
                      >
                        {{
                          colIndex === 0 ? "This week" : formatWeekLabel(weekStart.toISOString())
                        }}
                      </p>
                      <ul class="mt-2 space-y-1.5">
                        <li class="flex items-center justify-between gap-4">
                          <span class="text-muted">Logged</span>
                          <span class="font-mono tabular-nums text-highlighted">
                            {{
                              formatDuration(
                                getCell(row, weekStart.toISOString())?.logged ?? 0,
                                "short",
                              )
                            }}
                          </span>
                        </li>
                        <li class="flex items-center justify-between gap-4">
                          <span class="text-muted">Booked</span>
                          <span class="font-mono tabular-nums text-highlighted">
                            {{
                              formatDuration(
                                getCell(row, weekStart.toISOString())?.booked ?? 0,
                                "short",
                              )
                            }}
                          </span>
                        </li>
                        <li
                          class="flex items-center justify-between gap-4 border-t border-default pt-1.5"
                        >
                          <span class="text-muted">Capacity</span>
                          <span class="font-mono tabular-nums text-highlighted">
                            {{
                              formatDuration(
                                getCell(row, weekStart.toISOString())?.capacity ?? 0,
                                "short",
                              )
                            }}
                          </span>
                        </li>
                      </ul>
                      <div class="mt-3 border-t border-default pt-3">
                        <label class="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                          Set capacity (hours)
                        </label>
                        <div class="mt-1.5 flex items-center gap-2">
                          <UInput
                            v-model="capacityDraftHours"
                            type="number"
                            min="0"
                            step="1"
                            size="xs"
                            class="flex-1"
                            placeholder="e.g. 40"
                            @keydown.enter="saveCapacity(row.userId, weekStart.toISOString())"
                          />
                          <UButton
                            label="Save"
                            color="primary"
                            size="xs"
                            :loading="agencyOps.isCapacityMutationPending"
                            @click="saveCapacity(row.userId, weekStart.toISOString())"
                          />
                        </div>
                      </div>
                    </div>
                  </template>
                </UPopover>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Legend (shown only when there's data) -->
      <div
        v-if="memberRows.length > 0"
        class="flex flex-wrap items-center gap-4 px-1 text-[11px] text-muted"
      >
        <span class="font-bold uppercase tracking-[0.16em]">Utilization</span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block size-2.5 rounded-sm bg-success/40" aria-hidden="true" />
          Under 70%
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block size-2.5 rounded-sm bg-warning/40" aria-hidden="true" />
          70–94%
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block size-2.5 rounded-sm bg-error/40" aria-hidden="true" />
          95% or over
        </span>
      </div>
    </template>
  </div>
</template>
