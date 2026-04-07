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

const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getHabitGridSummary(props.block));
const trackedDayCount = WORKSPACE_HABIT_GRID_DAYS.length;

const dayLabels: Record<(typeof WORKSPACE_HABIT_GRID_DAYS)[number], string> = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday",
};

function mutateHabit(
    habitId: string,
    mutator: (habit: WorkspaceHabitGridBlock["habits"][number]) => void,
) {
    mutateTypedBlock(props.tabId, props.block.id, "habit-grid", (entry) => {
        const target = entry.habits.find(
            (candidate) => candidate.id === habitId,
        );

        if (!target) {
            return;
        }

        mutator(target);
    });
}

function addHabit() {
    mutateTypedBlock(props.tabId, props.block.id, "habit-grid", (entry) => {
        entry.habits.push(createWorkspaceHabitGridHabit({ name: "" }));
    });
}

function resetWeek() {
    mutateTypedBlock(props.tabId, props.block.id, "habit-grid", (entry) => {
        entry.habits = entry.habits.map((habit) => ({
            ...habit,
            days: createWorkspaceHabitGridDays(),
        }));
    });
}

function updateHabitName(habitId: string, value: string | number | undefined) {
    mutateHabit(habitId, (habit) => {
        habit.name = String(value ?? "").slice(0, 120);
    });
}

function toggleHabitDay(
    habitId: string,
    day: (typeof WORKSPACE_HABIT_GRID_DAYS)[number],
) {
    mutateHabit(habitId, (habit) => {
        habit.days[day] = !habit.days[day];
    });
}

function removeHabit(habitId: string) {
    mutateTypedBlock(props.tabId, props.block.id, "habit-grid", (entry) => {
        entry.habits = entry.habits.filter(
            (candidate) => candidate.id !== habitId,
        );
    });
}

function getHabitPercent(
    days: WorkspaceHabitGridBlock["habits"][number]["days"],
) {
    const checked = WORKSPACE_HABIT_GRID_DAYS.filter((day) => days[day]).length;
    return Math.round((checked / trackedDayCount) * 100);
}
</script>

<template>
    <div class="space-y-6">
        <!-- Summary Grid -->
        <div
            class="space-y-4 rounded-3xl border border-muted/20 bg-elevated/10 p-5"
        >
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >
                        Habit Tracking
                    </p>
                    <p class="mt-1 text-sm text-muted">
                        Review weekly consistency, update each habit quickly,
                        and keep daily progress easy to scan.
                    </p>
                </div>

                <div class="flex gap-2">
                    <UButton
                        color="neutral"
                        variant="soft"
                        icon="i-lucide-rotate-ccw"
                        size="sm"
                        class="rounded-full px-4"
                        :disabled="block.habits.length === 0"
                        aria-label="Reset all habit checks for the week"
                        @click="resetWeek"
                    >
                        Reset Week
                    </UButton>
                    <UButton
                        color="primary"
                        variant="soft"
                        icon="i-lucide-plus"
                        size="sm"
                        class="rounded-full px-4"
                        aria-label="Add tracked habit"
                        @click="addHabit"
                    >
                        Add Habit
                    </UButton>
                </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div
                    class="rounded-3xl bg-elevated/5 p-5 border border-muted/20"
                >
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >
                        Habits
                    </p>
                    <p
                        class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-highlighted"
                    >
                        {{ summary.totalHabits }}
                    </p>
                </div>
                <div
                    class="rounded-3xl bg-elevated/5 p-5 border border-muted/20"
                >
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >
                        Weekly Checks
                    </p>
                    <p
                        class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-highlighted"
                    >
                        {{ summary.completedChecks }}/{{
                            summary.possibleChecks
                        }}
                    </p>
                </div>
                <div
                    class="rounded-3xl bg-primary/5 p-5 border border-primary/10"
                >
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60"
                    >
                        Overall
                    </p>
                    <p
                        class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-primary"
                    >
                        {{ summary.overallPercent }}%
                    </p>
                    <p
                        class="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted/40"
                    >
                        {{ trackedDayCount }} tracked days
                    </p>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
                <UBadge variant="subtle" class="rounded-2xl">
                    {{ summary.totalHabits }} habits
                </UBadge>
                <UBadge color="neutral" variant="soft" class="rounded-2xl">
                    {{ summary.completedChecks }} checks completed
                </UBadge>
                <UBadge color="primary" variant="soft" class="rounded-2xl">
                    {{ summary.overallPercent }}% overall
                </UBadge>
            </div>
        </div>

        <!-- Habit Table -->
        <div
            class="overflow-x-auto rounded-3xl border border-muted/20 bg-default/40 p-1"
        >
            <table class="min-w-full border-separate border-spacing-y-2">
                <caption class="sr-only">
                    Habit grid with
                    {{
                        block.habits.length
                    }}
                    habits and
                    {{
                        trackedDayCount
                    }}
                    day toggles per habit
                </caption>
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
                            {{ dayLabels[day].slice(0, 3) }}
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
                    <tr
                        v-for="habit in block.habits"
                        :key="habit.id"
                        class="group"
                    >
                        <td class="px-3">
                            <UInput
                                :model-value="habit.name"
                                variant="subtle"
                                class="rounded-xl"
                                placeholder="Name..."
                                :aria-label="`Habit name for ${habit.name || 'new habit'}`"
                                @update:model-value="
                                    updateHabitName(habit.id, $event)
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
                                class="mx-auto flex min-h-9 min-w-9 items-center justify-center rounded-xl border px-2 text-[10px] font-bold transition-all hover:scale-105 active:scale-95"
                                :class="
                                    habit.days[day]
                                        ? 'border-primary/30 bg-primary/10 text-primary'
                                        : 'border-muted/20 bg-elevated/5 text-muted/50 hover:border-muted/40'
                                "
                                :aria-pressed="habit.days[day]"
                                :aria-label="`${habit.days[day] ? 'Uncheck' : 'Check'} ${dayLabels[day]} for ${habit.name || 'this habit'}`"
                                @click="toggleHabitDay(habit.id, day)"
                            >
                                <span class="sr-only">{{
                                    dayLabels[day]
                                }}</span>
                                <UIcon
                                    :name="
                                        habit.days[day]
                                            ? 'i-lucide-check'
                                            : 'i-lucide-minus'
                                    "
                                    class="size-3.5"
                                />
                            </button>
                        </td>
                        <td class="px-4 text-center">
                            <span class="text-sm font-black text-highlighted">
                                {{ getHabitPercent(habit.days) }}%
                            </span>
                        </td>
                        <td class="px-3 text-center">
                            <UButton
                                color="neutral"
                                variant="ghost"
                                size="xs"
                                icon="i-lucide-trash-2"
                                class="rounded-lg hover:text-error/80"
                                :aria-label="`Remove ${habit.name || 'habit'}`"
                                @click="removeHabit(habit.id)"
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
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    No habits tracked yet
                </p>
                <p class="mt-2 text-sm text-muted">
                    Add the first habit to start logging daily consistency.
                </p>
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
