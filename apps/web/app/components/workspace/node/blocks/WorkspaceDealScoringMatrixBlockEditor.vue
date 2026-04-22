<script setup lang="ts">
import {
  createWorkspaceDealScoringDeal,
  getDealScoreTone,
  getDealScoringMatrixSummary,
  sortDealScoringDeals,
  workspaceSalesPipelineStageLabels,
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

const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getDealScoringMatrixSummary(props.block));
const sortedDeals = computed(() => sortDealScoringDeals(props.block.deals));
const advancedStageCount = computed(
  () =>
    summary.value.stageCounts.proposal +
    summary.value.stageCounts.negotiation +
    summary.value.stageCounts.closed,
);
const topDeal = computed(() => sortedDeals.value[0] ?? null);

const temperatureOptions = [
  { label: workspaceSalesTemperatureLabels.hot, value: "hot" },
  { label: workspaceSalesTemperatureLabels.warm, value: "warm" },
  { label: workspaceSalesTemperatureLabels.cold, value: "cold" },
] satisfies Array<{ label: string; value: WorkspaceSalesTemperature }>;

const stageOptions = (["lead", "consultation", "proposal", "negotiation", "closed"] as const).map(
  (stage) => ({
    label: workspaceSalesPipelineStageLabels[stage],
    value: stage,
  }),
) satisfies Array<{ label: string; value: WorkspaceSalesPipelineStage }>;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

function addDeal() {
  mutateTypedBlock(props.tabId, props.block.id, "deal-scoring-matrix", (entry) => {
    entry.deals.unshift(createWorkspaceDealScoringDeal());
  });
}

function mutateDeal(
  dealId: string,
  mutator: (deal: WorkspaceDealScoringMatrixBlock["deals"][number]) => void,
) {
  mutateTypedBlock(props.tabId, props.block.id, "deal-scoring-matrix", (entry) => {
    const target = entry.deals.find((candidate) => candidate.id === dealId);

    if (!target) {
      return;
    }

    mutator(target);
  });
}

function removeDeal(dealId: string) {
  mutateTypedBlock(props.tabId, props.block.id, "deal-scoring-matrix", (entry) => {
    entry.deals = entry.deals.filter((deal) => deal.id !== dealId);
  });
}

function updateClientName(dealId: string, value: string | number | undefined) {
  mutateDeal(dealId, (deal) => {
    deal.clientName = String(value ?? "").slice(0, 120);
  });
}

function updateValue(dealId: string, value: string | number | undefined) {
  mutateDeal(dealId, (deal) => {
    deal.valueEgp = toCurrencyValue(String(value ?? "0"));
  });
}

function updateTemperature(dealId: string, value: WorkspaceSalesTemperature | string | undefined) {
  mutateDeal(dealId, (deal) => {
    deal.temperature = value === "hot" || value === "warm" || value === "cold" ? value : "warm";
  });
}

function updateStage(dealId: string, value: WorkspaceSalesPipelineStage | string | undefined) {
  mutateDeal(dealId, (deal) => {
    deal.stage =
      value === "lead" ||
      value === "consultation" ||
      value === "proposal" ||
      value === "negotiation" ||
      value === "closed"
        ? value
        : "lead";
  });
}

function updateScore(dealId: string, value: string | number | undefined) {
  mutateDeal(dealId, (deal) => {
    deal.score = clampScore(String(value ?? "0"));
  });
}

function updateNextAction(dealId: string, value: string | number | undefined) {
  mutateDeal(dealId, (deal) => {
    deal.nextAction = String(value ?? "").slice(0, 240);
  });
}

function updateDueDate(dealId: string, value: string | number | undefined) {
  mutateDeal(dealId, (deal) => {
    deal.dueDate = String(value ?? "") || null;
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

function getCardClasses(score: number) {
  switch (getDealScoreTone(score)) {
    case "strong":
      return "border-success/20 bg-success/5";
    case "medium":
      return "border-warning/20 bg-warning/5";
    default:
      return "border-error/20 bg-error/5";
  }
}

function getPriorityLabel(score: number) {
  if (score >= 75) {
    return "Strong";
  }

  if (score >= 50) {
    return "Watch";
  }

  return "Weak";
}

function getPrioritySummary(score: number) {
  if (score >= 75) {
    return "High-priority opportunity with strong momentum.";
  }

  if (score >= 50) {
    return "Worth advancing, but it still needs focused follow-through.";
  }

  return "Low-confidence opportunity that needs qualification or a reset.";
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Pipeline</p>
        <p class="mt-2 text-2xl font-black tracking-tight text-highlighted sm:text-3xl">
          {{ formatCurrency(summary.totalValue) }}
        </p>
        <p class="mt-1 text-sm text-muted">{{ summary.dealCount }} active deals</p>
      </div>

      <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Avg Score</p>
        <p class="mt-2 text-2xl font-black tracking-tight text-highlighted sm:text-3xl">
          {{ summary.averageScore }}
        </p>
        <p class="mt-1 text-sm text-muted">Prioritization score out of 100</p>
      </div>

      <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Hot Deals</p>
        <p class="mt-2 text-2xl font-black tracking-tight text-highlighted sm:text-3xl">
          {{ summary.hotCount }}
        </p>
        <p class="mt-1 text-sm text-muted">Immediate follow-up required</p>
      </div>

      <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Advanced Stage</p>
        <p class="mt-2 text-2xl font-black tracking-tight text-highlighted sm:text-3xl">
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

      <div class="flex flex-wrap items-center gap-2">
        <UBadge v-if="topDeal" color="neutral" variant="soft" class="rounded-full">
          Top deal: {{ topDeal.clientName || "Untitled deal" }}
        </UBadge>

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
    </div>

    <div
      v-if="sortedDeals.length === 0"
      class="rounded-3xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center"
    >
      <p class="text-sm font-semibold text-muted">No scored deals yet.</p>
      <p class="mt-1 text-sm text-muted">
        Add your first opportunity to start ranking the pipeline.
      </p>
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="(deal, index) in sortedDeals"
        :key="deal.id"
        class="rounded-3xl border p-5 transition-colors"
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
                :ui="{
                  base: 'px-0 text-lg font-bold text-highlighted placeholder:text-muted/60',
                }"
                @update:model-value="updateClientName(deal.id, $event)"
              />
            </div>

            <div class="mt-2 flex flex-wrap items-center gap-2">
              <UBadge color="neutral" variant="soft" class="rounded-full">
                #{{ index + 1 }} in stack
              </UBadge>
              <UBadge color="neutral" variant="soft" class="rounded-full">
                {{ workspaceSalesTemperatureLabels[deal.temperature] }}
              </UBadge>
              <UBadge color="neutral" variant="soft" class="rounded-full">
                {{ workspaceSalesPipelineStageLabels[deal.stage] }}
              </UBadge>
              <UBadge v-if="deal.dueDate" color="neutral" variant="soft" class="rounded-full">
                Due {{ deal.dueDate }}
              </UBadge>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="text-right">
              <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Score</p>
              <p
                class="mt-1 text-2xl font-black tracking-tight sm:text-3xl"
                :class="getScoreTextClasses(deal.score)"
              >
                {{ deal.score }}
              </p>
              <p class="mt-1 text-xs font-semibold" :class="getScoreTextClasses(deal.score)">
                {{ getPriorityLabel(deal.score) }}
              </p>
            </div>

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              class="rounded-2xl hover:text-error"
              :aria-label="`Remove ${deal.clientName || 'deal'}`"
              @click="removeDeal(deal.id)"
            />
          </div>
        </div>

        <div class="mt-5 grid gap-4 lg:grid-cols-4">
          <UFormField label="Deal Value (EGP)" size="sm">
            <UInput
              :model-value="String(deal.valueEgp)"
              type="number"
              icon="i-lucide-badge-dollar-sign"
              class="w-full"
              :ui="{ base: 'rounded-2xl' }"
              @update:model-value="updateValue(deal.id, $event)"
            />
          </UFormField>

          <UFormField label="Temperature" size="sm">
            <USelect
              :model-value="deal.temperature"
              :items="temperatureOptions"
              class="w-full"
              :ui="{ base: 'rounded-2xl' }"
              @update:model-value="
                updateTemperature(deal.id, $event as WorkspaceSalesTemperature | undefined)
              "
            />
          </UFormField>

          <UFormField label="Stage" size="sm">
            <USelect
              :model-value="deal.stage"
              :items="stageOptions"
              class="w-full"
              :ui="{ base: 'rounded-2xl' }"
              @update:model-value="
                updateStage(deal.id, $event as WorkspaceSalesPipelineStage | undefined)
              "
            />
          </UFormField>

          <UFormField label="Due Date" size="sm">
            <UInput
              :model-value="deal.dueDate ?? ''"
              type="date"
              class="w-full"
              :ui="{ base: 'rounded-2xl' }"
              @update:model-value="updateDueDate(deal.id, $event)"
            />
          </UFormField>
        </div>

        <div class="mt-5 space-y-3">
          <div
            class="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
          >
            <span>Priority Score</span>
            <span :class="getScoreTextClasses(deal.score)">
              {{ getPriorityLabel(deal.score) }}
            </span>
          </div>

          <UProgress :model-value="deal.score" size="sm" class="rounded-full" />

          <USlider
            :model-value="deal.score"
            :min="0"
            :max="100"
            :step="1"
            size="sm"
            @update:model-value="updateScore(deal.id, $event)"
          />
        </div>

        <div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <UFormField label="Next Action" size="sm">
            <UInput
              :model-value="deal.nextAction"
              class="w-full"
              :ui="{ base: 'rounded-2xl' }"
              placeholder="What needs to happen next?"
              @update:model-value="updateNextAction(deal.id, $event)"
            />
          </UFormField>

          <div class="rounded-2xl border border-muted/20 bg-default/40 p-4">
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
              Priority context
            </p>
            <p class="mt-2 text-sm font-semibold text-highlighted">
              {{ workspaceSalesPipelineStageLabels[deal.stage] }}
            </p>
            <p class="mt-1 text-sm text-muted">
              {{ getPrioritySummary(deal.score) }}
            </p>
          </div>
        </div>

        <p class="mt-4 text-sm text-muted">
          {{ formatCurrency(deal.valueEgp) }} opportunity with
          {{ workspaceSalesTemperatureLabels[deal.temperature].toLowerCase() }}
          urgency.
        </p>
      </article>
    </div>
  </div>
</template>
