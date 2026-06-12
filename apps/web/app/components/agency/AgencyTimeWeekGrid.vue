<script setup lang="ts">
/**
 * Agency Time — week grid (Mon–Sun × project rows).
 *
 * Aspirational sub-components (per-cell sub-rows for tag scope, bulk paste)
 * are out of scope for Phase 1. This pass ships:
 *   - Week navigator (prev / today / next).
 *   - Sticky project column (hue dot + name + client crumb).
 *   - Mon–Sun columns with H:MM aggregate per project per day.
 *   - Today column tinted; running-timer cell pulses Operator Emerald.
 *   - Click-to-add inline entry (duration + description) calling createManual.
 *   - Arrow-key cell navigation.
 *   - All states: loading skeleton, empty, error, saving.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";

import AgencyTaskChooser from "~/components/agency/AgencyTaskChooser.vue";
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
const agencyStore = useAgencyTimeTrackingStore();
const { isTimerMutationPending } = storeToRefs(agencyStore);

// --- Week navigation ----------------------------------------------------

function getWeekStartUtc(reference: Date): Date {
  const date = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()),
  );
  // ISO week starts Monday. Sunday=0 in JS → shift by 6.
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
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

const todayKey = computed(() => dateKey(new Date()));
const weekAnchor = ref<Date>(getWeekStartUtc(new Date()));

const weekStart = computed(() => weekAnchor.value);
const weekEnd = computed(() => addDaysUtc(weekStart.value, 6));

const weekDays = computed(() => {
  const days = [] as Array<{
    key: string;
    date: Date;
    weekday: string;
    dayNumber: string;
    isToday: boolean;
  }>;
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDaysUtc(weekStart.value, offset);
    days.push({
      key: dateKey(date),
      date,
      weekday: date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      dayNumber: date.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" }),
      isToday: dateKey(date) === todayKey.value,
    });
  }
  return days;
});

const weekRangeLabel = computed(() => {
  const start = weekStart.value;
  const end = weekEnd.value;
  const fmt = (date: Date, opts: Intl.DateTimeFormatOptions) =>
    date.toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${fmt(start, { month: "short", day: "numeric" })} – ${fmt(end, { day: "numeric", year: "numeric" })}`;
  }
  return `${fmt(start, { month: "short", day: "numeric" })} – ${fmt(end, { month: "short", day: "numeric", year: "numeric" })}`;
});

const isCurrentWeek = computed(
  () => dateKey(weekStart.value) === dateKey(getWeekStartUtc(new Date())),
);

function goPrevWeek() {
  weekAnchor.value = addDaysUtc(weekAnchor.value, -7);
}
function goNextWeek() {
  weekAnchor.value = addDaysUtc(weekAnchor.value, 7);
}
function goThisWeek() {
  weekAnchor.value = getWeekStartUtc(new Date());
}

// --- Data ---------------------------------------------------------------

const teamId = computed(() => props.teamId);

const projectsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.projects.list.queryOptions({ input: { teamId: teamId.value } }),
    enabled: Boolean(teamId.value),
  })),
);
const projects = computed(() => projectsQuery.data.value?.items ?? []);

const tasksQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.projectTasks.list.queryOptions({
      input: { teamId: teamId.value, statuses: ["open", "in_progress"] },
    }),
    enabled: Boolean(teamId.value),
  })),
);
const tasks = computed(() => tasksQuery.data.value?.items ?? []);

// Page through entries large enough to cover one user's typical week.
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

const activeTimerQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.timer.getActive.queryOptions({
      input: { teamId: teamId.value || undefined },
    }),
    enabled: Boolean(teamId.value),
  })),
);
const activeTimer = computed(() => activeTimerQuery.data.value?.timer ?? null);

// Filter entries to the visible week and group by task × dateKey.
type TaskRow = {
  rowKey: string;
  taskId: string | null;
  taskTitle: string;
  projectId: string;
  projectName: string;
  clientName: string;
  totalSeconds: number;
  /** dateKey → totalSeconds */
  perDay: Map<string, number>;
};

const grid = computed(() => {
  const items = entriesQuery.data.value?.items ?? [];
  const weekStartMs = weekStart.value.getTime();
  const weekEndMs = addDaysUtc(weekStart.value, 7).getTime();
  const rowMap = new Map<string, TaskRow>();

  for (const entry of items) {
    const startedAtMs = new Date(entry.startedAt).getTime();
    if (Number.isNaN(startedAtMs)) continue;
    if (startedAtMs < weekStartMs || startedAtMs >= weekEndMs) continue;

    const rowKey = entry.taskId ?? `project-only:${entry.projectId}`;
    const existing =
      rowMap.get(rowKey) ??
      ({
        rowKey,
        taskId: entry.taskId ?? null,
        taskTitle: entry.taskTitle ?? "Project-only entry",
        projectId: entry.projectId,
        projectName: entry.projectName,
        clientName: entry.clientName,
        totalSeconds: 0,
        perDay: new Map<string, number>(),
      } satisfies TaskRow);

    existing.totalSeconds += entry.durationSeconds;
    const key = entry.startedAt.slice(0, 10);
    existing.perDay.set(key, (existing.perDay.get(key) ?? 0) + entry.durationSeconds);
    rowMap.set(rowKey, existing);
  }

  return [...rowMap.values()].sort((a, b) => a.taskTitle.localeCompare(b.taskTitle));
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

// --- Add row picker -----------------------------------------------------

const addRowOpen = ref(false);
const addRowTaskId = ref("");

const tasksNotInGrid = computed(() => {
  const used = new Set(grid.value.map((row) => row.taskId).filter(Boolean));
  return tasks.value.filter((task) => !used.has(task.id));
});

// Allow grid to render rows for tasks with zero entries this week, once the
// user opts them in via "Add row" picker.
const pinnedTaskIds = ref<string[]>([]);

const fullGrid = computed<TaskRow[]>(() => {
  const existing = new Map(grid.value.map((row) => [row.rowKey, row]));
  for (const taskId of pinnedTaskIds.value) {
    if (!existing.has(taskId)) {
      const task = tasks.value.find((entry) => entry.id === taskId);
      const project = task ? projects.value.find((entry) => entry.id === task.projectId) : null;
      if (!task || !project) continue;
      existing.set(taskId, {
        rowKey: task.id,
        taskId: task.id,
        taskTitle: task.title,
        projectId: project.id,
        projectName: project.name,
        clientName: project.clientName,
        totalSeconds: 0,
        perDay: new Map(),
      });
    }
  }
  return [...existing.values()].sort((a, b) => a.taskTitle.localeCompare(b.taskTitle));
});

function pinTask() {
  if (!addRowTaskId.value) return;
  if (!pinnedTaskIds.value.includes(addRowTaskId.value)) {
    pinnedTaskIds.value = [...pinnedTaskIds.value, addRowTaskId.value];
  }
  addRowTaskId.value = "";
  addRowOpen.value = false;
}

// --- Inline cell entry --------------------------------------------------

const editingCell = ref<{ taskId: string; dateKey: string } | null>(null);
const editDurationInput = ref(""); // "1:30" or "0:45"
const editDescription = ref("");
const editError = ref<string | null>(null);

const createManualMutation = useMutation(orpc.agencyOps.timeEntries.createManual.mutationOptions());

function openCellEditor(taskId: string | null, day: string) {
  if (!taskId) {
    editError.value = "Select a task row before adding time.";
    return;
  }

  editingCell.value = { taskId, dateKey: day };
  editDurationInput.value = "";
  editDescription.value = "";
  editError.value = null;
  // Focus the duration input after the popover/cell renders.
  nextTick(() => {
    const input = document.querySelector<HTMLInputElement>(
      `[data-time-grid-cell-editor="${taskId}__${day}"] input[name="duration"]`,
    );
    input?.focus();
    input?.select();
  });
}

function closeCellEditor() {
  editingCell.value = null;
  editDurationInput.value = "";
  editDescription.value = "";
  editError.value = null;
}

function parseDurationToSeconds(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Accept "1:30", "1.5", "0:45", "90m", "1h30", "1h 30m".
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) {
    const hours = Number(colonMatch[1]);
    const minutes = Number(colonMatch[2]);
    if (minutes >= 60) return null;
    return hours * 3_600 + minutes * 60;
  }
  const decimalMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (decimalMatch) {
    const hours = Number(decimalMatch[1]);
    return Math.round(hours * 3_600);
  }
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

async function commitCellEdit() {
  const cell = editingCell.value;
  if (!cell) return;
  const durationSeconds = parseDurationToSeconds(editDurationInput.value);
  if (!durationSeconds || durationSeconds <= 0) {
    editError.value = "Use H:MM, decimal hours, or 1h 30m.";
    return;
  }

  // Anchor the entry to noon UTC of the selected day so it falls inside the
  // week summary regardless of viewer timezone.
  const startAt = new Date(`${cell.dateKey}T12:00:00.000Z`);
  const endAt = new Date(startAt.getTime() + durationSeconds * 1_000);

  try {
    await createManualMutation.mutateAsync({
      teamId: teamId.value,
      taskId: cell.taskId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      description: editDescription.value.trim() || undefined,
    });
    await queryClient.invalidateQueries({
      queryKey: orpc.agencyOps.timeEntries.listMine.queryOptions({
        input: {
          teamId: teamId.value,
          anchorDate: new Date(weekStart.value.getTime() + 12 * 60 * 60 * 1_000).toISOString(),
          page: 1,
          pageSize: entriesPageSize,
        },
      }).queryKey,
    });
    toast.add({
      title: "Time logged",
      description: `${formatDuration(durationSeconds, "short")} on ${
        fullGrid.value.find((row) => row.taskId === cell.taskId)?.taskTitle ?? "task"
      }.`,
      color: "success",
    });
    closeCellEditor();
  } catch (error) {
    editError.value = getErrorMessage(error, "Couldn't save time. Try again.");
  }
}

// --- Keyboard cell navigation ------------------------------------------

const focusedCellKey = ref<string | null>(null);
const cellRefs = new Map<string, HTMLElement>();

function setCellRef(rowKey: string, day: string, element: HTMLElement | null) {
  const key = `${rowKey}__${day}`;
  if (element) cellRefs.set(key, element);
  else cellRefs.delete(key);
}

function focusCell(rowKey: string, day: string) {
  const key = `${rowKey}__${day}`;
  focusedCellKey.value = key;
  cellRefs.get(key)?.focus();
}

function handleCellKeydown(event: KeyboardEvent, rowKey: string, day: string) {
  const projectIndex = fullGrid.value.findIndex((row) => row.rowKey === rowKey);
  const dayIndex = weekDays.value.findIndex((entry) => entry.key === day);
  if (projectIndex < 0 || dayIndex < 0) return;

  let nextProjectIndex = projectIndex;
  let nextDayIndex = dayIndex;
  switch (event.key) {
    case "ArrowLeft":
      nextDayIndex = Math.max(0, dayIndex - 1);
      break;
    case "ArrowRight":
      nextDayIndex = Math.min(6, dayIndex + 1);
      break;
    case "ArrowUp":
      nextProjectIndex = Math.max(0, projectIndex - 1);
      break;
    case "ArrowDown":
      nextProjectIndex = Math.min(fullGrid.value.length - 1, projectIndex + 1);
      break;
    case "Enter":
      event.preventDefault();
      openCellEditor(fullGrid.value[projectIndex]?.taskId ?? null, day);
      return;
    default:
      return;
  }
  if (nextProjectIndex === projectIndex && nextDayIndex === dayIndex) return;
  event.preventDefault();
  const targetRow = fullGrid.value[nextProjectIndex]!;
  const targetDay = weekDays.value[nextDayIndex]!;
  focusCell(targetRow.rowKey, targetDay.key);
}

// --- Derived helpers ----------------------------------------------------

const isLoading = computed(
  () => entriesQuery.isPending.value || projectsQuery.isPending.value || tasksQuery.isPending.value,
);
const isError = computed(() => Boolean(entriesQuery.error.value));
const hasAnyEntries = computed(() => grid.value.length > 0);

function getCellSeconds(row: TaskRow, day: string): number {
  return row.perDay.get(day) ?? 0;
}

function isRunningCell(row: TaskRow, day: string): boolean {
  if (!activeTimer.value) return false;
  const runningKey = activeTimer.value.taskId ?? `project-only:${activeTimer.value.projectId}`;
  return runningKey === row.rowKey && activeTimer.value.startedAt.slice(0, 10) === day;
}
</script>

<template>
  <div class="agency-time-grid space-y-4">
    <!-- Week navigator -->
    <div class="flex flex-wrap items-center justify-between gap-3">
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
        <span class="ml-2 text-xs font-bold text-highlighted tabular-nums">
          {{ weekRangeLabel }}
        </span>
      </div>

      <div class="flex items-center gap-3 text-xs">
        <p class="font-bold uppercase tracking-[0.16em] text-muted">Total</p>
        <p class="font-mono font-bold tabular-nums text-highlighted">
          {{ formatDuration(weekTotalSeconds, "short") }}
        </p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="overflow-hidden rounded-2xl border border-default bg-default">
      <div class="grid grid-cols-[12rem_repeat(7,minmax(0,1fr))_5rem]">
        <div
          v-for="cellIndex in 9 * 4"
          :key="cellIndex"
          class="h-12 border-b border-default border-r last:border-r-0"
        >
          <div class="m-3 h-4 animate-pulse rounded-md bg-elevated/60" />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="isError" class="rounded-2xl border border-error/30 bg-error/5 p-6 text-center">
      <UIcon name="i-lucide-alert-triangle" class="mx-auto size-5 text-error" />
      <p class="mt-3 text-sm font-bold text-highlighted">Couldn't load this week.</p>
      <p class="mt-1 text-xs text-muted">
        {{ getErrorMessage(entriesQuery.error.value, "Try refreshing.") }}
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

    <!-- Empty + grid -->
    <div v-else class="overflow-x-auto rounded-2xl border border-default bg-default">
      <div class="agency-time-grid__inner min-w-[64rem]">
        <!-- Header row -->
        <div
          class="grid grid-cols-[12rem_repeat(7,minmax(0,1fr))_5rem] border-b border-default bg-muted"
        >
          <div class="px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            Task
          </div>
          <div
            v-for="day in weekDays"
            :key="day.key"
            class="border-l border-default px-2 py-2.5 text-center"
            :class="day.isToday ? 'bg-primary/5' : ''"
          >
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              {{ day.weekday }}
            </p>
            <p
              class="mt-0.5 text-xs font-bold tabular-nums"
              :class="day.isToday ? 'text-primary' : 'text-highlighted'"
            >
              {{ day.dayNumber }}
            </p>
          </div>
          <div
            class="border-l border-default px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-muted"
          >
            Total
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="fullGrid.length === 0" class="px-6 py-12 text-center">
          <UIcon name="i-lucide-clock" class="mx-auto size-6 text-muted" />
          <p class="mt-3 text-sm font-bold text-highlighted">No entries yet this week.</p>
          <p class="mt-1 text-xs text-muted">
            Start a tagged timer above, or pick a task to add hours.
          </p>
          <UPopover
            v-if="tasks.length > 0"
            v-model:open="addRowOpen"
            :content="{ align: 'center' }"
          >
            <UButton
              label="Add a task row"
              color="primary"
              variant="soft"
              size="xs"
              class="mt-4"
              icon="i-lucide-plus"
            />
            <template #content>
              <div class="w-72 space-y-2 p-3">
                <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                  Pick a task
                </p>
                <AgencyTaskChooser
                  v-model="addRowTaskId"
                  :projects="projects"
                  :tasks="tasks"
                  placeholder="Task"
                />
                <UButton
                  label="Add row"
                  color="primary"
                  size="xs"
                  block
                  :disabled="!addRowTaskId"
                  @click="pinTask"
                />
              </div>
            </template>
          </UPopover>
        </div>

        <!-- Task rows -->
        <div v-else>
          <div
            v-for="row in fullGrid"
            :key="row.rowKey"
            class="grid grid-cols-[12rem_repeat(7,minmax(0,1fr))_5rem] border-b border-default last:border-b-0"
          >
            <!-- Task cell -->
            <div class="flex min-w-0 items-center gap-2 px-4 py-3">
              <span
                class="agency-time-grid__dot inline-block size-2 shrink-0 rounded-full"
                aria-hidden="true"
                :style="projectHueStyle(row.projectId)"
              />
              <div class="min-w-0">
                <p class="truncate text-xs font-bold text-highlighted">{{ row.taskTitle }}</p>
                <p class="truncate text-[11px] text-muted">
                  {{ row.clientName }} · {{ row.projectName }}
                </p>
              </div>
            </div>

            <!-- Day cells -->
            <button
              v-for="day in weekDays"
              :key="`${row.rowKey}__${day.key}`"
              type="button"
              tabindex="0"
              :ref="(element) => setCellRef(row.rowKey, day.key, element as HTMLElement | null)"
              :data-time-grid-cell-editor="`${row.taskId ?? row.rowKey}__${day.key}`"
              class="agency-time-grid__cell relative flex h-12 items-center justify-center border-l border-default px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
              :class="[
                day.isToday ? 'bg-primary/[0.03]' : '',
                getCellSeconds(row, day.key) > 0
                  ? 'text-highlighted'
                  : 'text-dimmed hover:text-muted hover:bg-elevated/50',
                isRunningCell(row, day.key) ? 'agency-time-grid__cell--running' : '',
              ]"
              @click="openCellEditor(row.taskId, day.key)"
              @keydown="handleCellKeydown($event, row.rowKey, day.key)"
            >
              <span
                v-if="getCellSeconds(row, day.key) > 0"
                class="font-mono font-bold tabular-nums"
              >
                {{ formatDuration(getCellSeconds(row, day.key), "short") }}
              </span>
              <span v-else class="text-base leading-none opacity-40">·</span>

              <!-- Inline cell editor popover, anchored to this cell -->
              <span
                v-if="
                  editingCell &&
                  editingCell.taskId === row.taskId &&
                  editingCell.dateKey === day.key
                "
                class="absolute left-1/2 top-full z-30 mt-1 w-64 -translate-x-1/2 rounded-2xl border border-default bg-default p-3 text-left shadow-xl"
                @click.stop
                @keydown.stop
              >
                <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                  Add time · {{ day.weekday }} {{ day.dayNumber }}
                </p>
                <form class="mt-2 space-y-2" @submit.prevent="commitCellEdit">
                  <div>
                    <label class="text-[11px] font-bold text-muted">Duration</label>
                    <UInput
                      v-model="editDurationInput"
                      name="duration"
                      placeholder="1:30 or 1.5 or 1h 30m"
                      size="xs"
                      class="mt-1 font-mono"
                      autocomplete="off"
                    />
                  </div>
                  <div>
                    <label class="text-[11px] font-bold text-muted">Note</label>
                    <UInput
                      v-model="editDescription"
                      placeholder="What did you work on?"
                      size="xs"
                      class="mt-1"
                      autocomplete="off"
                    />
                  </div>
                  <p v-if="editError" class="text-[11px] text-error">{{ editError }}</p>
                  <div class="flex items-center justify-end gap-1.5">
                    <UButton
                      type="button"
                      label="Cancel"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      @click="closeCellEditor"
                    />
                    <UButton
                      type="submit"
                      label="Save"
                      color="primary"
                      size="xs"
                      :loading="createManualMutation.isPending.value"
                    />
                  </div>
                </form>
              </span>
            </button>

            <!-- Row total -->
            <div class="flex h-12 items-center justify-center border-l border-default px-2 text-xs">
              <span
                class="font-mono font-bold tabular-nums"
                :class="row.totalSeconds > 0 ? 'text-highlighted' : 'text-dimmed'"
              >
                {{ formatDuration(row.totalSeconds, "short") }}
              </span>
            </div>
          </div>

          <!-- Daily totals row -->
          <div
            class="grid grid-cols-[12rem_repeat(7,minmax(0,1fr))_5rem] border-t-2 border-default bg-muted/40"
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
              >
                {{ formatDuration(dailyTotals.get(day.key) ?? 0, "short") }}
              </span>
            </div>
            <div class="flex items-center justify-center border-l border-default px-2 py-2.5">
              <span class="font-mono font-bold tabular-nums text-highlighted">
                {{ formatDuration(weekTotalSeconds, "short") }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add row affordance below grid -->
    <div v-if="fullGrid.length > 0 && tasksNotInGrid.length > 0" class="flex justify-end">
      <UPopover v-model:open="addRowOpen" :content="{ align: 'end' }">
        <UButton
          label="Add a task row"
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-plus"
        />
        <template #content>
          <div class="w-72 space-y-2 p-3">
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Pick a task</p>
            <AgencyTaskChooser
              v-model="addRowTaskId"
              :projects="projects"
              :tasks="tasksNotInGrid"
              placeholder="Task"
            />
            <UButton
              label="Add row"
              color="primary"
              size="xs"
              block
              :disabled="!addRowTaskId"
              @click="pinTask"
            />
          </div>
        </template>
      </UPopover>
    </div>
  </div>
</template>

<style scoped>
.agency-time-grid__dot {
  background-color: var(--project-hue, var(--ui-color-primary-500));
}
:global(.dark) .agency-time-grid__dot {
  background-color: var(--project-hue-dark, var(--ui-color-primary-400));
}

.agency-time-grid__cell--running::before {
  content: "";
  position: absolute;
  inset: 0;
  border: 1px solid var(--ui-color-primary-500);
  border-radius: 0;
  animation: agency-time-cell-pulse 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes agency-time-cell-pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .agency-time-grid__cell--running::before {
    animation: none;
  }
}
</style>
