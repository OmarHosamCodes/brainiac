<script setup lang="ts">
import {
  WORKSPACE_HABIT_GRID_DAYS,
  createWorkspaceHabitGridDays,
  createWorkspaceHabitGridHabit,
  getHabitGridSummary,
  type WorkspaceHabitGridBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceHabitGridBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getHabitGridSummary(props.block));

const dayLabels: Record<(typeof WORKSPACE_HABIT_GRID_DAYS)[number], string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

function addHabit() {
  mutateBlock(props.tabId, props.block.id, (entry) => {
    if (entry.type !== "habit-grid") {
      return;
    }

    entry.habits.push(createWorkspaceHabitGridHabit({ name: "" }));
  });
}

function resetWeek() {
  mutateBlock(props.tabId, props.block.id, (entry) => {
    if (entry.type !== "habit-grid") {
      return;
    }

    entry.habits = entry.habits.map((habit) => ({
      ...habit,
      days: createWorkspaceHabitGridDays(),
    }));
  });
}

function getHabitPercent(days: WorkspaceHabitGridBlock["habits"][number]["days"]) {
  const checked = WORKSPACE_HABIT_GRID_DAYS.filter((day) => days[day]).length;
  return Math.round((checked / WORKSPACE_HABIT_GRID_DAYS.length) * 100);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Summary Grid -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-3xl bg-elevated/5 p-5 border border-muted/20">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Habits</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-highlighted">{{ summary.totalHabits }}</p>
      </div>
      <div class="rounded-3xl bg-elevated/5 p-5 border border-muted/20">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Weekly Checks</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
          {{ summary.completedChecks }}/{{ summary.possibleChecks }}
        </p>
      </div>
      <div class="rounded-3xl bg-primary/5 p-5 border border-primary/10">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Overall</p>
          <div class="flex gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-rotate-ccw"
              size="xs"
              class="rounded-lg"
              :disabled="block.habits.length === 0"
              @click="resetWeek"
            />
            <UButton
              color="primary"
              variant="ghost"
              icon="i-lucide-plus"
              size="xs"
              class="rounded-lg"
              @click="addHabit"
            />
          </div>
        </div>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-primary">{{ summary.overallPercent }}%</p>
      </div>
    </div>

    <!-- Habit Table -->
    <div class="overflow-x-auto rounded-3xl border border-muted/20 bg-default/40 p-1">
      <table class="min-w-full border-separate border-spacing-y-2">
        <thead>
          <tr>
            <th
              class="min-w-[200px] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted/50"
            >
              Habit
            </th>
            <th
              v-for="day in WORKSPACE_HABIT_GRID_DAYS"
              :key="day"
              class="w-14 px-1 py-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted/50"
            >
              {{ dayLabels[day] }}
            </th>
            <th
              class="w-20 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted/50"
            >
              %
            </th>
            <th class="w-12 px-4 py-3" />
          </tr>
        </thead>
        <tbody v-if="block.habits.length > 0">
          <tr v-for="habit in block.habits" :key="habit.id" class="group">
            <td class="px-3">
              <UInput
                :model-value="habit.name"
                variant="subtle"
                class="rounded-xl"
                placeholder="Name..."
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'habit-grid') return;
                    const target = entry.habits.find((candidate) => candidate.id === habit.id);
                    if (target) target.name = ($event ?? '').slice(0, 120);
                  })
                "
              />
            </td>
            <td
              v-for="day in WORKSPACE_HABIT_GRID_DAYS"
              :key="`${habit.id}-${day}`"
              class="px-1 text-center"
            >
              <button
                type="button"
                class="flex size-9 mx-auto items-center justify-center rounded-xl border transition-all hover:scale-105 active:scale-95"
                :class="
                  habit.days[day]
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-muted/20 bg-elevated/5 text-muted/40 hover:border-muted/40'
                "
                @click="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'habit-grid') return;
                    const target = entry.habits.find((candidate) => candidate.id === habit.id);
                    if (target) target.days[day] = !target.days[day];
                  })
                "
              >
                <UIcon
                  :name="habit.days[day] ? 'i-lucide-check' : 'i-lucide-minus'"
                  class="size-3.5"
                />
              </button>
            </td>
            <td class="px-4 text-center">
              <span class="text-sm font-black text-highlighted"
                >{{ getHabitPercent(habit.days) }}%</span
              >
            </td>
            <td class="px-3 text-center">
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-trash-2"
                class="rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:text-error/80"
                @click="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'habit-grid') return;
                    entry.habits = entry.habits.filter((candidate) => candidate.id !== habit.id);
                  })
                "
              />
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div
        v-if="block.habits.length === 0"
        class="border-dashed border-muted/20 rounded-2xl py-12 text-center bg-elevated/5 mx-3 mb-3"
      >
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">No habits tracked yet</p>
        <UButton
          color="neutral"
          variant="subtle"
          size="sm"
          class="mt-4 rounded-full px-4"
          icon="i-lucide-plus"
          @click="addHabit"
        >
          Add First Habit
        </UButton>
      </div>
    </div>
  </div>
</template>
