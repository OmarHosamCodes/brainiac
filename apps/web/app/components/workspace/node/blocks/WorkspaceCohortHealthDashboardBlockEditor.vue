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
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Seats Sold</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-primary">
          {{ summary.totalSeatsSold }}
        </p>
      </div>

      <div class="rounded-[28px] bg-success/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-success/70">
          Capacity Filled
        </p>
        <p class="mt-2 text-4xl font-black tracking-tight text-success">
          {{ summary.fillPercent }}%
        </p>
      </div>

      <div class="rounded-[28px] bg-secondary/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary/80">
          Booked Revenue
        </p>
        <p class="mt-2 text-2xl font-black tracking-tight text-secondary">
          {{ formatCurrency(summary.bookedRevenueEgp) }}
        </p>
      </div>

      <div class="rounded-[28px] bg-error/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-error/70">At Risk</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-error">{{ summary.atRiskCount }}</p>
      </div>
    </div>

    <div class="flex flex-wrap items-start justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Cohort / enrollment health dashboard</p>
        <p class="text-sm text-muted">
          Track fill rate, revenue, and delivery risk per cohort so weak intakes surface early.
        </p>
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        class="rounded-full px-4"
        @click="addCohort"
      >
        Add Cohort
      </UButton>
    </div>

    <div
      v-if="block.cohorts.length === 0"
      class="rounded-[32px] border border-dashed border-muted/40 bg-elevated/10 py-14 text-center"
    >
      <p class="text-sm font-semibold text-muted">No cohorts tracked yet.</p>
    </div>

    <div v-else class="grid gap-5">
      <article
        v-for="cohort in block.cohorts"
        :key="cohort.id"
        class="rounded-[34px] border p-5"
        :class="getHealthClasses(cohort.id)"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0 flex-1 space-y-3">
            <div class="flex flex-wrap items-center gap-3">
              <UInput
                :model-value="cohort.name"
                variant="none"
                placeholder="Cohort name"
                class="min-w-[14rem] flex-1"
                :ui="{ base: 'px-0 text-lg font-bold text-highlighted placeholder:text-muted/60' }"
                @update:model-value="
                  mutateCohort(cohort.id, (entry) => {
                    entry.name = ($event ?? '').slice(0, 120);
                  })
                "
              />

              <UBadge :class="getHealthClasses(cohort.id)" variant="subtle" size="sm">
                Health {{ getCohortHealthScore(cohort) }}
              </UBadge>
            </div>

            <div
              class="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted"
            >
              <span>{{ cohort.seatsSold }}/{{ cohort.capacity }} seats</span>
              <span>{{ getCohortFillPercent(cohort) }}% full</span>
              <span>{{ formatCurrency(cohort.revenueEgp) }}</span>
              <span v-if="cohort.startDate">Starts {{ cohort.startDate }}</span>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between gap-3 text-xs text-muted">
                <span>Utilization</span>
                <span>{{ getCohortFillPercent(cohort) }}%</span>
              </div>
              <UProgress
                :model-value="cohort.seatsSold"
                :max="Math.max(cohort.capacity, 1)"
                color="primary"
                class="rounded-full"
              />
            </div>
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            class="rounded-xl hover:bg-error/10 hover:text-error"
            @click="removeCohort(cohort.id)"
          />
        </div>

        <div class="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.52fr)_minmax(0,0.48fr)]">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Seats Sold" size="sm">
              <UInput
                :model-value="String(cohort.seatsSold)"
                type="number"
                class="rounded-2xl"
                @update:model-value="
                  mutateCohort(cohort.id, (entry) => {
                    entry.seatsSold = Math.min(
                      toPositiveInt($event, entry.seatsSold),
                      Math.max(entry.capacity, 0),
                    );
                  })
                "
              />
            </UFormField>

            <UFormField label="Capacity" size="sm">
              <UInput
                :model-value="String(cohort.capacity)"
                type="number"
                class="rounded-2xl"
                @update:model-value="
                  mutateCohort(cohort.id, (entry) => {
                    entry.capacity = Math.max(1, toPositiveInt($event, entry.capacity));
                    entry.seatsSold = Math.min(entry.seatsSold, entry.capacity);
                  })
                "
              />
            </UFormField>

            <UFormField label="Revenue" size="sm">
              <UInput
                :model-value="String(cohort.revenueEgp)"
                type="number"
                class="rounded-2xl"
                @update:model-value="
                  mutateCohort(cohort.id, (entry) => {
                    entry.revenueEgp = toPositiveInt($event, entry.revenueEgp);
                  })
                "
              />
            </UFormField>

            <UFormField label="Start Date" size="sm">
              <UInput
                :model-value="cohort.startDate ?? ''"
                type="date"
                class="rounded-2xl"
                @update:model-value="
                  mutateCohort(cohort.id, (entry) => {
                    entry.startDate = $event || null;
                  })
                "
              />
            </UFormField>
          </div>

          <div class="space-y-4 rounded-[28px] border border-muted/25 bg-default/60 p-4">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Status</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <UButton
                  v-for="status in statusOptions"
                  :key="`${cohort.id}-${status}`"
                  size="sm"
                  :color="cohort.status === status ? 'primary' : 'neutral'"
                  :variant="cohort.status === status ? 'soft' : 'outline'"
                  class="rounded-full px-4"
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

            <div class="space-y-3">
              <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Risk Flags</p>
              <div class="grid gap-3 sm:grid-cols-2">
                <label
                  class="flex items-center gap-3 rounded-2xl border border-muted/25 bg-elevated/20 px-3 py-3"
                >
                  <UCheckbox
                    :model-value="cohort.refundRisk"
                    @update:model-value="
                      mutateCohort(cohort.id, (entry) => {
                        entry.refundRisk = !!$event;
                      })
                    "
                  />
                  <span class="text-sm font-medium text-toned">Refund risk</span>
                </label>

                <label
                  class="flex items-center gap-3 rounded-2xl border border-muted/25 bg-elevated/20 px-3 py-3"
                >
                  <UCheckbox
                    :model-value="cohort.completionRisk"
                    @update:model-value="
                      mutateCohort(cohort.id, (entry) => {
                        entry.completionRisk = !!$event;
                      })
                    "
                  />
                  <span class="text-sm font-medium text-toned">Completion risk</span>
                </label>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <UBadge v-if="cohort.refundRisk" color="error" variant="soft" size="sm">
                Refund exposure
              </UBadge>
              <UBadge v-if="cohort.completionRisk" color="warning" variant="soft" size="sm">
                Weak completion outlook
              </UBadge>
              <UBadge
                v-if="!cohort.refundRisk && !cohort.completionRisk"
                color="success"
                variant="soft"
                size="sm"
              >
                No active risk flags
              </UBadge>
            </div>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
