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
    <div class="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-elevated/20 p-5">
      <div class="grid gap-4 sm:grid-cols-3">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted/60">Habits</p>
          <p class="mt-1 text-2xl font-black text-highlighted">{{ summary.totalHabits }}</p>
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted/60">Weekly Checks</p>
          <p class="mt-1 text-2xl font-black text-highlighted">
            {{ summary.completedChecks }}/{{ summary.possibleChecks }}
          </p>
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-primary/60">Overall</p>
          <p class="mt-1 text-2xl font-black text-primary">{{ summary.overallPercent }}%</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-rotate-ccw"
          class="rounded-full"
          :disabled="block.habits.length === 0"
          @click="resetWeek"
        >
          Reset Week
        </UButton>
        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-plus"
          class="rounded-full"
          @click="addHabit"
        >
          Add Habit
        </UButton>
      </div>
    </div>

    <div class="overflow-x-auto rounded-[32px] border border-muted/20 bg-default/30 p-4">
      <table class="min-w-full border-separate border-spacing-y-3">
        <thead>
          <tr>
            <th
              class="min-w-[220px] px-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted/50"
            >
              Habit
            </th>
            <th
              v-for="day in WORKSPACE_HABIT_GRID_DAYS"
              :key="day"
              class="w-16 px-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted/50"
            >
              {{ dayLabels[day] }}
            </th>
            <th
              class="w-20 px-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted/50"
            >
              %
            </th>
            <th class="w-12" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="habit in block.habits" :key="habit.id">
            <td class="px-2">
              <UInput
                :model-value="habit.name"
                variant="soft"
                class="rounded-2xl"
                placeholder="Habit name"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'habit-grid') {
                      return;
                    }

                    const target = entry.habits.find((candidate) => candidate.id === habit.id);

                    if (target) {
                      target.name = ($event ?? '').slice(0, 120);
                    }
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
                class="flex size-10 items-center justify-center rounded-2xl border transition-colors"
                :class="
                  habit.days[day]
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-muted/20 bg-default/60 text-muted'
                "
                @click="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'habit-grid') {
                      return;
                    }

                    const target = entry.habits.find((candidate) => candidate.id === habit.id);

                    if (target) {
                      target.days[day] = !target.days[day];
                    }
                  })
                "
              >
                <UIcon
                  :name="habit.days[day] ? 'i-lucide-check' : 'i-lucide-minus'"
                  class="size-4"
                />
              </button>
            </td>
            <td class="px-2 text-center">
              <span class="text-sm font-black text-highlighted"
                >{{ getHabitPercent(habit.days) }}%</span
              >
            </td>
            <td class="px-2 text-center">
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-trash-2"
                class="rounded-xl hover:text-error"
                @click="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'habit-grid') {
                      return;
                    }

                    entry.habits = entry.habits.filter((candidate) => candidate.id !== habit.id);
                  })
                "
              />
            </td>
          </tr>
        </tbody>
      </table>

      <div
        v-if="block.habits.length === 0"
        class="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-muted/30 bg-default/20 py-12 text-center"
      >
        <p class="text-sm font-bold uppercase tracking-widest text-muted/60">No habits tracked</p>
      </div>
    </div>
  </div>
</template>
