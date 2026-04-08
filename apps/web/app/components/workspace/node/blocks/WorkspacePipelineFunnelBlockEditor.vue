<script setup lang="ts">
import {
  WORKSPACE_SALES_PIPELINE_STAGES,
  createWorkspacePipelineFunnelDeal,
  getPipelineFunnelSummary,
  getSalesPipelineStageIndex,
  workspaceSalesPipelineStageLabels,
  workspaceSalesTemperatureLabels,
  type WorkspacePipelineFunnelBlock,
  type WorkspaceSalesPipelineStage,
  type WorkspaceSalesTemperature,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspacePipelineFunnelBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getPipelineFunnelSummary(props.block));
const sortedDeals = computed(() =>
  [...props.block.deals].sort((left, right) => {
    const stageDelta =
      getSalesPipelineStageIndex(left.stage) - getSalesPipelineStageIndex(right.stage);

    if (stageDelta !== 0) {
      return stageDelta;
    }

    return right.valueEgp - left.valueEgp;
  }),
);

const stageOptions = WORKSPACE_SALES_PIPELINE_STAGES.map((stage) => ({
  label: workspaceSalesPipelineStageLabels[stage],
  value: stage,
})) satisfies Array<{ label: string; value: WorkspaceSalesPipelineStage }>;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

function addDeal() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "pipeline-funnel") {
      return;
    }

    block.deals.unshift(createWorkspacePipelineFunnelDeal());
  });
}

function removeDeal(dealId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "pipeline-funnel") {
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

function getStageRowClasses(stage: WorkspaceSalesPipelineStage) {
  switch (stage) {
    case "lead":
      return "border-primary/30 bg-primary/5";
    case "consultation":
      return "border-info/30 bg-info/5";
    case "proposal":
      return "border-warning/35 bg-warning/5";
    case "negotiation":
      return "border-secondary/35 bg-secondary/8";
    case "closed":
      return "border-success/35 bg-success/5";
  }

  return "border-muted/30 bg-default/60";
}
</script>

<template>
  <div class="space-y-5">
    <!-- Executive Summary -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl bg-primary/5 p-4 border border-primary/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
          Pipeline Value
        </p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-primary">
          {{ formatCurrency(summary.totalValue) }}
        </p>
        <p class="mt-1 text-[11px] text-muted/60 font-semibold uppercase tracking-wider">{{ summary.dealCount }} deals</p>
      </div>

      <div class="rounded-2xl bg-warning/5 p-4 border border-warning/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Open Value</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-warning">
          {{ formatCurrency(summary.openValue) }}
        </p>
        <p class="mt-1 text-[11px] text-muted/60 font-semibold uppercase tracking-wider">In progress</p>
      </div>

      <div class="rounded-2xl bg-success/5 p-4 border border-success/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
          Closed Value
        </p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-success">
          {{ formatCurrency(summary.closedValue) }}
        </p>
        <p class="mt-1 text-[11px] text-muted/60 font-semibold uppercase tracking-wider">Converted</p>
      </div>

      <div class="rounded-2xl bg-error/5 p-4 border border-error/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Top of Funnel</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-error">
          {{ summary.stageSummaries[0]?.dealCount ?? 0 }}
        </p>
        <p class="mt-1 text-[11px] text-muted/60 font-semibold uppercase tracking-wider">Leads qualified</p>
      </div>
    </div>

    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <h2 class="text-sm font-black text-highlighted tracking-tight">Sales Pipeline Funnel</h2>
        <p class="text-xs text-muted">Track deal progression and conversion at each stage.</p>
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        size="sm"
        class="rounded-full"
        @click="addDeal"
      >
        Add Deal
      </UButton>
    </div>

    <!-- Funnel Visualization -->
    <div class="rounded-2xl border border-muted/20 bg-default/40 p-4">
      <div class="space-y-2.5">
        <div v-for="stage in summary.stageSummaries" :key="stage.stage" class="flex justify-center">
          <div
            class="w-full rounded-xl border px-4 py-3 transition-colors"
            :class="getStageRowClasses(stage.stage)"
            :style="{ width: `${stage.widthPercent}%` }"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
                  {{ stage.label }}
                </p>
                <p class="mt-0.5 text-sm font-bold text-highlighted">
                  {{ stage.dealCount }} deal{{ stage.dealCount !== 1 ? 's' : '' }}
                </p>
              </div>

              <p class="text-lg sm:text-xl font-black tracking-tight text-highlighted font-mono">
                {{ formatCurrency(stage.totalValue) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Deal List -->
    <div>
      <div class="mb-3 px-1">
        <h3 class="text-sm font-black text-highlighted tracking-tight">Deals</h3>
        <p class="text-xs text-muted">Update stage and value directly from the list.</p>
      </div>

      <div
        v-if="sortedDeals.length === 0"
        class="border-dashed border-muted/20 rounded-2xl py-10 text-center bg-elevated/5"
      >
        <div class="flex size-12 items-center justify-center rounded-xl bg-muted/10 text-muted/30 mx-auto">
          <UIcon name="i-lucide-funnel" size="24" />
        </div>
        <p class="mt-3 text-xs font-bold text-muted">No deals yet</p>
      </div>

      <div v-else class="space-y-3">
        <article
          v-for="deal in sortedDeals"
          :key="deal.id"
          class="rounded-2xl border border-muted/20 bg-default/40 p-4"
        >
          <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] items-center">
            <div class="min-w-0">
              <div class="flex items-center gap-2.5">
                <span
                  class="size-2 shrink-0 rounded-full"
                  :class="getTemperatureDotClasses(deal.temperature)"
                />
                <UInput
                  :model-value="deal.clientName"
                  variant="none"
                  placeholder="Client name"
                  class="w-full"
                  :ui="{
                    base: 'px-0 text-base font-black text-highlighted placeholder:text-muted/40',
                  }"
                  @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'pipeline-funnel') return;
                      const target = entry.deals.find((candidate) => candidate.id === deal.id);
                      if (!target) return;
                      target.clientName = ($event ?? '').slice(0, 120);
                    })
                  "
                />
              </div>

              <p class="mt-1.5 pl-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
                {{ workspaceSalesTemperatureLabels[deal.temperature] }} temperature
              </p>
            </div>

            <div>
              <label :for="'value-' + deal.id" class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5">
                Value (EGP)
              </label>
              <UInput
                :id="'value-' + deal.id"
                :model-value="String(deal.valueEgp)"
                type="number"
                size="sm"
                class="rounded-xl font-mono"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'pipeline-funnel') return;
                    const target = entry.deals.find((candidate) => candidate.id === deal.id);
                    if (!target) return;
                    target.valueEgp = toCurrencyValue($event ?? '0');
                  })
                "
              />
            </div>

            <div>
              <label :for="'stage-' + deal.id" class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5">
                Stage
              </label>
              <USelect
                :id="'stage-' + deal.id"
                :model-value="deal.stage"
                :items="stageOptions"
                size="sm"
                class="rounded-xl"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'pipeline-funnel') return;
                    const target = entry.deals.find((candidate) => candidate.id === deal.id);
                    if (!target) return;
                    target.stage = $event ?? 'lead';
                  })
                "
              />
            </div>

            <div class="flex justify-end">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="sm"
                class="rounded-lg hover:text-error hover:bg-error/10"
                aria-label="Remove deal"
                @click="removeDeal(deal.id)"
              />
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
