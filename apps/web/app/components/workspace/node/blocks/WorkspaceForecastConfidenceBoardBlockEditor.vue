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

const bucketOptions = WORKSPACE_SALES_FORECAST_BUCKETS.map((bucket) => ({
  label: workspaceSalesForecastBucketLabels[bucket],
  value: bucket,
})) satisfies Array<{ label: string; value: WorkspaceSalesForecastBucket }>;

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

function clampConfidence(value: string) {
  const numeric = Number(value || 0);
  return Math.min(100, Math.max(10, Math.round(numeric)));
}

function getInputValue(event: Event) {
  return (event.target as HTMLInputElement | null)?.value ?? "50";
}

function getBucketClasses(bucket: WorkspaceSalesForecastBucket) {
  switch (bucket) {
    case "commit":
      return "border-success/35 bg-success/5";
    case "likely":
      return "border-primary/35 bg-primary/5";
    case "upside":
      return "border-warning/35 bg-warning/5";
    case "at-risk":
      return "border-error/35 bg-error/5";
  }

  return "border-muted/30 bg-default/60";
}

function getCoverageTextClasses(coverage: number) {
  if (coverage >= 100) {
    return "text-success";
  }

  if (coverage >= 70) {
    return "text-warning";
  }

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
  <div class="space-y-6">
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-[28px] bg-success/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-success/70">
          Commit Revenue
        </p>
        <p class="mt-2 text-3xl font-black tracking-tight text-success">
          {{ formatCurrency(summary.commitRevenue) }}
        </p>
      </div>

      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">
          Weighted Forecast
        </p>
        <p class="mt-2 text-3xl font-black tracking-tight text-primary">
          {{ formatCurrency(summary.weightedForecast) }}
        </p>
      </div>

      <div class="rounded-[28px] bg-error/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-error/70">At-Risk Value</p>
        <p class="mt-2 text-3xl font-black tracking-tight text-error">
          {{ formatCurrency(summary.atRiskValue) }}
        </p>
      </div>

      <div class="rounded-[28px] bg-warning/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-warning/70">
          Coverage vs Target
        </p>
        <p
          class="mt-2 text-4xl font-black tracking-tight"
          :class="getCoverageTextClasses(summary.coveragePercent)"
        >
          {{ summary.coveragePercent }}%
        </p>
        <p class="mt-1 text-sm text-muted">Average confidence {{ summary.averageConfidence }}%</p>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Confidence-based forecast</p>
        <p class="text-sm text-muted">
          Bucket deals by confidence, then compare the weighted forecast against the target.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <UFormField label="Target Revenue" size="sm">
          <UInput
            :model-value="String(block.targetRevenueEgp)"
            type="number"
            icon="i-lucide-target"
            class="w-40 rounded-2xl"
            @update:model-value="
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== 'forecast-confidence-board') return;
                entry.targetRevenueEgp = toCurrencyValue($event ?? '0', 50000);
              })
            "
          />
        </UFormField>

        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-plus"
          class="rounded-full px-4"
          @click="addDeal"
        >
          Add Deal to Forecast
        </UButton>
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-4">
      <section
        v-for="bucket in WORKSPACE_SALES_FORECAST_BUCKETS"
        :key="bucket"
        class="rounded-[32px] border p-4 transition-all duration-300"
        :class="[
          getBucketClasses(bucket),
          dragOverBucket === bucket ? 'ring-2 ring-primary/20 brightness-110' : '',
        ]"
        @dragover="onBucketDragOver(bucket, $event)"
        @dragleave="onBucketDragLeave(bucket, $event)"
        @drop="onBucketDrop(bucket, $event)"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">
              {{ workspaceSalesForecastBucketLabels[bucket] }}
            </p>
            <p class="mt-2 text-2xl font-black tracking-tight text-highlighted">
              {{ formatCurrency(getBucketSummary(bucket).totalValue) }}
            </p>
          </div>

          <UBadge variant="soft" size="sm" class="rounded-full">
            {{ getBucketSummary(bucket).dealCount }} deals
          </UBadge>
        </div>

        <p class="mt-2 text-sm text-muted">
          Weighted
          {{ formatCurrency(getBucketSummary(bucket).weightedValue) }}
        </p>

        <div
          v-if="dealsByBucket[bucket].length === 0"
          class="mt-4 rounded-[24px] border border-dashed border-muted/35 bg-default/40 py-10 text-center text-sm text-muted"
        >
          No deals in this bucket.
        </div>

        <div v-else class="mt-4 space-y-3">
          <article
            v-for="deal in dealsByBucket[bucket]"
            :key="deal.id"
            class="rounded-[24px] border border-muted/25 bg-default/70 p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-black/5"
            :class="[
              draggingDealId === deal.id
                ? 'opacity-40 grayscale pointer-events-none scale-95'
                : 'cursor-grab active:cursor-grabbing',
            ]"
            draggable="true"
            @dragstart="onDealDragStart(deal.id, $event)"
            @dragend="clearDragState"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
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
                      if (entry.type !== 'forecast-confidence-board') return;
                      const target = entry.deals.find((candidate) => candidate.id === deal.id);
                      if (!target) return;
                      target.clientName = ($event ?? '').slice(0, 120);
                    })
                  "
                />
                <p class="mt-1 text-sm text-muted">
                  Weighted
                  {{ formatCurrency(getForecastDealWeightedValue(deal)) }}
                </p>
              </div>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="xs"
                class="rounded-lg hover:text-error"
                @click="removeDeal(deal.id)"
              />
            </div>

            <div class="mt-4 grid gap-3">
              <UFormField label="Deal Value (EGP)" size="sm">
                <UInput
                  :model-value="String(deal.valueEgp)"
                  type="number"
                  class="rounded-2xl"
                  @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'forecast-confidence-board') return;
                      const target = entry.deals.find((candidate) => candidate.id === deal.id);
                      if (!target) return;
                      target.valueEgp = toCurrencyValue($event ?? '0');
                    })
                  "
                />
              </UFormField>

              <UFormField label="Bucket" size="sm">
                <USelect
                  :model-value="deal.bucket"
                  :items="bucketOptions"
                  class="rounded-2xl"
                  @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'forecast-confidence-board') return;
                      const target = entry.deals.find((candidate) => candidate.id === deal.id);
                      if (!target) return;
                      target.bucket = $event ?? 'likely';
                    })
                  "
                />
              </UFormField>

              <div class="grid gap-3 sm:grid-cols-2">
                <UFormField label="Close Month" size="sm">
                  <UInput
                    :model-value="deal.expectedCloseMonth ?? ''"
                    type="month"
                    class="rounded-2xl"
                    @update:model-value="
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== 'forecast-confidence-board') return;
                        const target = entry.deals.find((candidate) => candidate.id === deal.id);
                        if (!target) return;
                        target.expectedCloseMonth = $event || null;
                      })
                    "
                  />
                </UFormField>

                <UFormField label="Owner" size="sm">
                  <UInput
                    :model-value="deal.owner"
                    class="rounded-2xl"
                    placeholder="Owner"
                    @update:model-value="
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== 'forecast-confidence-board') return;
                        const target = entry.deals.find((candidate) => candidate.id === deal.id);
                        if (!target) return;
                        target.owner = ($event ?? '').slice(0, 120);
                      })
                    "
                  />
                </UFormField>
              </div>

              <div class="space-y-3">
                <div
                  class="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-muted"
                >
                  <span>Confidence</span>
                  <span class="text-highlighted">{{ deal.confidence }}%</span>
                </div>

                <UProgress :model-value="deal.confidence" size="sm" class="rounded-full" />

                <input
                  :value="deal.confidence"
                  type="range"
                  min="10"
                  max="100"
                  step="1"
                  class="w-full accent-primary"
                  @input="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'forecast-confidence-board') return;
                      const target = entry.deals.find((candidate) => candidate.id === deal.id);
                      if (!target) return;
                      target.confidence = clampConfidence(getInputValue($event));
                    })
                  "
                />
              </div>

              <UFormField label="Next Action" size="sm">
                <UInput
                  :model-value="deal.nextAction"
                  class="rounded-2xl"
                  placeholder="What needs to happen next?"
                  @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'forecast-confidence-board') return;
                      const target = entry.deals.find((candidate) => candidate.id === deal.id);
                      if (!target) return;
                      target.nextAction = ($event ?? '').slice(0, 240);
                    })
                  "
                />
              </UFormField>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
