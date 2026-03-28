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
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Filled Seats</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-primary">{{ summary.filledSeats }}</p>
      </div>

      <div class="rounded-[28px] bg-warning/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-warning/70">Fragile</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-warning">{{ summary.fragileSeats }}</p>
      </div>

      <div class="rounded-[28px] bg-error/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-error/70">Uncovered</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-error">{{ summary.uncoveredSeats }}</p>
      </div>

      <div class="rounded-[28px] bg-elevated/70 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Overloaded</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-highlighted">{{ summary.overloadedSeats }}</p>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Seat ownership planner</p>
        <p class="text-sm text-muted">
          Clarify who owns each critical function, which seats are fragile, and where coverage is missing.
        </p>
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        class="rounded-full px-4"
        @click="addSeat"
      >
        Add Critical Seat
      </UButton>
    </div>

    <div class="flex flex-wrap gap-2">
      <UButton
        v-for="filter in filterOptions"
        :key="filter.value"
        :color="block.filter === filter.value ? 'primary' : 'neutral'"
        :variant="block.filter === filter.value ? 'soft' : 'ghost'"
        class="rounded-full px-4"
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

    <div v-if="visibleSeats.length === 0" class="rounded-[32px] border border-dashed border-muted/50 bg-elevated/10 py-14 text-center">
      <p class="text-sm font-semibold text-muted">No seats match this filter.</p>
    </div>

    <div v-else class="overflow-x-auto pb-2">
      <table class="min-w-[1200px] w-full border-separate border-spacing-y-3">
        <thead>
          <tr>
            <th class="px-3 pb-1 text-left text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Seat</th>
            <th class="px-3 pb-1 text-left text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Owner</th>
            <th class="px-3 pb-1 text-left text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Function</th>
            <th class="px-3 pb-1 text-left text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Health</th>
            <th class="px-3 pb-1 text-left text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Load</th>
            <th class="px-3 pb-1 text-left text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Backup</th>
            <th class="px-3 pb-1 text-left text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Notes</th>
            <th class="px-3 pb-1 text-right text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="seat in visibleSeats"
            :key="seat.id"
          >
            <td class="rounded-l-[28px] border-y border-l px-3 py-4 align-top" :class="getSeatClasses(seat)">
              <UInput
                :model-value="seat.name"
                variant="none"
                placeholder="Seat name"
                :ui="{ base: 'px-0 text-sm font-semibold text-highlighted placeholder:text-muted/60' }"
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

            <td class="border-y px-3 py-4 align-top" :class="getSeatClasses(seat)">
              <UInput
                :model-value="seat.owner"
                placeholder="Current owner"
                class="rounded-2xl"
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

            <td class="border-y px-3 py-4 align-top" :class="getSeatClasses(seat)">
              <UInput
                :model-value="seat.function"
                placeholder="Primary function"
                class="rounded-2xl"
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

            <td class="border-y px-3 py-4 align-top" :class="getSeatClasses(seat)">
              <USelect
                :model-value="seat.health"
                :items="healthOptions"
                class="rounded-2xl"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'seat-planner') return;
                    const target = entry.seats.find((candidate) => candidate.id === seat.id);
                    if (!target) return;
                    target.health = ($event ?? 'strong');
                  })
                "
              />
            </td>

            <td class="border-y px-3 py-4 align-top" :class="getSeatClasses(seat)">
              <USelect
                :model-value="seat.load"
                :items="loadOptions"
                class="rounded-2xl"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'seat-planner') return;
                    const target = entry.seats.find((candidate) => candidate.id === seat.id);
                    if (!target) return;
                    target.load = ($event ?? 'balanced');
                  })
                "
              />
            </td>

            <td class="border-y px-3 py-4 align-top" :class="getSeatClasses(seat)">
              <UInput
                :model-value="seat.backupOwner"
                placeholder="Backup owner"
                class="rounded-2xl"
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

            <td class="border-y px-3 py-4 align-top" :class="getSeatClasses(seat)">
              <UTextarea
                :model-value="seat.notes"
                autoresize
                :rows="2"
                :max-rows="6"
                class="rounded-2xl"
                placeholder="Risk, context, or hiring note"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'seat-planner') return;
                    const target = entry.seats.find((candidate) => candidate.id === seat.id);
                    if (!target) return;
                    target.notes = ($event ?? '').slice(0, 2000);
                  })
                "
              />
            </td>

            <td class="rounded-r-[28px] border-y border-r px-3 py-4 text-right align-top" :class="getSeatClasses(seat)">
              <div class="flex justify-end gap-2">
                <UBadge
                  v-if="isSeatUncovered(seat)"
                  color="error"
                  variant="soft"
                  size="sm"
                  class="rounded-full"
                >
                  Uncovered
                </UBadge>
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  class="rounded-xl hover:text-error"
                  @click="removeSeat(seat.id)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="grid gap-3 md:grid-cols-3">
      <div class="rounded-[24px] border border-muted/40 bg-elevated/30 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Seat Health</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UBadge v-for="option in healthOptions" :key="option.value" variant="soft" class="rounded-full">
            {{ workspaceSeatHealthLabels[option.value] }}
          </UBadge>
        </div>
      </div>

      <div class="rounded-[24px] border border-muted/40 bg-elevated/30 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Load Level</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UBadge v-for="option in loadOptions" :key="option.value" variant="soft" class="rounded-full">
            {{ workspaceSeatLoadLevelLabels[option.value] }}
          </UBadge>
        </div>
      </div>

      <div class="rounded-[24px] border border-muted/40 bg-elevated/30 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Coverage Rule</p>
        <p class="mt-3 text-sm text-muted">
          Seats count as uncovered when ownership is missing, backup is missing, or the seat is explicitly marked as a gap.
        </p>
      </div>
    </div>
  </div>
</template>
