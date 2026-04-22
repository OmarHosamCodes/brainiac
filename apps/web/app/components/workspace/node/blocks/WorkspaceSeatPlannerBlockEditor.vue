<script setup lang="ts">
import {
  createWorkspaceSeatPlannerSeat,
  getSeatPlannerSummary,
  isSeatUncovered,
  matchesSeatPlannerFilter,
  workspaceSeatHealthLabels,
  workspaceSeatLoadLevelLabels,
  workspaceSeatPlannerFilterLabels,
  type WorkspaceSeatHealth,
  type WorkspaceSeatLoadLevel,
  type WorkspaceSeatPlannerBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceSeatPlannerBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getSeatPlannerSummary(props.block));

const healthOptions: Array<{ label: string; value: WorkspaceSeatHealth }> = [
  { label: "Strong", value: "strong" },
  { label: "Fragile", value: "fragile" },
  { label: "Gap", value: "gap" },
];

const loadOptions: Array<{ label: string; value: WorkspaceSeatLoadLevel }> = [
  { label: "Underloaded", value: "underloaded" },
  { label: "Balanced", value: "balanced" },
  { label: "Overloaded", value: "overloaded" },
];

const filterOptions: Array<{ label: string; value: WorkspaceSeatPlannerBlock["filter"] }> = [
  { label: "All", value: "all" },
  { label: "Fragile", value: "fragile" },
  { label: "Overloaded", value: "overloaded" },
  { label: "Uncovered", value: "uncovered" },
];

const visibleSeats = computed(() =>
  props.block.seats.filter((seat) => matchesSeatPlannerFilter(seat, props.block.filter)),
);

function addSeat() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "seat-planner") {
      return;
    }

    block.seats.push(createWorkspaceSeatPlannerSeat());
  });
}

function removeSeat(seatId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "seat-planner") {
      return;
    }

    block.seats = block.seats.filter((seat) => seat.id !== seatId);
  });
}

function getSeatClasses(seat: WorkspaceSeatPlannerBlock["seats"][number]) {
  if (seat.health === "gap" || isSeatUncovered(seat)) {
    return "border-error/30 bg-error/5";
  }

  if (seat.health === "fragile" || seat.load === "overloaded") {
    return "border-warning/30 bg-warning/5";
  }

  return "border-muted/30 bg-default/70";
}

function getFilterCount(filter: WorkspaceSeatPlannerBlock["filter"]) {
  if (filter === "all") {
    return props.block.seats.length;
  }

  return props.block.seats.filter((seat) => matchesSeatPlannerFilter(seat, filter)).length;
}
</script>

<template>
  <div class="space-y-5">
    <!-- Summary Stats -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl bg-primary/5 p-4 border border-primary/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Filled Seats</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-primary">
          {{ summary.filledSeats }}
        </p>
      </div>

      <div class="rounded-2xl bg-warning/5 p-4 border border-warning/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Fragile</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-warning">
          {{ summary.fragileSeats }}
        </p>
      </div>

      <div class="rounded-2xl bg-error/5 p-4 border border-error/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Uncovered</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-error">
          {{ summary.uncoveredSeats }}
        </p>
      </div>

      <div class="rounded-2xl bg-elevated/10 p-4 border border-muted/20">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Overloaded</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-highlighted">
          {{ summary.overloadedSeats }}
        </p>
      </div>
    </div>

    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <h2 class="text-sm font-black text-highlighted tracking-tight">Seat Ownership Planner</h2>
        <p class="text-xs text-muted">
          Clarify critical functions, fragile seats, and coverage gaps.
        </p>
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        size="sm"
        class="rounded-full"
        @click="addSeat"
      >
        Add Seat
      </UButton>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2">
      <UButton
        v-for="filter in filterOptions"
        :key="filter.value"
        :color="block.filter === filter.value ? 'primary' : 'neutral'"
        :variant="block.filter === filter.value ? 'soft' : 'ghost'"
        size="sm"
        class="rounded-full px-3"
        @click="
          mutateBlock(tabId, block.id, (entry) => {
            if (entry.type !== 'seat-planner') return;
            entry.filter = filter.value;
          })
        "
      >
        {{ workspaceSeatPlannerFilterLabels[filter.value] }} · {{ getFilterCount(filter.value) }}
      </UButton>
    </div>

    <!-- Empty State -->
    <div
      v-if="visibleSeats.length === 0"
      class="border-dashed border-muted/20 rounded-2xl py-10 text-center bg-elevated/5"
    >
      <div
        class="flex size-12 items-center justify-center rounded-xl bg-muted/10 text-muted/30 mx-auto"
      >
        <UIcon name="i-lucide-users" size="24" />
      </div>
      <p class="mt-3 text-xs font-bold text-muted">No seats match this filter</p>
    </div>

    <!-- Seat Table -->
    <div v-else class="overflow-x-auto pb-2">
      <table class="min-w-[1100px] w-full border-separate border-spacing-y-2">
        <thead>
          <tr>
            <th
              class="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
            >
              Seat
            </th>
            <th
              class="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
            >
              Owner
            </th>
            <th
              class="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
            >
              Function
            </th>
            <th
              class="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
            >
              Health
            </th>
            <th
              class="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
            >
              Load
            </th>
            <th
              class="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
            >
              Backup
            </th>
            <th
              class="px-3 pb-2 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
            >
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="seat in visibleSeats" :key="seat.id">
            <td
              class="rounded-l-xl border-y border-l px-3 py-3 align-top"
              :class="getSeatClasses(seat)"
            >
              <UInput
                :model-value="seat.name"
                variant="none"
                placeholder="Seat name"
                size="sm"
                :ui="{
                  base: 'px-0 text-sm font-bold text-highlighted placeholder:text-muted/40',
                }"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'seat-planner') return;
                    const target = entry.seats.find((candidate) => candidate.id === seat.id);
                    if (!target) return;
                    target.name = ($event ?? '').slice(0, 120);
                  })
                "
              />
            </td>

            <td class="border-y px-3 py-3 align-top" :class="getSeatClasses(seat)">
              <UInput
                :model-value="seat.owner"
                placeholder="Owner"
                size="sm"
                class="rounded-xl"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'seat-planner') return;
                    const target = entry.seats.find((candidate) => candidate.id === seat.id);
                    if (!target) return;
                    target.owner = ($event ?? '').slice(0, 120);
                  })
                "
              />
            </td>

            <td class="border-y px-3 py-3 align-top" :class="getSeatClasses(seat)">
              <UInput
                :model-value="seat.function"
                placeholder="Function"
                size="sm"
                class="rounded-xl"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'seat-planner') return;
                    const target = entry.seats.find((candidate) => candidate.id === seat.id);
                    if (!target) return;
                    target.function = ($event ?? '').slice(0, 120);
                  })
                "
              />
            </td>

            <td class="border-y px-3 py-3 align-top" :class="getSeatClasses(seat)">
              <USelect
                :model-value="seat.health"
                :items="healthOptions"
                size="sm"
                class="rounded-xl"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'seat-planner') return;
                    const target = entry.seats.find((candidate) => candidate.id === seat.id);
                    if (!target) return;
                    target.health = $event ?? 'strong';
                  })
                "
              />
            </td>

            <td class="border-y px-3 py-3 align-top" :class="getSeatClasses(seat)">
              <USelect
                :model-value="seat.load"
                :items="loadOptions"
                size="sm"
                class="rounded-xl"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'seat-planner') return;
                    const target = entry.seats.find((candidate) => candidate.id === seat.id);
                    if (!target) return;
                    target.load = $event ?? 'balanced';
                  })
                "
              />
            </td>

            <td class="border-y px-3 py-3 align-top" :class="getSeatClasses(seat)">
              <UInput
                :model-value="seat.backupOwner"
                placeholder="Backup"
                size="sm"
                class="rounded-xl"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'seat-planner') return;
                    const target = entry.seats.find((candidate) => candidate.id === seat.id);
                    if (!target) return;
                    target.backupOwner = ($event ?? '').slice(0, 120);
                  })
                "
              />
            </td>

            <td
              class="rounded-r-xl border-y border-r px-3 py-3 text-right align-top"
              :class="getSeatClasses(seat)"
            >
              <div class="flex justify-end items-center gap-2">
                <UBadge
                  v-if="isSeatUncovered(seat)"
                  color="error"
                  variant="soft"
                  size="md"
                  class="rounded-full px-2.5 py-0.5"
                >
                  Uncovered
                </UBadge>
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  size="sm"
                  class="rounded-lg hover:text-error hover:bg-error/10"
                  aria-label="Remove seat"
                  @click="removeSeat(seat.id)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Legend -->
    <div class="grid gap-3 md:grid-cols-3">
      <div class="rounded-xl border border-muted/20 bg-default/40 p-3">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Health</p>
        <div class="mt-2.5 flex flex-wrap gap-1.5">
          <UBadge
            v-for="option in healthOptions"
            :key="option.value"
            variant="soft"
            size="sm"
            class="rounded-full px-2"
          >
            {{ workspaceSeatHealthLabels[option.value] }}
          </UBadge>
        </div>
      </div>

      <div class="rounded-xl border border-muted/20 bg-default/40 p-3">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Load</p>
        <div class="mt-2.5 flex flex-wrap gap-1.5">
          <UBadge
            v-for="option in loadOptions"
            :key="option.value"
            variant="soft"
            size="sm"
            class="rounded-full px-2"
          >
            {{ workspaceSeatLoadLevelLabels[option.value] }}
          </UBadge>
        </div>
      </div>

      <div class="rounded-xl border border-muted/20 bg-default/40 p-3">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Coverage Rule</p>
        <p class="mt-2.5 text-xs text-muted">
          Uncovered when owner missing, backup missing, or marked as gap.
        </p>
      </div>
    </div>
  </div>
</template>
