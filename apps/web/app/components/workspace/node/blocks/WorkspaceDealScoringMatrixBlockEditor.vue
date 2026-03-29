<script setup lang="ts">
import {
  WORKSPACE_SALES_PIPELINE_STAGES,
  createWorkspaceDealScoringDeal,
  getDealScoreTone,
  getDealScoringMatrixSummary,
  getSalesPipelineStageIndex,
  sortDealScoringDeals,
  workspaceSalesPipelineStageCompactLabels,
  workspaceSalesTemperatureLabels,
  type WorkspaceDealScoringMatrixBlock,
  type WorkspaceSalesPipelineStage,
  type WorkspaceSalesTemperature,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceDealScoringMatrixBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getDealScoringMatrixSummary(props.block));
const sortedDeals = computed(() => sortDealScoringDeals(props.block.deals));
const advancedStageCount = computed(
  () =>
    summary.value.stageCounts.proposal +
    summary.value.stageCounts.negotiation +
    summary.value.stageCounts.closed,
);

const temperatureOptions = [
  { label: workspaceSalesTemperatureLabels.hot, value: "hot" },
  { label: workspaceSalesTemperatureLabels.warm, value: "warm" },
  { label: workspaceSalesTemperatureLabels.cold, value: "cold" },
] satisfies Array<{ label: string; value: WorkspaceSalesTemperature }>;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

function addDeal() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "deal-scoring-matrix") {
      return;
    }

    block.deals.unshift(createWorkspaceDealScoringDeal());
  });
}

function removeDeal(dealId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "deal-scoring-matrix") {
      return;
    }

    block.deals = block.deals.filter((deal) => deal.id !== dealId);
  });
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function toCurrencyValue(value: string) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(1_000_000_000, Math.round(numeric)));
}

function clampScore(value: string) {
  const numeric = Number(value || 0);
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function getInputValue(event: Event) {
  return (event.target as HTMLInputElement | null)?.value ?? "0";
}

function getTemperatureDotClasses(temperature: WorkspaceSalesTemperature) {
  switch (temperature) {
    case "hot":
      return "bg-error";
    case "warm":
      return "bg-warning";
    default:
      return "bg-muted";
  }
}

function getScoreTextClasses(score: number) {
  switch (getDealScoreTone(score)) {
    case "strong":
      return "text-success";
    case "medium":
      return "text-warning";
    default:
      return "text-error";
  }
}

function getStageButtonClasses(
  stage: WorkspaceSalesPipelineStage,
  activeStage: WorkspaceSalesPipelineStage,
) {
  const stageIndex = getSalesPipelineStageIndex(stage);
  const activeIndex = getSalesPipelineStageIndex(activeStage);

  if (stageIndex === activeIndex) {
    return "border-primary/40 bg-primary/10 text-primary";
  }

  if (stageIndex < activeIndex) {
    return "border-success/35 bg-success/5 text-success";
  }

  return "border-muted/35 bg-default/70 text-muted hover:border-primary/20 hover:text-highlighted";
}

function getCardClasses(score: number) {
  switch (getDealScoreTone(score)) {
    case "strong":
      return "border-success/30 bg-success/5";
    case "medium":
      return "border-warning/30 bg-warning/5";
    default:
      return "border-error/30 bg-error/5";
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Pipeline</p>
        <p class="mt-2 text-3xl font-black tracking-tight text-primary">
          {{ formatCurrency(summary.totalValue) }}
        </p>
        <p class="mt-1 text-sm text-muted">{{ summary.dealCount }} active deals</p>
      </div>

      <div class="rounded-[28px] bg-success/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-success/70">Avg Score</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-success">
          {{ summary.averageScore }}
        </p>
        <p class="mt-1 text-sm text-muted">Prioritization score out of 100</p>
      </div>

      <div class="rounded-[28px] bg-error/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-error/70">Hot Deals</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-error">{{ summary.hotCount }}</p>
        <p class="mt-1 text-sm text-muted">Immediate follow-up required</p>
      </div>

      <div class="rounded-[28px] bg-warning/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-warning/70">
          Advanced Stage
        </p>
        <p class="mt-2 text-4xl font-black tracking-tight text-warning">
          {{ advancedStageCount }}
        </p>
        <p class="mt-1 text-sm text-muted">Proposal or later</p>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Deal priority stack</p>
        <p class="text-sm text-muted">
          Deals are automatically ranked by score so the best opportunities stay at the top.
        </p>
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        class="rounded-full px-4"
        @click="addDeal"
      >
        Add Deal
      </UButton>
    </div>

    <div
      v-if="sortedDeals.length === 0"
      class="rounded-[32px] border border-dashed border-muted/50 bg-elevated/10 py-14 text-center"
    >
      <p class="text-sm font-semibold text-muted">No scored deals yet.</p>
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="deal in sortedDeals"
        :key="deal.id"
        class="rounded-[32px] border p-5 transition-colors"
        :class="getCardClasses(deal.score)"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <span
                class="size-2.5 shrink-0 rounded-full"
                :class="getTemperatureDotClasses(deal.temperature)"
              />
              <UInput
                :model-value="deal.clientName"
                variant="none"
                placeholder="Client name"
                class="w-full"
                :ui="{ base: 'px-0 text-lg font-bold text-highlighted placeholder:text-muted/60' }"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'deal-scoring-matrix') return;
                    const target = entry.deals.find((candidate) => candidate.id === deal.id);
                    if (!target) return;
                    target.clientName = ($event ?? '').slice(0, 120);
                  })
                "
              />
            </div>

            <p class="mt-2 text-sm text-muted">
              {{ workspaceSalesTemperatureLabels[deal.temperature] }} deal in
              {{ workspaceSalesPipelineStageCompactLabels[deal.stage] }}
            </p>
          </div>

          <div class="flex items-start gap-3">
            <div class="text-right">
              <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Score</p>
              <p
                class="mt-1 text-4xl font-black tracking-tight"
                :class="getScoreTextClasses(deal.score)"
              >
                {{ deal.score }}
              </p>
            </div>

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              class="rounded-xl hover:text-error"
              @click="removeDeal(deal.id)"
            />
          </div>
        </div>

        <div class="mt-5 grid gap-4 lg:grid-cols-[14rem_13rem]">
          <UFormField label="Deal Value (EGP)" size="sm">
            <UInput
              :model-value="String(deal.valueEgp)"
              type="number"
              icon="i-lucide-badge-dollar-sign"
              class="rounded-2xl"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'deal-scoring-matrix') return;
                  const target = entry.deals.find((candidate) => candidate.id === deal.id);
                  if (!target) return;
                  target.valueEgp = toCurrencyValue($event ?? '0');
                })
              "
            />
          </UFormField>

          <UFormField label="Temperature" size="sm">
            <USelect
              :model-value="deal.temperature"
              :items="temperatureOptions"
              class="rounded-2xl"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'deal-scoring-matrix') return;
                  const target = entry.deals.find((candidate) => candidate.id === deal.id);
                  if (!target) return;
                  target.temperature = $event ?? 'warm';
                })
              "
            />
          </UFormField>
        </div>

        <div class="mt-5 space-y-3">
          <div
            class="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-muted"
          >
            <span>Priority Score</span>
            <span :class="getScoreTextClasses(deal.score)">
              {{ deal.score >= 75 ? "Strong" : deal.score >= 50 ? "Watch" : "Weak" }}
            </span>
          </div>

          <UProgress :model-value="deal.score" size="sm" class="rounded-full" />

          <input
            :value="deal.score"
            type="range"
            min="0"
            max="100"
            step="1"
            class="w-full accent-primary"
            @input="
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== 'deal-scoring-matrix') return;
                const target = entry.deals.find((candidate) => candidate.id === deal.id);
                if (!target) return;
                target.score = clampScore(getInputValue($event));
              })
            "
          />
        </div>

        <div class="mt-5">
          <div class="grid gap-2 sm:grid-cols-5">
            <button
              v-for="stage in WORKSPACE_SALES_PIPELINE_STAGES"
              :key="`${deal.id}-${stage}`"
              type="button"
              class="rounded-2xl border px-3 py-3 text-center text-xs font-bold uppercase tracking-[0.18em] transition-colors"
              :class="getStageButtonClasses(stage, deal.stage)"
              @click="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'deal-scoring-matrix') return;
                  const target = entry.deals.find((candidate) => candidate.id === deal.id);
                  if (!target) return;
                  target.stage = stage;
                })
              "
            >
              {{ workspaceSalesPipelineStageCompactLabels[stage] }}
            </button>
          </div>
        </div>

        <div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <UFormField label="Next Action" size="sm">
            <UInput
              :model-value="deal.nextAction"
              class="rounded-2xl"
              placeholder="What needs to happen next?"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'deal-scoring-matrix') return;
                  const target = entry.deals.find((candidate) => candidate.id === deal.id);
                  if (!target) return;
                  target.nextAction = ($event ?? '').slice(0, 240);
                })
              "
            />
          </UFormField>

          <UFormField label="Due Date" size="sm">
            <UInput
              :model-value="deal.dueDate ?? ''"
              type="date"
              class="rounded-2xl"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'deal-scoring-matrix') return;
                  const target = entry.deals.find((candidate) => candidate.id === deal.id);
                  if (!target) return;
                  target.dueDate = $event || null;
                })
              "
            />
          </UFormField>
        </div>

        <p class="mt-4 text-sm text-muted">
          {{ formatCurrency(deal.valueEgp) }} opportunity with
          {{ workspaceSalesTemperatureLabels[deal.temperature].toLowerCase() }} urgency.
        </p>
      </article>
    </div>
  </div>
</template>
