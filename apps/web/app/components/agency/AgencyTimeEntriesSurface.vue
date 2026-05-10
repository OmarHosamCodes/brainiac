<script setup lang="ts">
import type { SelectMenuItem } from "@nuxt/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";

import AgencyTimeEntryActions from "~/components/agency/AgencyTimeEntryActions.vue";
import AgencyTimeEntryDraftForm from "~/components/agency/AgencyTimeEntryDraftForm.vue";
import { useAgencyTimeTrackingStore } from "~/stores/agency-time-tracking";
import { formatDuration } from "~/utils/format-duration";
import { getErrorMessage } from "~/utils/get-error-message";
import { projectHueStyle } from "~/utils/project-palette";

const props = defineProps<{
  teamId: string;
}>();

const orpc = useOrpc();
const queryClient = useQueryClient();
const toast = useToast();
const agencyTimeTrackingStore = useAgencyTimeTrackingStore();
const { deletingEntryIds } = storeToRefs(agencyTimeTrackingStore);

type ViewMode = "week" | "day" | "log";
type EntryDraft = {
  mode: "create" | "update";
  entryId: string | null;
  projectId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationInput: string;
  description: string;
  linkUrl: string;
  tagIds: string[];
};

function getWeekStartUtc(reference: Date): Date {
  const date = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()),
  );
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - ((day + 6) % 7));
  return date;
}

function addDaysUtc(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function timeKey(value: string): string {
  return value.slice(11, 16);
}

function normalizeInputValue(value: string | number | undefined): string {
  return value === undefined ? "" : String(value);
}

function parseDurationToSeconds(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) {
    const hours = Number(colonMatch[1]);
    const minutes = Number(colonMatch[2]);
    if (minutes >= 60) return null;
    return hours * 3_600 + minutes * 60;
  }
  const decimalMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (decimalMatch) return Math.round(Number(decimalMatch[1]) * 3_600);
  const hmMatch = trimmed.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/i);
  if (hmMatch && (hmMatch[1] || hmMatch[2])) {
    const hours = hmMatch[1] ? Number(hmMatch[1]) : 0;
    const minutes = hmMatch[2] ? Number(hmMatch[2]) : 0;
    if (minutes >= 60) return null;
    return hours * 3_600 + minutes * 60;
  }
  const minutesOnly = trimmed.match(/^(\d+)\s*m$/i);
  if (minutesOnly) return Number(minutesOnly[1]) * 60;
  return null;
}

function formatSecondsAsInput(seconds: number): string {
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.round((seconds % 3_600) / 60);
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function combineDateTime(day: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const parsed = new Date(`${day}T${time}:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const teamId = computed(() => props.teamId);
const todayKey = computed(() => dateKey(new Date()));
const weekAnchor = ref<Date>(getWeekStartUtc(new Date()));
const viewMode = ref<ViewMode>("week");
const selectedDayKey = ref(todayKey.value);
const activeDraft = ref<EntryDraft | null>(null);
const draftError = ref<string | null>(null);

const weekStart = computed(() => weekAnchor.value);
const weekEnd = computed(() => addDaysUtc(weekStart.value, 6));
const weekDays = computed(() =>
  Array.from({ length: 7 }, (_, offset) => {
    const date = addDaysUtc(weekStart.value, offset);
    const key = dateKey(date);
    return {
      key,
      date,
      weekday: date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      dayNumber: date.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" }),
      isToday: key === todayKey.value,
    };
  }),
);

const weekRangeLabel = computed(() => {
  const start = weekStart.value;
  const end = weekEnd.value;
  const fmt = (date: Date, opts: Intl.DateTimeFormatOptions) =>
    date.toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${fmt(start, { month: "short", day: "numeric" })} to ${fmt(end, { day: "numeric", year: "numeric" })}`;
  }
  return `${fmt(start, { month: "short", day: "numeric" })} to ${fmt(end, { month: "short", day: "numeric", year: "numeric" })}`;
});

const isCurrentWeek = computed(
  () => dateKey(weekStart.value) === dateKey(getWeekStartUtc(new Date())),
);

const entriesPageSize = 100;
const entriesQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.timeEntries.listMine.queryOptions({
      input: {
        teamId: teamId.value,
        anchorDate: new Date(weekStart.value.getTime() + 12 * 60 * 60 * 1_000).toISOString(),
        page: 1,
        pageSize: entriesPageSize,
      },
    }),
    enabled: Boolean(teamId.value),
  })),
);
const entriesQueryKey = computed(
  () =>
    orpc.agencyOps.timeEntries.listMine.queryOptions({
      input: {
        teamId: teamId.value,
        anchorDate: new Date(weekStart.value.getTime() + 12 * 60 * 60 * 1_000).toISOString(),
        page: 1,
        pageSize: entriesPageSize,
      },
    }).queryKey,
);

const projectsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.projects.list.queryOptions({ input: { teamId: teamId.value } }),
    enabled: Boolean(teamId.value),
  })),
);
const tagsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.tags.list.queryOptions({ input: { teamId: teamId.value } }),
    enabled: Boolean(teamId.value),
  })),
);
const activeTimerQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.timer.getActive.queryOptions({
      input: { teamId: teamId.value || undefined },
    }),
    enabled: Boolean(teamId.value),
  })),
);

const createManualMutation = useMutation(orpc.agencyOps.timeEntries.createManual.mutationOptions());
const updateEntryMutation = useMutation(orpc.agencyOps.timeEntries.updateMine.mutationOptions());

const projects = computed(() => projectsQuery.data.value?.items ?? []);
const tags = computed(() => tagsQuery.data.value?.items ?? []);
const activeTimer = computed(() => activeTimerQuery.data.value?.timer ?? null);
const entries = computed(() => entriesQuery.data.value?.items ?? []);
type EntryRow = (typeof entries.value)[number];
const isLoading = computed(() => entriesQuery.isPending.value || projectsQuery.isPending.value);
const isError = computed(() => Boolean(entriesQuery.error.value));
const isSaving = computed(
  () => createManualMutation.isPending.value || updateEntryMutation.isPending.value,
);

const projectSelectItems = computed<SelectMenuItem[]>(() =>
  projects.value.map((project) => ({
    label: `${project.name} (${project.clientName})`,
    value: project.id,
  })),
);

type ProjectRow = {
  projectId: string;
  projectName: string;
  clientName: string;
  totalSeconds: number;
  perDay: Map<string, number>;
};

const grid = computed<ProjectRow[]>(() => {
  const rowMap = new Map<string, ProjectRow>();
  for (const entry of entries.value) {
    const existing =
      rowMap.get(entry.projectId) ??
      ({
        projectId: entry.projectId,
        projectName: entry.projectName,
        clientName: entry.clientName,
        totalSeconds: 0,
        perDay: new Map<string, number>(),
      } satisfies ProjectRow);
    const key = entry.startedAt.slice(0, 10);
    existing.totalSeconds += entry.durationSeconds;
    existing.perDay.set(key, (existing.perDay.get(key) ?? 0) + entry.durationSeconds);
    rowMap.set(entry.projectId, existing);
  }
  return [...rowMap.values()].sort((a, b) => a.projectName.localeCompare(b.projectName));
});

const dailyTotals = computed(() => {
  const totals = new Map<string, number>();
  for (const row of grid.value) {
    for (const [key, seconds] of row.perDay.entries()) {
      totals.set(key, (totals.get(key) ?? 0) + seconds);
    }
  }
  return totals;
});
const weekTotalSeconds = computed(() => grid.value.reduce((sum, row) => sum + row.totalSeconds, 0));
const selectedDay = computed(
  () => weekDays.value.find((day) => day.key === selectedDayKey.value) ?? weekDays.value[0]!,
);
const selectedDayEntries = computed(() =>
  entries.value
    .filter((entry) => entry.startedAt.slice(0, 10) === selectedDayKey.value)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
);
const selectedDayTotalSeconds = computed(() =>
  selectedDayEntries.value.reduce((sum, entry) => sum + entry.durationSeconds, 0),
);
const logEntries = computed(() =>
  [...entries.value].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
);

watch(weekDays, (days) => {
  if (!days.some((day) => day.key === selectedDayKey.value)) {
    selectedDayKey.value = days[0]?.key ?? todayKey.value;
  }
});

watch(teamId, () => {
  activeDraft.value = null;
  draftError.value = null;
});

function goPrevWeek() {
  weekAnchor.value = addDaysUtc(weekAnchor.value, -7);
}
function goNextWeek() {
  weekAnchor.value = addDaysUtc(weekAnchor.value, 7);
}
function goThisWeek() {
  weekAnchor.value = getWeekStartUtc(new Date());
  selectedDayKey.value = todayKey.value;
}
function goPrevDay() {
  const next = addDaysUtc(new Date(`${selectedDayKey.value}T12:00:00.000Z`), -1);
  selectedDayKey.value = dateKey(next);
  weekAnchor.value = getWeekStartUtc(next);
}
function goNextDay() {
  const next = addDaysUtc(new Date(`${selectedDayKey.value}T12:00:00.000Z`), 1);
  selectedDayKey.value = dateKey(next);
  weekAnchor.value = getWeekStartUtc(next);
}

function getCellSeconds(row: ProjectRow, day: string): number {
  return row.perDay.get(day) ?? 0;
}

function getCellEntries(projectId: string, day: string) {
  return entries.value
    .filter((entry) => entry.projectId === projectId && entry.startedAt.slice(0, 10) === day)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

function isRunningCell(row: ProjectRow, day: string): boolean {
  if (!activeTimer.value) return false;
  return (
    activeTimer.value.projectId === row.projectId &&
    activeTimer.value.startedAt.slice(0, 10) === day
  );
}

function createBlankDraft(projectId = "", day = selectedDayKey.value): EntryDraft {
  return {
    mode: "create",
    entryId: null,
    projectId,
    date: day,
    startTime: "09:00",
    endTime: "10:00",
    durationInput: "1:00",
    description: "",
    linkUrl: "",
    tagIds: [],
  };
}

function openAdd(projectId = "", day = selectedDayKey.value) {
  activeDraft.value = createBlankDraft(projectId, day);
  selectedDayKey.value = day;
  draftError.value = null;
}

function openEdit(entry: EntryRow) {
  activeDraft.value = {
    mode: "update",
    entryId: entry.id,
    projectId: entry.projectId,
    date: entry.startedAt.slice(0, 10),
    startTime: timeKey(entry.startedAt),
    endTime: timeKey(entry.endedAt),
    durationInput: formatSecondsAsInput(entry.durationSeconds),
    description: entry.description,
    linkUrl: entry.linkUrl ?? "",
    tagIds: entry.tags.map((tag) => tag.id),
  };
  selectedDayKey.value = entry.startedAt.slice(0, 10);
  draftError.value = null;
}

function closeDraft() {
  activeDraft.value = null;
  draftError.value = null;
}

function toggleDraftTag(tagId: string) {
  if (!activeDraft.value) return;
  activeDraft.value.tagIds = activeDraft.value.tagIds.includes(tagId)
    ? activeDraft.value.tagIds.filter((id) => id !== tagId)
    : [...activeDraft.value.tagIds, tagId];
}

function setDraftDuration(value: string | number | undefined) {
  if (!activeDraft.value) return;
  const duration = normalizeInputValue(value);
  activeDraft.value.durationInput = duration;
  const seconds = parseDurationToSeconds(duration);
  const startAt = combineDateTime(activeDraft.value.date, activeDraft.value.startTime);
  if (!seconds || !startAt) return;
  activeDraft.value.endTime = new Date(startAt.getTime() + seconds * 1_000)
    .toISOString()
    .slice(11, 16);
}

function setDraftEndTime(value: string | number | undefined) {
  if (!activeDraft.value) return;
  activeDraft.value.endTime = normalizeInputValue(value);
  const startAt = combineDateTime(activeDraft.value.date, activeDraft.value.startTime);
  const endAt = combineDateTime(activeDraft.value.date, activeDraft.value.endTime);
  if (!startAt || !endAt || endAt <= startAt) return;
  activeDraft.value.durationInput = formatSecondsAsInput(
    Math.floor((endAt.getTime() - startAt.getTime()) / 1_000),
  );
}

function validateDraft() {
  const draft = activeDraft.value;
  if (!draft) return null;
  if (!draft.projectId) return "Select a project.";
  const startAt = combineDateTime(draft.date, draft.startTime);
  if (!startAt) return "Enter a valid start time.";
  const durationSeconds = parseDurationToSeconds(draft.durationInput);
  const endAt = durationSeconds
    ? new Date(startAt.getTime() + durationSeconds * 1_000)
    : combineDateTime(draft.date, draft.endTime);
  if (!endAt) return "Use H:MM, decimal hours, or start and end times.";
  if (endAt <= startAt) return "End time must be after start time.";
  return { draft, startAt, endAt };
}

async function invalidateEntries() {
  await queryClient.invalidateQueries({ queryKey: [...entriesQueryKey.value] });
}

async function saveDraft() {
  const validated = validateDraft();
  if (!validated) return;
  if (typeof validated === "string") {
    draftError.value = validated;
    return;
  }
  const { draft, startAt, endAt } = validated;
  try {
    if (draft.mode === "create") {
      await createManualMutation.mutateAsync({
        teamId: teamId.value,
        projectId: draft.projectId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        description: draft.description.trim() || undefined,
        linkUrl: draft.linkUrl.trim() || null,
        tagIds: draft.tagIds,
      });
    } else if (draft.entryId) {
      await updateEntryMutation.mutateAsync({
        teamId: teamId.value,
        entryId: draft.entryId,
        projectId: draft.projectId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        description: draft.description.trim(),
        linkUrl: draft.linkUrl.trim() || null,
        tagIds: draft.tagIds,
      });
    }
    await invalidateEntries();
    toast.add({ title: "Time entry saved", color: "success" });
    closeDraft();
  } catch (error) {
    draftError.value = getErrorMessage(error, "Couldn't save time entry. Try again.");
  }
}

async function deleteEntry(entry: EntryRow) {
  await agencyTimeTrackingStore.deleteEntries({ teamId: teamId.value, entries: [entry] });
  await invalidateEntries();
  if (activeDraft.value?.entryId === entry.id) closeDraft();
}

async function restartEntry(entry: EntryRow) {
  const project = projects.value.find((projectEntry) => projectEntry.id === entry.projectId);
  if (!project) return;
  await agencyTimeTrackingStore.restartEntry({
    teamId: teamId.value,
    project,
    description: entry.description,
    linkUrl: entry.linkUrl,
    tags: entry.tags,
  });
}
</script>

<template>
  <section class="agency-time-entries space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-1 rounded-full border border-default bg-elevated/30 p-1">
        <UButton
          v-for="mode in [
            { id: 'week', label: 'Week' },
            { id: 'day', label: 'Day' },
            { id: 'log', label: 'Log' },
          ]"
          :key="mode.id"
          :label="mode.label"
          size="xs"
          :color="viewMode === mode.id ? 'primary' : 'neutral'"
          :variant="viewMode === mode.id ? 'soft' : 'ghost'"
          class="rounded-full"
          @click="viewMode = mode.id as ViewMode"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="flex items-center gap-1">
          <UButton
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            aria-label="Previous week"
            @click="goPrevWeek"
          />
          <UButton
            label="This week"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="isCurrentWeek"
            @click="goThisWeek"
          />
          <UButton
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            aria-label="Next week"
            @click="goNextWeek"
          />
        </div>
        <span class="text-xs font-bold text-highlighted tabular-nums">{{ weekRangeLabel }}</span>
        <div class="ml-1 flex items-center gap-2 rounded-full bg-elevated/50 px-3 py-1 text-xs">
          <span class="font-bold uppercase tracking-[0.16em] text-muted">Total</span>
          <span class="font-mono font-bold tabular-nums text-highlighted">{{
            formatDuration(weekTotalSeconds, "short")
          }}</span>
        </div>
      </div>
    </div>

    <UAlert
      v-if="isError"
      color="error"
      variant="soft"
      icon="i-lucide-alert-triangle"
      title="Unable to load entries"
      :description="getErrorMessage(entriesQuery.error.value, 'Please refresh and try again.')"
    />

    <div v-else-if="isLoading" class="rounded-2xl border border-default bg-default p-4">
      <div class="space-y-2">
        <div v-for="index in 6" :key="index" class="h-10 animate-pulse rounded-xl bg-elevated/70" />
      </div>
    </div>

    <template v-else>
      <div
        v-if="viewMode === 'week'"
        class="overflow-x-auto rounded-2xl border border-default bg-default"
      >
        <div class="min-w-[68rem]">
          <div
            class="grid grid-cols-[12rem_repeat(7,minmax(0,1fr))_5rem] border-b border-default bg-muted"
          >
            <div class="px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              Project
            </div>
            <button
              v-for="day in weekDays"
              :key="day.key"
              type="button"
              class="border-l border-default px-2 py-2.5 text-center transition hover:bg-elevated/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
              :class="[
                day.isToday ? 'bg-primary/5' : '',
                selectedDayKey === day.key ? 'text-primary' : '',
              ]"
              @click="
                selectedDayKey = day.key;
                viewMode = 'day';
              "
            >
              <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                {{ day.weekday }}
              </p>
              <p class="mt-0.5 text-xs font-bold tabular-nums">{{ day.dayNumber }}</p>
            </button>
            <div
              class="border-l border-default px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-muted"
            >
              Total
            </div>
          </div>

          <div v-if="grid.length === 0" class="px-6 py-12 text-center">
            <UIcon name="i-lucide-clock" class="mx-auto size-6 text-muted" />
            <p class="mt-3 text-sm font-bold text-highlighted">No entries this week.</p>
            <p class="mt-1 text-xs text-muted">Start a timer or add time manually.</p>
            <UButton
              label="Add time"
              color="primary"
              variant="soft"
              size="xs"
              class="mt-4"
              icon="i-lucide-plus"
              @click="openAdd()"
            />
          </div>

          <template v-else>
            <div
              v-for="row in grid"
              :key="row.projectId"
              class="grid grid-cols-[12rem_repeat(7,minmax(0,1fr))_5rem] border-b border-default last:border-b-0"
            >
              <div class="flex min-w-0 items-center gap-2 px-4 py-3">
                <span
                  class="inline-block size-2 shrink-0 rounded-full"
                  aria-hidden="true"
                  :style="projectHueStyle(row.projectId)"
                />
                <div class="min-w-0">
                  <p class="truncate text-xs font-bold text-highlighted">{{ row.projectName }}</p>
                  <p class="truncate text-[11px] text-muted">{{ row.clientName }}</p>
                </div>
              </div>
              <button
                v-for="day in weekDays"
                :key="`${row.projectId}-${day.key}`"
                type="button"
                class="agency-time-entries__cell relative flex h-12 items-center justify-center border-l border-default px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                :class="[
                  day.isToday ? 'bg-primary/[0.03]' : '',
                  getCellSeconds(row, day.key) > 0
                    ? 'text-highlighted hover:bg-elevated/30'
                    : 'text-dimmed hover:bg-elevated/50 hover:text-muted',
                  isRunningCell(row, day.key) ? 'agency-time-entries__cell--running' : '',
                ]"
                @click="
                  selectedDayKey = day.key;
                  getCellSeconds(row, day.key) > 0
                    ? (viewMode = 'day')
                    : openAdd(row.projectId, day.key);
                "
              >
                <span
                  v-if="getCellSeconds(row, day.key) > 0"
                  class="font-mono font-bold tabular-nums"
                  >{{ formatDuration(getCellSeconds(row, day.key), "short") }}</span
                >
                <span v-else class="text-base leading-none opacity-40">·</span>
              </button>
              <div
                class="flex h-12 items-center justify-center border-l border-default px-2 text-xs"
              >
                <span
                  class="font-mono font-bold tabular-nums"
                  :class="row.totalSeconds > 0 ? 'text-highlighted' : 'text-dimmed'"
                  >{{ formatDuration(row.totalSeconds, "short") }}</span
                >
              </div>
            </div>

            <div
              class="grid grid-cols-[12rem_repeat(7,minmax(0,1fr))_5rem] border-t border-default bg-muted/40"
            >
              <div class="px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                Daily total
              </div>
              <div
                v-for="day in weekDays"
                :key="`total-${day.key}`"
                class="flex items-center justify-center border-l border-default px-2 py-2.5 text-xs"
                :class="day.isToday ? 'bg-primary/5' : ''"
              >
                <span
                  class="font-mono font-bold tabular-nums"
                  :class="(dailyTotals.get(day.key) ?? 0) > 0 ? 'text-highlighted' : 'text-dimmed'"
                  >{{ formatDuration(dailyTotals.get(day.key) ?? 0, "short") }}</span
                >
              </div>
              <div class="flex items-center justify-center border-l border-default px-2 py-2.5">
                <span class="font-mono font-bold tabular-nums text-highlighted">{{
                  formatDuration(weekTotalSeconds, "short")
                }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div
        v-else-if="viewMode === 'day'"
        class="space-y-3 rounded-2xl border border-default bg-default p-4"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Day focus</p>
            <h3 class="mt-1 text-base font-bold text-highlighted">
              {{ selectedDay.weekday }} {{ selectedDay.dayNumber }}
            </h3>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-chevron-left"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              aria-label="Previous day"
              @click="goPrevDay"
            />
            <UButton
              icon="i-lucide-calendar-days"
              color="neutral"
              variant="soft"
              size="xs"
              :label="formatDuration(selectedDayTotalSeconds, 'short')"
              class="font-mono tabular-nums"
            />
            <UButton
              icon="i-lucide-chevron-right"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              aria-label="Next day"
              @click="goNextDay"
            />
            <UButton
              label="Add time"
              color="primary"
              size="xs"
              icon="i-lucide-plus"
              @click="openAdd('', selectedDayKey)"
            />
          </div>
        </div>

        <div
          v-if="selectedDayEntries.length === 0"
          class="rounded-2xl border border-dashed border-muted/30 p-6 text-center text-sm text-muted"
        >
          No entries on this day.
        </div>
        <div v-else class="divide-y divide-default rounded-2xl border border-default">
          <div v-for="entry in selectedDayEntries" :key="entry.id" class="p-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-bold text-highlighted">{{ entry.projectName }}</p>
                <p class="mt-0.5 text-xs text-muted">
                  {{ timeKey(entry.startedAt) }} to {{ timeKey(entry.endedAt) }} ·
                  {{ entry.description || "No description" }}
                </p>
              </div>
              <AgencyTimeEntryActions
                :entry="entry"
                :deleting="deletingEntryIds.includes(entry.id)"
                @edit="openEdit(entry)"
                @restart="restartEntry(entry)"
                @delete="deleteEntry(entry)"
              />
            </div>
            <AgencyTimeEntryDraftForm
              v-if="activeDraft?.entryId === entry.id"
              :draft="activeDraft"
              :project-items="projectSelectItems"
              :tags="tags"
              :error="draftError"
              :saving="isSaving"
              @save="saveDraft"
              @cancel="closeDraft"
              @toggle-tag="toggleDraftTag"
              @update-duration="setDraftDuration"
              @update-end-time="setDraftEndTime"
            />
          </div>
        </div>
      </div>

      <div v-else class="space-y-3 rounded-2xl border border-default bg-default p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Entry log</p>
            <h3 class="mt-1 text-base font-bold text-highlighted">Individual entries</h3>
          </div>
          <UButton
            label="Add time"
            color="primary"
            size="xs"
            icon="i-lucide-plus"
            @click="openAdd()"
          />
        </div>

        <div
          v-if="logEntries.length === 0"
          class="rounded-2xl border border-dashed border-muted/30 p-6 text-center text-sm text-muted"
        >
          No time entries yet. Start a timer or add time manually.
        </div>
        <div v-else class="divide-y divide-default rounded-2xl border border-default">
          <div v-for="entry in logEntries" :key="entry.id" class="p-3">
            <div class="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="truncate text-sm font-bold text-highlighted">{{ entry.projectName }}</p>
                  <UBadge color="neutral" variant="soft" class="font-mono tabular-nums">{{
                    formatDuration(entry.durationSeconds, "short")
                  }}</UBadge>
                </div>
                <p class="mt-1 truncate text-xs text-muted">
                  {{ entry.startedAt.slice(0, 10) }} · {{ timeKey(entry.startedAt) }} to
                  {{ timeKey(entry.endedAt) }} · {{ entry.description || "No description" }}
                </p>
              </div>
              <AgencyTimeEntryActions
                :entry="entry"
                :deleting="deletingEntryIds.includes(entry.id)"
                @edit="openEdit(entry)"
                @restart="restartEntry(entry)"
                @delete="deleteEntry(entry)"
              />
            </div>
            <AgencyTimeEntryDraftForm
              v-if="activeDraft?.entryId === entry.id"
              :draft="activeDraft"
              :project-items="projectSelectItems"
              :tags="tags"
              :error="draftError"
              :saving="isSaving"
              @save="saveDraft"
              @cancel="closeDraft"
              @toggle-tag="toggleDraftTag"
              @update-duration="setDraftDuration"
              @update-end-time="setDraftEndTime"
            />
          </div>
        </div>
      </div>

      <div
        v-if="activeDraft?.mode === 'create'"
        class="rounded-2xl border border-default bg-default p-4"
      >
        <div class="mb-3 flex items-center justify-between gap-2">
          <h3 class="text-sm font-bold text-highlighted">Add time</h3>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            aria-label="Close add time"
            @click="closeDraft"
          />
        </div>
        <AgencyTimeEntryDraftForm
          :draft="activeDraft"
          :project-items="projectSelectItems"
          :tags="tags"
          :error="draftError"
          :saving="isSaving"
          @save="saveDraft"
          @cancel="closeDraft"
          @toggle-tag="toggleDraftTag"
          @update-duration="setDraftDuration"
          @update-end-time="setDraftEndTime"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
.agency-time-entries__cell--running::before {
  content: "";
  position: absolute;
  inset: 0;
  border: 1px solid var(--ui-color-primary-500);
  animation: agency-time-entry-pulse 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes agency-time-entry-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .agency-time-entries__cell--running::before {
    animation: none;
  }
}
</style>
