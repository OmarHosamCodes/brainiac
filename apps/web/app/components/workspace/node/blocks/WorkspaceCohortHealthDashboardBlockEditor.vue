<script setup lang="ts">
import {
  createWorkspaceCohortHealthCohort,
  getCohortFillPercent,
  getCohortHealth,
  getCohortHealthScore,
  getCohortHealthSummary,
  workspaceCohortStatusLabels,
  type WorkspaceCohortHealthDashboardBlock,
  type WorkspaceCohortStatus,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceCohortHealthDashboardBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getCohortHealthSummary(props.block));
const statusOptions: WorkspaceCohortStatus[] = ["planning", "selling", "running", "completed"];

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("en-US")} EGP`;
}

function toPositiveInt(value: string | number | null | undefined, fallback: number) {
  const numeric = Number(value ?? fallback);
  return Math.max(0, Math.round(Number.isFinite(numeric) ? numeric : fallback));
}

function mutateCohort(
  cohortId: string,
  mutator: (cohort: WorkspaceCohortHealthDashboardBlock["cohorts"][number]) => void,
) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "cohort-health-dashboard") {
      return;
    }

    const cohort = block.cohorts.find((entry) => entry.id === cohortId);

    if (!cohort) {
      return;
    }

    mutator(cohort);
  });
}

function addCohort() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "cohort-health-dashboard") {
      return;
    }

    block.cohorts.push(
      createWorkspaceCohortHealthCohort({
        name: "New cohort",
        capacity: 20,
        seatsSold: 0,
        status: "planning",
      }),
    );
  });
}

function removeCohort(cohortId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "cohort-health-dashboard") {
      return;
    }

    block.cohorts = block.cohorts.filter((cohort) => cohort.id !== cohortId);
  });
}

function getHealthClasses(cohortId: string) {
  const cohort = props.block.cohorts.find((entry) => entry.id === cohortId);

  if (!cohort) {
    return "border-muted/30 bg-default/70 text-muted";
  }

  switch (getCohortHealth(cohort)) {
    case "healthy":
      return "border-success/30 bg-success/5 text-success";
    case "watch":
      return "border-warning/30 bg-warning/5 text-warning";
    default:
      return "border-error/30 bg-error/5 text-error";
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Summary Stats -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl bg-primary/10 border border-primary/20 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Seats Sold</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-primary">
          {{ summary.totalSeatsSold }}
        </p>
      </div>

      <div class="rounded-2xl bg-success/10 border border-success/20 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-success/70">
          Capacity Filled
        </p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-success">
          {{ summary.fillPercent }}%
        </p>
      </div>

      <div class="rounded-2xl bg-secondary/10 border border-secondary/20 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/80">
          Booked Revenue
        </p>
        <p class="mt-2 text-lg sm:text-xl font-black tracking-tight text-secondary font-mono">
          {{ formatCurrency(summary.bookedRevenueEgp) }}
        </p>
      </div>

      <div class="rounded-2xl bg-error/10 border border-error/20 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-error/70">At Risk</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-error">{{ summary.atRiskCount }}</p>
      </div>
    </div>

    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3 px-1">
      <div>
        <h2 class="text-sm font-black text-highlighted tracking-tight">Cohort Health Dashboard</h2>
        <p class="text-xs text-muted">Track fill rate, revenue, and delivery risk per cohort.</p>
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        size="sm"
        class="rounded-full"
        @click="addCohort"
      >
        Add Cohort
      </UButton>
    </div>

    <!-- Empty State -->
    <div
      v-if="block.cohorts.length === 0"
      class="border-dashed border border-muted/20 rounded-2xl py-10 text-center bg-elevated/5"
    >
      <div class="flex size-12 items-center justify-center rounded-xl bg-muted/10 text-muted/30 mx-auto">
        <UIcon name="i-lucide-users" size="24" />
      </div>
      <p class="mt-3 text-xs font-bold text-muted">No cohorts tracked yet</p>
    </div>

    <!-- Cohort Cards -->
    <div v-else class="grid gap-4">
      <article
        v-for="cohort in block.cohorts"
        :key="cohort.id"
        class="rounded-2xl border p-4 transition-colors"
        :class="getHealthClasses(cohort.id)"
      >
        <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div class="min-w-0 flex-1 space-y-2">
            <div class="flex flex-wrap items-center gap-2.5">
              <UInput
                :model-value="cohort.name"
                variant="none"
                placeholder="Cohort name"
                class="min-w-[12rem] flex-1"
                size="lg"
                :ui="{ base: 'px-0 text-base font-black text-highlighted placeholder:text-muted/40' }"
                @update:model-value="
                  mutateCohort(cohort.id, (entry) => {
                    entry.name = ($event ?? '').slice(0, 120);
                  })
                "
              />

              <UBadge
                :color="getCohortHealth(cohort) === 'healthy' ? 'success' : getCohortHealth(cohort) === 'watch' ? 'warning' : 'error'"
                variant="soft"
                size="md"
                class="rounded-lg px-3"
              >
                {{ getCohortHealth(cohort) }}
              </UBadge>
            </div>

            <div class="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
              <span>{{ cohort.seatsSold }}/{{ cohort.capacity }} seats</span>
              <span>{{ getCohortFillPercent(cohort) }}% full</span>
              <span class="font-mono">{{ formatCurrency(cohort.revenueEgp) }}</span>
              <span v-if="cohort.startDate">Starts {{ cohort.startDate }}</span>
            </div>

            <div class="space-y-1.5">
              <div class="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/50">
                <span>Fill Rate</span>
                <span>{{ getCohortFillPercent(cohort) }}%</span>
              </div>
              <UProgress
                :model-value="cohort.seatsSold"
                :max="Math.max(cohort.capacity, 1)"
                :color="getCohortHealth(cohort) === 'healthy' ? 'success' : getCohortHealth(cohort) === 'watch' ? 'warning' : 'error'"
                size="sm"
                class="rounded-full"
              />
            </div>
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="sm"
            class="rounded-lg hover:text-error hover:bg-error/10"
            aria-label="Remove cohort"
            @click="removeCohort(cohort.id)"
          />
        </div>

        <!-- Cohort Details -->
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <!-- Financial Metrics -->
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label :for="'sold-' + cohort.id" class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5">
                Seats Sold
              </label>
              <UInput
                :id="'sold-' + cohort.id"
                :model-value="String(cohort.seatsSold)"
                type="number"
                size="sm"
                class="rounded-xl font-mono"
                @update:model-value="
                  mutateCohort(cohort.id, (entry) => {
                    entry.seatsSold = Math.min(
                      toPositiveInt($event, entry.seatsSold),
                      Math.max(entry.capacity, 0),
                    );
                  })
                "
              />
            </div>

            <div>
              <label :for="'capacity-' + cohort.id" class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5">
                Capacity
              </label>
              <UInput
                :id="'capacity-' + cohort.id"
                :model-value="String(cohort.capacity)"
                type="number"
                size="sm"
                class="rounded-xl font-mono"
                @update:model-value="
                  mutateCohort(cohort.id, (entry) => {
                    entry.capacity = Math.max(1, toPositiveInt($event, entry.capacity));
                    entry.seatsSold = Math.min(entry.seatsSold, entry.capacity);
                  })
                "
              />
            </div>

            <div>
              <label :for="'revenue-' + cohort.id" class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5">
                Revenue (EGP)
              </label>
              <UInput
                :id="'revenue-' + cohort.id"
                :model-value="String(cohort.revenueEgp)"
                type="number"
                size="sm"
                class="rounded-xl font-mono"
                @update:model-value="
                  mutateCohort(cohort.id, (entry) => {
                    entry.revenueEgp = toPositiveInt($event, entry.revenueEgp);
                  })
                "
              />
            </div>

            <div>
              <label :for="'start-' + cohort.id" class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5">
                Start Date
              </label>
              <UInput
                :id="'start-' + cohort.id"
                :model-value="cohort.startDate ?? ''"
                type="date"
                size="sm"
                class="rounded-xl"
                @update:model-value="
                  mutateCohort(cohort.id, (entry) => {
                    entry.startDate = $event || null;
                  })
                "
              />
            </div>
          </div>

          <!-- Status & Risk -->
          <div class="space-y-3 rounded-xl border border-muted/20 bg-default/40 p-3">
            <!-- Status -->
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-2">Status</p>
              <div class="flex flex-wrap gap-1.5">
                <UButton
                  v-for="status in statusOptions"
                  :key="`${cohort.id}-${status}`"
                  size="xs"
                  :color="cohort.status === status ? 'primary' : 'neutral'"
                  :variant="cohort.status === status ? 'soft' : 'ghost'"
                  class="rounded-full px-3"
                  @click="
                    mutateCohort(cohort.id, (entry) => {
                      entry.status = status;
                    })
                  "
                >
                  {{ workspaceCohortStatusLabels[status] }}
                </UButton>
              </div>
            </div>

            <!-- Risk Flags -->
            <div class="space-y-2">
              <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Risk Flags</p>
              <div class="grid gap-2 sm:grid-cols-2">
                <label class="flex items-center gap-2.5 rounded-lg border border-muted/20 bg-elevated/10 px-3 py-2">
                  <UCheckbox
                    :model-value="cohort.refundRisk"
                    size="sm"
                    @update:model-value="
                      mutateCohort(cohort.id, (entry) => {
                        entry.refundRisk = !!$event;
                      })
                    "
                  />
                  <span class="text-xs font-bold uppercase tracking-[0.2em] text-muted/80">Refund</span>
                </label>

                <label class="flex items-center gap-2.5 rounded-lg border border-muted/20 bg-elevated/10 px-3 py-2">
                  <UCheckbox
                    :model-value="cohort.completionRisk"
                    size="sm"
                    @update:model-value="
                      mutateCohort(cohort.id, (entry) => {
                        entry.completionRisk = !!$event;
                      })
                    "
                  />
                  <span class="text-xs font-bold uppercase tracking-[0.2em] text-muted/80">Completion</span>
                </label>
              </div>
            </div>

            <!-- Active Risks Display -->
            <div class="flex flex-wrap gap-1.5">
              <UBadge
                v-if="cohort.refundRisk"
                color="error"
                variant="soft"
                size="sm"
                class="rounded-lg px-2.5 py-0.5"
              >
                Refund exposure
              </UBadge>
              <UBadge
                v-if="cohort.completionRisk"
                color="warning"
                variant="soft"
                size="sm"
                class="rounded-lg px-2.5 py-0.5"
              >
                Completion risk
              </UBadge>
              <UBadge
                v-if="!cohort.refundRisk && !cohort.completionRisk"
                color="success"
                variant="soft"
                size="sm"
                class="rounded-lg px-2.5 py-0.5"
              >
                No risks
              </UBadge>
            </div>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
