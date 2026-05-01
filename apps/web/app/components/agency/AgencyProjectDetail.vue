<script setup lang="ts">
/**
 * Agency Project Detail — drill-down surface.
 *
 * Reached via `?section=projects&project=<id>` so it deep-links and survives
 * back/forward. Fetches the last 30 days of entries for this project across
 * all members via `reports.listEntries` and renders three dense blocks:
 *
 * 1. Header band: hue, name, client crumb, totals (this week / last 30).
 * 2. Hours by member (bar list, this week).
 * 3. Recent activity: dense entries log with date · member · duration ·
 *    description.
 *
 * Aspirational: budget burn (no rates/budgets backend yet — honest "Not set"
 * surface that teaches the eventual shape).
 */
import { useQuery } from "@tanstack/vue-query";

import { formatDuration } from "~/utils/format-duration";
import { getErrorMessage } from "~/utils/get-error-message";
import { projectHueStyle } from "~/utils/project-palette";

const props = defineProps<{
  teamId: string;
  projectId: string;
}>();

const emit = defineEmits<{
  back: [];
}>();

const orpc = useOrpc();

const teamId = computed(() => props.teamId);
const projectId = computed(() => props.projectId);

function startOfWeekUtcIso(): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date.toISOString();
}

const range = computed(() => {
  const now = new Date();
  // 30-day window for the activity log; "this week" totals are derived
  // client-side from the same dataset.
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  );
  return { from: start.toISOString(), to: end.toISOString() };
});

// Project metadata via the cheap list query; saves a round-trip vs. a dedicated
// get-by-id endpoint that doesn't exist yet.
const projectsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.projects.list.queryOptions({ input: { teamId: teamId.value } }),
    enabled: Boolean(teamId.value),
  })),
);

const project = computed(
  () => (projectsQuery.data.value?.items ?? []).find((entry) => entry.id === projectId.value) ?? null,
);

const entriesQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.reports.listEntries.queryOptions({
      input: {
        teamId: teamId.value,
        projectId: projectId.value,
        from: range.value.from,
        to: range.value.to,
        page: 1,
        pageSize: 100,
      },
    }),
    enabled: Boolean(teamId.value) && Boolean(projectId.value),
  })),
);

const entries = computed(() => entriesQuery.data.value?.items ?? []);

const weekStartIso = computed(() => startOfWeekUtcIso());

const totalsThisWeek = computed(() => {
  const cutoff = new Date(weekStartIso.value).getTime();
  return entries.value
    .filter((entry) => new Date(entry.startedAt).getTime() >= cutoff)
    .reduce((sum, entry) => sum + entry.durationSeconds, 0);
});

const totalsLast30 = computed(() =>
  entries.value.reduce((sum, entry) => sum + entry.durationSeconds, 0),
);

const hoursByMemberThisWeek = computed(() => {
  const cutoff = new Date(weekStartIso.value).getTime();
  const map = new Map<string, { name: string; seconds: number }>();
  for (const entry of entries.value) {
    if (new Date(entry.startedAt).getTime() < cutoff) continue;
    const existing = map.get(entry.userId);
    map.set(entry.userId, {
      name: entry.userName,
      seconds: (existing?.seconds ?? 0) + entry.durationSeconds,
    });
  }
  return [...map.entries()]
    .map(([userId, value]) => ({ userId, ...value }))
    .sort((a, b) => b.seconds - a.seconds);
});

const memberSecondsMax = computed(() =>
  hoursByMemberThisWeek.value.reduce((max, row) => Math.max(max, row.seconds), 0),
);

const recentEntries = computed(() =>
  [...entries.value]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 25),
);

function formatEntryDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatEntryTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const isLoading = computed(
  () => projectsQuery.isPending.value || entriesQuery.isPending.value,
);
const isError = computed(
  () => Boolean(projectsQuery.error.value) || Boolean(entriesQuery.error.value),
);
</script>

<template>
  <div class="agency-project-detail space-y-4">
    <!-- Back nav -->
    <div class="flex items-center gap-2">
      <UButton
        label="Back to projects"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        size="xs"
        @click="emit('back')"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div class="h-24 animate-pulse rounded-2xl bg-elevated/60" />
      <div class="grid gap-3 lg:grid-cols-2">
        <div class="h-64 animate-pulse rounded-2xl bg-elevated/60" />
        <div class="h-64 animate-pulse rounded-2xl bg-elevated/60" />
      </div>
    </div>

    <!-- Error -->
    <div
      v-else-if="isError"
      class="rounded-2xl border border-error/30 bg-error/5 p-6 text-center"
    >
      <UIcon name="i-lucide-alert-triangle" class="mx-auto size-5 text-error" />
      <p class="mt-3 text-sm font-bold text-highlighted">Couldn't load this project.</p>
      <p class="mt-1 text-xs text-muted">
        {{ getErrorMessage(entriesQuery.error.value ?? projectsQuery.error.value, "Try refreshing.") }}
      </p>
      <UButton
        label="Retry"
        color="neutral"
        variant="soft"
        size="xs"
        class="mt-3"
        @click="entriesQuery.refetch()"
      />
    </div>

    <!-- Project not found (e.g. stale link) -->
    <div
      v-else-if="!project"
      class="rounded-2xl border border-dashed border-default bg-muted/20 p-10 text-center"
    >
      <UIcon name="i-lucide-folder-x" class="mx-auto size-7 text-muted" />
      <p class="mt-4 text-sm font-bold text-highlighted">Project not found.</p>
      <p class="mt-1 text-xs text-muted">It may have been removed or moved to another team.</p>
    </div>

    <template v-else>
      <!-- Header band -->
      <div class="rounded-2xl border border-default bg-default p-5">
        <div class="flex flex-wrap items-baseline justify-between gap-4">
          <div class="min-w-0 flex-1">
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              {{ project.clientName }}
            </p>
            <h2 class="mt-1 flex min-w-0 items-center gap-2.5">
              <span
                class="agency-project-detail__dot inline-block size-2.5 shrink-0 rounded-full"
                aria-hidden="true"
                :style="projectHueStyle(project.id)"
              />
              <span class="truncate text-lg font-bold text-highlighted">
                {{ project.name }}
              </span>
            </h2>
          </div>
          <div class="flex items-center gap-6">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                This week
              </p>
              <p
                class="mt-1 font-mono text-xl font-bold tabular-nums"
                :class="totalsThisWeek > 0 ? 'text-highlighted' : 'text-dimmed'"
              >
                {{ formatDuration(totalsThisWeek, "short") }}
              </p>
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                Last 30 days
              </p>
              <p
                class="mt-1 font-mono text-xl font-bold tabular-nums"
                :class="totalsLast30 > 0 ? 'text-highlighted' : 'text-dimmed'"
              >
                {{ formatDuration(totalsLast30, "short") }}
              </p>
            </div>
          </div>
        </div>

        <!-- Aspirational budget bar -->
        <div class="mt-5 border-t border-default pt-4">
          <div class="flex items-center justify-between">
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              Budget burn
            </p>
            <p class="text-[11px] text-dimmed">Not set · configure rates in Settings</p>
          </div>
          <div class="mt-2 h-1.5 rounded-full bg-elevated">
            <div class="h-full w-0 rounded-full bg-muted" />
          </div>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-[20rem,1fr]">
        <!-- Hours by member -->
        <article class="rounded-2xl border border-default bg-default">
          <header class="border-b border-default px-4 py-3">
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              Hours by member · this week
            </p>
          </header>
          <ul v-if="hoursByMemberThisWeek.length > 0" class="divide-y divide-default">
            <li v-for="row in hoursByMemberThisWeek" :key="row.userId" class="px-4 py-3">
              <div class="flex items-baseline justify-between gap-3">
                <span class="truncate text-xs font-bold text-highlighted">{{ row.name }}</span>
                <span class="font-mono text-[11px] tabular-nums text-muted">
                  {{ formatDuration(row.seconds, "short") }}
                </span>
              </div>
              <div class="mt-2 h-1.5 rounded-full bg-elevated">
                <div
                  class="agency-project-detail__hue-bar h-full rounded-full"
                  :style="{
                    width: memberSecondsMax > 0
                      ? `${Math.round((row.seconds / memberSecondsMax) * 100)}%`
                      : '0%',
                    ...projectHueStyle(project.id),
                  }"
                />
              </div>
            </li>
          </ul>
          <div v-else class="px-4 py-8 text-center">
            <p class="text-xs text-muted">No time logged this week.</p>
          </div>
        </article>

        <!-- Recent activity -->
        <article class="rounded-2xl border border-default bg-default">
          <header class="border-b border-default px-4 py-3">
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              Recent activity · last 30 days
            </p>
          </header>

          <div v-if="recentEntries.length === 0" class="px-4 py-12 text-center">
            <UIcon name="i-lucide-clock" class="mx-auto size-5 text-muted" />
            <p class="mt-3 text-xs text-muted">No activity in the last 30 days.</p>
          </div>

          <ul v-else class="divide-y divide-default">
            <li
              v-for="entry in recentEntries"
              :key="entry.id"
              class="grid grid-cols-[5.5rem,8rem,1fr,4.5rem] items-baseline gap-3 px-4 py-2.5 text-xs"
            >
              <span class="font-mono tabular-nums text-muted">
                {{ formatEntryDate(entry.startedAt) }}
                <span class="text-dimmed">{{ formatEntryTime(entry.startedAt) }}</span>
              </span>
              <span class="truncate font-bold text-highlighted">{{ entry.userName }}</span>
              <span class="truncate text-muted">
                {{ entry.description || "—" }}
              </span>
              <span class="text-right font-mono font-bold tabular-nums text-highlighted">
                {{ formatDuration(entry.durationSeconds, "short") }}
              </span>
            </li>
          </ul>
        </article>
      </div>
    </template>
  </div>
</template>

<style scoped>
.agency-project-detail__dot,
.agency-project-detail__hue-bar {
  background-color: var(--project-hue, var(--ui-color-primary-500));
}
:global(.dark) .agency-project-detail__dot,
:global(.dark) .agency-project-detail__hue-bar {
  background-color: var(--project-hue-dark, var(--ui-color-primary-400));
}
</style>
