<script setup lang="ts">
import {
  createWorkspaceDelegationItem,
  getDelegationMatrixSummary,
  workspaceDelegationStatusLabels,
  type WorkspaceDelegationMatrixBlock,
  type WorkspaceDelegationStatus,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceDelegationMatrixBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getDelegationMatrixSummary(props.block));

const statusOptions: WorkspaceDelegationStatus[] = ["stuck", "transitioning", "delegated"];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const delegatedCoverage = computed(() => {
  if (summary.value.totalHoursPerWeek <= 0) {
    return 0;
  }

  return Math.round((summary.value.delegatedHoursPerWeek / summary.value.totalHoursPerWeek) * 100);
});

function addItem() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "delegation-matrix") {
      return;
    }

    block.items.unshift(createWorkspaceDelegationItem());
  });
}

function removeItem(itemId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "delegation-matrix") {
      return;
    }

    block.items = block.items.filter((item) => item.id !== itemId);
  });
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function toHours(value: string) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Number(numeric.toFixed(1))));
}

function toHourlyRate(value: string) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 500;
  }

  return Math.max(0, Math.min(100000, Math.round(numeric)));
}

function getStatusCardClasses(status: WorkspaceDelegationStatus) {
  switch (status) {
    case "delegated":
      return "border-success/20 bg-success/5";
    case "transitioning":
      return "border-warning/20 bg-warning/5";
    default:
      return "border-error/20 bg-error/5";
  }
}

function getStatusAccentClasses(status: WorkspaceDelegationStatus) {
  switch (status) {
    case "delegated":
      return "bg-success";
    case "transitioning":
      return "bg-warning";
    default:
      return "bg-error";
  }
}

function getStatusButtonClasses(
  status: WorkspaceDelegationStatus,
  activeStatus: WorkspaceDelegationStatus,
) {
  if (status === activeStatus) {
    if (status === "delegated") {
      return "border-success/20 bg-success/10 text-success";
    }

    if (status === "transitioning") {
      return "border-warning/20 bg-warning/10 text-warning";
    }

    return "border-error/20 bg-error/10 text-error";
  }

  return "border-muted/20 bg-default/40 text-muted/60 hover:border-muted/30 hover:text-highlighted";
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-3xl bg-elevated/10 p-5 border border-muted/20">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Recoverable</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
          {{ summary.totalHoursPerWeek }}h
        </p>
        <p class="mt-1 text-sm text-muted">Total hours listed per week</p>
      </div>

      <div class="rounded-3xl bg-elevated/10 p-5 border border-muted/20">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Still Trapped</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
          {{ summary.pendingHoursPerWeek }}h
        </p>
        <p class="mt-1 text-sm text-muted">Founder time not delegated yet</p>
      </div>

      <div class="rounded-3xl bg-elevated/10 p-5 border border-muted/20">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Weekly Cost</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
          {{ formatCurrency(summary.pendingRecoverableValue) }}
        </p>
        <p class="mt-1 text-sm text-muted">Based on the current hourly rate</p>
      </div>

      <div class="rounded-3xl bg-elevated/10 p-5 border border-muted/20">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Delegated</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-highlighted">{{ delegatedCoverage }}%</p>
        <p class="mt-1 text-sm text-muted">{{ summary.delegatedCount }} items already handed off</p>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Delegation tracker</p>
        <p class="text-sm text-muted">
          Make the cost of non-delegation visible and push each task toward a clean owner.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <UFormField label="Hourly rate" size="sm" :ui="{ label: 'text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60' }">
          <UInput
            :model-value="String(block.hourlyRate)"
            type="number"
            icon="i-lucide-badge-dollar-sign"
            class="w-32"
            :ui="{ base: 'rounded-2xl' }"
            @update:model-value="
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== 'delegation-matrix') return;
                entry.hourlyRate = toHourlyRate($event ?? '500');
              })
            "
          />
        </UFormField>

        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-plus"
          class="rounded-full px-4"
          @click="addItem"
        >
          Add Task
        </UButton>
      </div>
    </div>

    <div
      v-if="block.items.length === 0"
      class="border-dashed border-muted/20 rounded-3xl py-12 text-center bg-elevated/5"
    >
      <p class="text-sm font-semibold text-muted">No delegation items yet.</p>
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="item in block.items"
        :key="item.id"
        class="relative overflow-hidden rounded-3xl border p-5"
        :class="getStatusCardClasses(item.status)"
      >
        <div class="absolute inset-y-0 left-0 w-1.5" :class="getStatusAccentClasses(item.status)" />

        <div class="flex flex-wrap items-start justify-between gap-4 pl-2">
          <div class="min-w-0 flex-1">
            <UInput
              :model-value="item.task"
              variant="none"
              placeholder="Task name"
              class="w-full"
              :ui="{ base: 'px-0 text-lg font-bold text-highlighted placeholder:text-muted/60' }"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'delegation-matrix') return;
                  const target = entry.items.find((candidate) => candidate.id === item.id);
                  if (!target) return;
                  target.task = ($event ?? '').slice(0, 160);
                })
              "
            />
            <p class="mt-2 text-sm text-muted">
              {{ item.hoursPerWeek }}h/week ·
              {{ formatCurrency(item.hoursPerWeek * block.hourlyRate) }} of founder time
            </p>
          </div>

          <div class="flex items-center gap-2">
            <UBadge variant="soft" size="sm" class="rounded-full px-3">
              {{ workspaceDelegationStatusLabels[item.status] }}
            </UBadge>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              class="rounded-2xl hover:text-error"
              @click="removeItem(item.id)"
            />
          </div>
        </div>

        <div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_14rem]">
          <UFormField label="From" size="sm" :ui="{ label: 'text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60' }">
            <UInput
              :model-value="item.from"
              class="w-full"
              :ui="{ base: 'rounded-2xl' }"
              placeholder="Ahmed"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'delegation-matrix') return;
                  const target = entry.items.find((candidate) => candidate.id === item.id);
                  if (!target) return;
                  target.from = ($event ?? '').slice(0, 120);
                })
              "
            />
          </UFormField>

          <div class="hidden items-center justify-center pt-7 text-muted lg:flex">
            <UIcon name="i-lucide-arrow-right" class="size-5" />
          </div>

          <UFormField label="To" size="sm" :ui="{ label: 'text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60' }">
            <UInput
              :model-value="item.to"
              class="w-full"
              :ui="{ base: 'rounded-2xl' }"
              placeholder="Delegate owner"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'delegation-matrix') return;
                  const target = entry.items.find((candidate) => candidate.id === item.id);
                  if (!target) return;
                  target.to = ($event ?? '').slice(0, 120);
                })
              "
            />
          </UFormField>

          <UFormField label="Hours / week" size="sm" :ui="{ label: 'text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60' }">
            <UInput
              :model-value="String(item.hoursPerWeek)"
              type="number"
              step="0.5"
              class="w-full"
              :ui="{ base: 'rounded-2xl' }"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'delegation-matrix') return;
                  const target = entry.items.find((candidate) => candidate.id === item.id);
                  if (!target) return;
                  target.hoursPerWeek = toHours($event ?? '0');
                })
              "
            />
          </UFormField>
        </div>

        <div class="mt-5 flex flex-wrap gap-2 pl-2">
          <button
            v-for="status in statusOptions"
            :key="status"
            type="button"
            class="rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition"
            :class="getStatusButtonClasses(status, item.status)"
            @click="
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== 'delegation-matrix') return;
                const target = entry.items.find((candidate) => candidate.id === item.id);
                if (!target) return;
                target.status = status;
              })
            "
          >
            {{ workspaceDelegationStatusLabels[status] }}
          </button>
        </div>
      </article>
    </div>
  </div>
</template>
