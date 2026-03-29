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
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-3xl bg-primary/5 p-5 border border-primary/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
          Pipeline Value
        </p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-primary">
          {{ formatCurrency(summary.totalValue) }}
        </p>
        <p class="mt-1 text-xs text-muted/60 font-semibold uppercase tracking-wider">{{ summary.dealCount }} deals in motion</p>
      </div>

      <div class="rounded-3xl bg-warning/5 p-5 border border-warning/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Open Value</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-warning">
          {{ formatCurrency(summary.openValue) }}
        </p>
        <p class="mt-1 text-xs text-muted/60 font-semibold uppercase tracking-wider">In progress</p>
      </div>

      <div class="rounded-3xl bg-success/5 p-5 border border-success/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
          Closed Value
        </p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-success">
          {{ formatCurrency(summary.closedValue) }}
        </p>
        <p class="mt-1 text-xs text-muted/60 font-semibold uppercase tracking-wider">Converted</p>
      </div>

      <div class="rounded-3xl bg-error/5 p-5 border border-error/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Top of Funnel</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-error">
          {{ summary.stageSummaries[0]?.dealCount ?? 0 }}
        </p>
        <p class="mt-1 text-xs text-muted/60 font-semibold uppercase tracking-wider">Leads qualified</p>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Stage-by-stage conversion picture</p>
        <p class="text-sm text-muted">
          The funnel narrows as deals progress so drop-off is visible without reading the list.
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

    <div class="rounded-3xl border border-muted/20 bg-default/40 p-5">
      <div class="space-y-3">
        <div v-for="stage in summary.stageSummaries" :key="stage.stage" class="flex justify-center">
          <div
            class="w-full rounded-2xl border px-4 py-4 transition-colors"
            :class="getStageRowClasses(stage.stage)"
            :style="{ width: `${stage.widthPercent}%` }"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
                  {{ stage.label }}
                </p>
                <p class="mt-1 text-sm font-semibold text-highlighted">
                  {{ stage.dealCount }} deals
                </p>
              </div>

              <p class="text-xl font-black tracking-tight text-highlighted">
                {{ formatCurrency(stage.totalValue) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div>
      <div class="mb-3 px-1">
        <p class="text-sm font-semibold text-highlighted">Quick stage moves</p>
        <p class="text-sm text-muted">Update stage ownership directly from the deal list below.</p>
      </div>

      <div
        v-if="sortedDeals.length === 0"
        class="border-dashed border-muted/20 rounded-3xl py-12 text-center bg-elevated/5"
      >
        <p class="text-sm font-semibold text-muted">No deals in the funnel yet.</p>
      </div>

      <div v-else class="space-y-3">
        <article
          v-for="deal in sortedDeals"
          :key="deal.id"
          class="rounded-2xl border border-muted/20 bg-default/40 p-4"
        >
          <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem_15rem_auto]">
            <div class="min-w-0">
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
                    base: 'px-0 text-base font-bold text-highlighted placeholder:text-muted/60',
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

              <p class="mt-2 pl-5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
                {{ workspaceSalesTemperatureLabels[deal.temperature] }} temperature
              </p>
            </div>

            <UFormField label="Value (EGP)" size="sm" :ui="{ label: 'text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1' }">
              <UInput
                :model-value="String(deal.valueEgp)"
                type="number"
                class="rounded-xl"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'pipeline-funnel') return;
                    const target = entry.deals.find((candidate) => candidate.id === deal.id);
                    if (!target) return;
                    target.valueEgp = toCurrencyValue($event ?? '0');
                  })
                "
              />
            </UFormField>

            <UFormField label="Stage" size="sm" :ui="{ label: 'text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1' }">
              <USelect
                :model-value="deal.stage"
                :items="stageOptions"
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
            </UFormField>

            <div class="flex items-end justify-end">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                class="rounded-xl hover:text-error"
                @click="removeDeal(deal.id)"
              />
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
