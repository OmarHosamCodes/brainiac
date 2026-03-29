<script setup lang="ts">
import {
  WORKSPACE_SALES_FORECAST_BUCKETS,
  createWorkspaceForecastConfidenceItem,
  getForecastConfidenceBoardSummary,
  getForecastDealWeightedValue,
  workspaceSalesForecastBucketLabels,
  type WorkspaceForecastConfidenceBoardBlock,
  type WorkspaceSalesForecastBucket,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceForecastConfidenceBoardBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getForecastConfidenceBoardSummary(props.block));
const dealsByBucket = computed(
  () =>
    Object.fromEntries(
      WORKSPACE_SALES_FORECAST_BUCKETS.map((bucket) => [
        bucket,
        props.block.deals
          .filter((deal) => deal.bucket === bucket)
          .sort(
            (left, right) => right.confidence - left.confidence || right.valueEgp - left.valueEgp,
          ),
      ]),
    ) as Record<WorkspaceSalesForecastBucket, WorkspaceForecastConfidenceBoardBlock["deals"]>,
);
const bucketSummaryById = computed(
  () => new Map(summary.value.bucketSummaries.map((entry) => [entry.bucket, entry])),
);

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

const draggingDealId = ref<string | null>(null);
const dragOverBucket = ref<WorkspaceSalesForecastBucket | null>(null);

function onDealDragStart(dealId: string, event: DragEvent) {
  draggingDealId.value = dealId;
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("application/x-workspace-forecast-deal", dealId);
  event.dataTransfer.setData("text/plain", dealId);
}

function clearDragState() {
  draggingDealId.value = null;
  dragOverBucket.value = null;
}

function onBucketDragOver(bucket: WorkspaceSalesForecastBucket, event: DragEvent) {
  if (!draggingDealId.value) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  dragOverBucket.value = bucket;
}

function onBucketDragLeave(bucket: WorkspaceSalesForecastBucket, event: DragEvent) {
  const currentTarget = event.currentTarget;
  const nextTarget = event.relatedTarget;
  if (
    currentTarget instanceof HTMLElement &&
    nextTarget instanceof Node &&
    currentTarget.contains(nextTarget)
  )
    return;
  if (dragOverBucket.value === bucket) dragOverBucket.value = null;
}

function onBucketDrop(bucket: WorkspaceSalesForecastBucket, event: DragEvent) {
  event.preventDefault();
  const dealId =
    draggingDealId.value ||
    event.dataTransfer?.getData("application/x-workspace-forecast-deal") ||
    "";
  if (!dealId) {
    clearDragState();
    return;
  }

  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "forecast-confidence-board") return;
    const target = block.deals.find((candidate) => candidate.id === dealId);
    if (!target) return;
    target.bucket = bucket;
  });

  clearDragState();
}

function addDeal() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "forecast-confidence-board") {
      return;
    }

    block.deals.unshift(createWorkspaceForecastConfidenceItem());
  });
}

function removeDeal(dealId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "forecast-confidence-board") {
      return;
    }

    block.deals = block.deals.filter((deal) => deal.id !== dealId);
  });
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function toCurrencyValue(value: string, fallback = 0) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.min(1_000_000_000, Math.round(numeric)));
}

function getBucketClasses(bucket: WorkspaceSalesForecastBucket) {
  switch (bucket) {
    case "commit":
      return {
        column: "border-success/10 bg-success/5",
        text: "text-success",
        icon: "i-lucide-award",
      };
    case "likely":
      return {
        column: "border-primary/10 bg-primary/5",
        text: "text-primary",
        icon: "i-lucide-trending-up",
      };
    case "upside":
      return {
        column: "border-warning/10 bg-warning/5",
        text: "text-warning",
        icon: "i-lucide-sparkles",
      };
    case "at-risk":
      return {
        column: "border-error/10 bg-error/5",
        text: "text-error",
        icon: "i-lucide-alert-triangle",
      };
  }
}

function getCoverageTextClasses(coverage: number) {
  if (coverage >= 100) return "text-success";
  if (coverage >= 70) return "text-warning";
  return "text-error";
}

function getBucketSummary(bucket: WorkspaceSalesForecastBucket) {
  return (
    bucketSummaryById.value.get(bucket) ?? {
      bucket,
      label: workspaceSalesForecastBucketLabels[bucket],
      dealCount: 0,
      totalValue: 0,
      weightedValue: 0,
    }
  );
}
</script>

<template>
  <div class="space-y-8">
    <!-- Summary Metrics -->
    <div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <div class="group relative overflow-hidden rounded-[24px] bg-success/5 p-5 border border-success/10 transition-all hover:bg-success/10">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-success/60">
              Commit Revenue
            </p>
            <p class="mt-2 text-3xl font-black tracking-tight text-success">
              {{ formatCurrency(summary.commitRevenue) }}
            </p>
          </div>
          <div class="size-10 rounded-2xl bg-success/10 flex items-center justify-center">
            <UIcon name="i-lucide-banknote" class="size-5 text-success" />
          </div>
        </div>
        <p class="mt-4 text-xs text-success/60 leading-relaxed">Guaranteed closing value</p>
      </div>

      <div class="group relative overflow-hidden rounded-[24px] bg-primary/5 p-5 border border-primary/10 transition-all hover:bg-primary/10">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">
              Weighted Forecast
            </p>
            <p class="mt-2 text-3xl font-black tracking-tight text-primary">
              {{ formatCurrency(summary.weightedForecast) }}
            </p>
          </div>
          <div class="size-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <UIcon name="i-lucide-calculator" class="size-5 text-primary" />
          </div>
        </div>
        <p class="mt-4 text-xs text-primary/60 leading-relaxed">Adjusted for confidence</p>
      </div>

      <div class="group relative overflow-hidden rounded-[24px] bg-error/5 p-5 border border-error/10 transition-all hover:bg-error/10">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-error/60">At-Risk Value</p>
            <p class="mt-2 text-3xl font-black tracking-tight text-error">
              {{ formatCurrency(summary.atRiskValue) }}
            </p>
          </div>
          <div class="size-10 rounded-2xl bg-error/10 flex items-center justify-center">
            <UIcon name="i-lucide-shield-alert" class="size-5 text-error" />
          </div>
        </div>
        <p class="mt-4 text-xs text-error/60 leading-relaxed">Low confidence deals</p>
      </div>

      <div class="group relative overflow-hidden rounded-[24px] bg-warning/5 p-5 border border-warning/10 transition-all hover:bg-warning/10">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-warning/60">
              Coverage vs Target
            </p>
            <p
              class="mt-2 text-3xl font-black tracking-tight"
              :class="getCoverageTextClasses(summary.coveragePercent)"
            >
              {{ summary.coveragePercent }}%
            </p>
          </div>
          <div class="size-10 rounded-2xl bg-warning/10 flex items-center justify-center">
            <UIcon name="i-lucide-target" class="size-5 text-warning" />
          </div>
        </div>
        <p class="mt-4 text-xs text-warning/60 leading-relaxed">Avg. Confidence {{ summary.averageConfidence }}%</p>
      </div>
    </div>

    <!-- Actions Header -->
    <div class="flex flex-wrap items-center justify-between gap-6 px-1">
      <div class="max-w-md">
        <h3 class="text-base font-bold text-highlighted">Forecast Board</h3>
        <p class="text-xs text-muted mt-1 leading-relaxed">
          Manage your sales pipeline by deal confidence and track performance against targets.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-6">
        <div class="flex items-center gap-3 bg-elevated/5 p-1.5 rounded-2xl border border-muted/10">
          <label class="ml-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted/40 whitespace-nowrap">Target</label>
          <UInput
            :model-value="String(block.targetRevenueEgp)"
            type="number"
            variant="none"
            class="w-32"
            :ui="{ base: 'font-bold text-highlighted' }"
            @update:model-value="
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== 'forecast-confidence-board') return;
                entry.targetRevenueEgp = toCurrencyValue($event ?? '0', 50000);
              })
            "
          />
        </div>

        <UButton
          color="primary"
          variant="solid"
          icon="i-lucide-plus"
          class="rounded-full px-5 py-2.5 font-bold shadow-lg shadow-primary/20"
          @click="addDeal"
        >
          Add Deal
        </UButton>
      </div>
    </div>

    <!-- Board Grid -->
    <div class="overflow-x-auto pb-6 -mx-1 px-1 scrollbar-thin scrollbar-thumb-muted/20 snap-x snap-mandatory">
      <div class="flex gap-6">
        <section
          v-for="bucket in WORKSPACE_SALES_FORECAST_BUCKETS"
          :key="bucket"
          class="flex flex-col flex-shrink-0 w-[320px] snap-start rounded-[32px] border p-4 transition-all duration-300"
          :class="[
            getBucketClasses(bucket).column,
            dragOverBucket === bucket ? 'ring-2 ring-primary/30 brightness-110 shadow-xl' : '',
          ]"
          @dragover="onBucketDragOver(bucket, $event)"
          @dragleave="onBucketDragLeave(bucket, $event)"
          @drop="onBucketDrop(bucket, $event)"
        >
          <!-- Column Header -->
          <div class="p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="size-8 rounded-xl bg-default/80 flex items-center justify-center border border-muted/10 shadow-sm">
                  <UIcon :name="getBucketClasses(bucket).icon" class="size-4" :class="getBucketClasses(bucket).text" />
                </div>
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.2em] text-muted/50 leading-none">
                    {{ workspaceSalesForecastBucketLabels[bucket] }}
                  </p>
                  <p class="mt-1 text-xs font-bold text-highlighted/60 leading-none">
                    {{ getBucketSummary(bucket).dealCount }} deals
                  </p>
                </div>
              </div>
            </div>

            <div class="mt-6 flex items-baseline justify-between">
              <p class="text-2xl font-black tracking-tight text-highlighted">
                {{ formatCurrency(getBucketSummary(bucket).totalValue) }}
              </p>
              <p class="text-[10px] font-bold uppercase tracking-wider text-muted/40">
                Wgt: {{ formatCurrency(getBucketSummary(bucket).weightedValue) }}
              </p>
            </div>
          </div>

          <!-- Deals Container -->
          <div class="flex-1 space-y-3 p-2 min-h-[400px]">
            <article
              v-for="deal in dealsByBucket[bucket]"
              :key="deal.id"
              class="group relative rounded-[24px] border border-muted/10 bg-default/80 p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md hover:bg-default"
              :class="[
                draggingDealId === deal.id
                  ? 'opacity-40 grayscale pointer-events-none scale-95'
                  : 'cursor-grab active:cursor-grabbing',
              ]"
              draggable="true"
              @dragstart="onDealDragStart(deal.id, $event)"
              @dragend="clearDragState"
            >
              <!-- Card Actions -->
              <div class="absolute top-4 right-4 z-10">
                <UDropdownMenu
                  :items="[[{ label: 'Remove', icon: 'i-lucide-trash', color: 'error', onSelect: () => removeDeal(deal.id) }]]"
                  :ui="{ content: 'w-32 rounded-xl' }"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-more-horizontal"
                    size="xs"
                    class="rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </UDropdownMenu>
              </div>

              <!-- Deal Header -->
              <div class="pr-8">
                <UInput
                  :model-value="deal.clientName"
                  variant="none"
                  placeholder="Client Name"
                  class="w-full"
                  :ui="{
                    base: 'p-0 text-base font-black text-highlighted placeholder:text-muted/30 focus:ring-0',
                  }"
                  @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'forecast-confidence-board') return;
                      const target = entry.deals.find((candidate) => candidate.id === deal.id);
                      if (!target) return;
                      target.clientName = ($event ?? '').slice(0, 120);
                    })
                  "
                />
                <p class="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted/40">
                  Weighted: {{ formatCurrency(getForecastDealWeightedValue(deal)) }}
                </p>
              </div>

              <!-- Deal Details Grid -->
              <div class="mt-6 space-y-4">
                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-1.5">
                    <label class="text-[9px] font-bold uppercase tracking-widest text-muted/40 ml-1">VALUE (EGP)</label>
                    <UInput
                      :model-value="String(deal.valueEgp)"
                      type="number"
                      size="xs"
                      :ui="{ base: 'rounded-xl font-bold bg-elevated/5 border-muted/10' }"
                      @update:model-value="
                        mutateBlock(tabId, block.id, (entry) => {
                          if (entry.type !== 'forecast-confidence-board') return;
                          const target = entry.deals.find((candidate) => candidate.id === deal.id);
                          if (!target) return;
                          target.valueEgp = toCurrencyValue($event ?? '0');
                        })
                      "
                    />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[9px] font-bold uppercase tracking-widest text-muted/40 ml-1">CLOSE MONTH</label>
                    <UInput
                      :model-value="deal.expectedCloseMonth ?? ''"
                      type="month"
                      size="xs"
                      :ui="{ base: 'rounded-xl bg-elevated/5 border-muted/10' }"
                      @update:model-value="
                        mutateBlock(tabId, block.id, (entry) => {
                          if (entry.type !== 'forecast-confidence-board') return;
                          const target = entry.deals.find((candidate) => candidate.id === deal.id);
                          if (!target) return;
                          target.expectedCloseMonth = $event || null;
                        })
                      "
                    />
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label class="text-[9px] font-bold uppercase tracking-widest text-muted/40 ml-1">OWNER</label>
                  <UInput
                    :model-value="deal.owner"
                    size="xs"
                    icon="i-lucide-user"
                    placeholder="Owner Name"
                    :ui="{ base: 'rounded-xl bg-elevated/5 border-muted/10' }"
                    @update:model-value="
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== 'forecast-confidence-board') return;
                        const target = entry.deals.find((candidate) => candidate.id === deal.id);
                        if (!target) return;
                        target.owner = ($event ?? '').slice(0, 120);
                      })
                    "
                  />
                </div>

                <!-- Confidence Slider -->
                <div class="pt-2">
                  <div class="flex items-center justify-between mb-2 px-1">
                    <span class="text-[9px] font-bold uppercase tracking-widest text-muted/40">Confidence</span>
                    <span class="text-[10px] font-black text-highlighted bg-primary/10 px-1.5 py-0.5 rounded-md">{{ deal.confidence }}%</span>
                  </div>
                  <USlider
                    :model-value="deal.confidence"
                    :min="10"
                    :max="100"
                    :step="1"
                    size="sm"
                    @update:model-value="
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== 'forecast-confidence-board') return;
                        const target = entry.deals.find((candidate) => candidate.id === deal.id);
                        if (!target) return;
                        target.confidence = Math.round($event);
                      })
                    "
                  />
                </div>

                <div class="space-y-1.5 bg-elevated/5 p-3 rounded-2xl border border-muted/5">
                  <label class="text-[9px] font-bold uppercase tracking-widest text-muted/40 flex items-center gap-1.5">
                    <UIcon name="i-lucide-list-todo" class="size-3" />
                    Next Action
                  </label>
                  <UTextarea
                    :model-value="deal.nextAction"
                    placeholder="Define next steps..."
                    variant="none"
                    autoresize
                    :rows="1"
                    :ui="{ base: 'p-0 text-[11px] leading-relaxed text-highlighted/80 placeholder:text-muted/20' }"
                    @update:model-value="
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== 'forecast-confidence-board') return;
                        const target = entry.deals.find((candidate) => candidate.id === deal.id);
                        if (!target) return;
                        target.nextAction = ($event ?? '').slice(0, 240);
                      })
                    "
                  />
                </div>
              </div>
            </article>

            <!-- Empty State -->
            <div
              v-if="dealsByBucket[bucket].length === 0"
              class="h-full flex flex-col items-center justify-center border-2 border-dashed border-muted/5 rounded-[32px] bg-default/10 p-8 text-center"
            >
              <div class="size-12 rounded-full bg-muted/5 flex items-center justify-center mb-3">
                <UIcon :name="getBucketClasses(bucket).icon" class="size-6 text-muted/20" />
              </div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-muted/30">
                Empty {{ bucket }}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

