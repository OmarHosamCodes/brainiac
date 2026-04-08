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

const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getDelegationMatrixSummary(props.block));

const statusOptions: WorkspaceDelegationStatus[] = ["stuck", "transitioning", "delegated"];
const filterStatus = ref<"all" | WorkspaceDelegationStatus>("all");
const sortMode = ref<"priority" | "hours" | "task">("priority");

const sortOptions = [
  { label: "Priority", value: "priority" },
  { label: "Hours / week", value: "hours" },
  { label: "Task name", value: "task" },
] as const;

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

const unassignedHandoffCount = computed(
  () => props.block.items.filter((item) => item.status !== "delegated" && !item.to.trim()).length,
);

const statusCounts = computed(() => ({
  all: props.block.items.length,
  stuck: props.block.items.filter((item) => item.status === "stuck").length,
  transitioning: props.block.items.filter((item) => item.status === "transitioning").length,
  delegated: props.block.items.filter((item) => item.status === "delegated").length,
}));

const filteredItems = computed(() => {
  const baseItems =
    filterStatus.value === "all"
      ? [...props.block.items]
      : props.block.items.filter((item) => item.status === filterStatus.value);

  if (sortMode.value === "hours") {
    return baseItems.sort(
      (left, right) =>
        right.hoursPerWeek - left.hoursPerWeek ||
        left.task.localeCompare(right.task),
    );
  }

  if (sortMode.value === "task") {
    return baseItems.sort((left, right) => left.task.localeCompare(right.task));
  }

  const statusRank: Record<WorkspaceDelegationStatus, number> = {
    stuck: 0,
    transitioning: 1,
    delegated: 2,
  };

  return baseItems.sort(
    (left, right) =>
      statusRank[left.status] - statusRank[right.status] ||
      right.hoursPerWeek - left.hoursPerWeek ||
      left.task.localeCompare(right.task),
  );
});

const summaryCards = computed(() => [
  {
    key: "hours",
    label: "Recoverable",
    value: `${summary.value.totalHoursPerWeek}h`,
    supporting: "Total founder time currently listed each week",
    accentClass: "text-highlighted",
  },
  {
    key: "stuck",
    label: "Still Trapped",
    value: `${summary.value.pendingHoursPerWeek}h`,
    supporting: `${summary.value.stuckCount} stuck · ${summary.value.transitioningCount} transitioning`,
    accentClass: "text-warning",
  },
  {
    key: "cost",
    label: "Weekly Cost",
    value: formatCurrency(summary.value.pendingRecoverableValue),
    supporting: "Based on the hourly rate set for this matrix",
    accentClass: "text-primary",
  },
  {
    key: "coverage",
    label: "Delegated",
    value: `${delegatedCoverage.value}%`,
    supporting: `${summary.value.delegatedCount} handoffs complete`,
    accentClass: "text-success",
  },
]);

function mutateDelegationBlock(mutator: (block: WorkspaceDelegationMatrixBlock) => void) {
  mutateTypedBlock(props.tabId, props.block.id, "delegation-matrix", mutator);
}

function mutateItem(
  itemId: string,
  mutator: (item: WorkspaceDelegationMatrixBlock["items"][number]) => void,
) {
  mutateDelegationBlock((block) => {
    const target = block.items.find((item) => item.id === itemId);

    if (!target) {
      return;
    }

    mutator(target);
  });
}

function addItem() {
  mutateDelegationBlock((block) => {
    block.items.unshift(createWorkspaceDelegationItem());
  });
}

function removeItem(itemId: string) {
  mutateDelegationBlock((block) => {
    block.items = block.items.filter((item) => item.id !== itemId);
  });
}

function updateHourlyRate(value: string | number | undefined) {
  mutateDelegationBlock((block) => {
    block.hourlyRate = toHourlyRate(value);
  });
}

function updateTask(itemId: string, value: string | number | undefined) {
  mutateItem(itemId, (item) => {
    item.task = String(value ?? "").slice(0, 160);
  });
}

function updateFrom(itemId: string, value: string | number | undefined) {
  mutateItem(itemId, (item) => {
    item.from = String(value ?? "").slice(0, 120);
  });
}

function updateTo(itemId: string, value: string | number | undefined) {
  mutateItem(itemId, (item) => {
    item.to = String(value ?? "").slice(0, 120);
  });
}

function updateHours(itemId: string, value: string | number | undefined) {
  mutateItem(itemId, (item) => {
    item.hoursPerWeek = toHours(value);
  });
}

function updateStatus(itemId: string, status: WorkspaceDelegationStatus) {
  mutateItem(itemId, (item) => {
    item.status = status;
  });
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function toHours(value: string | number | undefined) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Number(numeric.toFixed(1))));
}

function toHourlyRate(value: string | number | undefined) {
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
      <div
        v-for="card in summaryCards"
        :key="card.key"
        class="rounded-3xl border border-muted/20 bg-elevated/10 p-5"
      >
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">{{ card.label }}</p>
        <p class="mt-2 text-2xl font-black tracking-tight sm:text-3xl" :class="card.accentClass">
          {{ card.value }}
        </p>
        <p class="mt-1 text-sm text-muted">{{ card.supporting }}</p>
      </div>
    </div>

    <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-highlighted">Delegation tracker</p>
          <p class="text-sm text-muted">
            Prioritize trapped founder tasks first, then assign explicit ownership and move each handoff toward delegated.
          </p>
          <p v-if="unassignedHandoffCount > 0" class="mt-2 text-xs text-warning">
            {{ unassignedHandoffCount }} item{{ unassignedHandoffCount === 1 ? "" : "s" }} still missing a clear owner.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UButton
            v-for="status in (['all', ...statusOptions] as Array<'all' | WorkspaceDelegationStatus>)"
            :key="status"
            color="neutral"
            :variant="filterStatus === status ? 'solid' : 'soft'"
            class="rounded-full px-4"
            :aria-label="`Filter by ${status === 'all' ? 'all statuses' : workspaceDelegationStatusLabels[status]}`"
            @click="filterStatus = status"
          >
            {{ status === "all" ? "All" : workspaceDelegationStatusLabels[status] }}
            <span class="ml-1 text-xs opacity-80">
              {{ statusCounts[status] }}
            </span>
          </UButton>
        </div>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[14rem_14rem_1fr_auto]">
        <UFormField
          label="Hourly rate"
          size="sm"
          :ui="{ label: 'text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60' }"
        >
          <UInput
            :model-value="String(block.hourlyRate)"
            type="number"
            icon="i-lucide-badge-dollar-sign"
            class="w-full"
            :ui="{ base: 'rounded-2xl' }"
            aria-label="Delegation hourly rate"
            @update:model-value="updateHourlyRate($event as string | number | undefined)"
          />
        </UFormField>

        <UFormField
          label="Sort"
          size="sm"
          :ui="{ label: 'text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60' }"
        >
          <USelect
            :model-value="sortMode"
            :items="sortOptions"
            aria-label="Sort delegation items"
            @update:model-value="sortMode = (($event as 'priority' | 'hours' | 'task' | undefined) ?? 'priority')"
          />
        </UFormField>

        <div class="rounded-2xl border border-muted/20 bg-default/50 px-3 py-2 text-xs text-muted">
          Currency values use the hourly rate context shown above. Update it before reviewing weekly cost impact.
        </div>

        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-plus"
          class="self-end rounded-full px-4"
          aria-label="Add delegation task"
          @click="addItem"
        >
          Add task
        </UButton>
      </div>
    </div>

    <div
      v-if="block.items.length === 0"
      class="rounded-3xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center"
    >
      <p class="text-sm font-semibold text-muted">No delegation items yet.</p>
      <p class="mt-1 text-sm text-muted">Add a recurring task to begin mapping handoff opportunities.</p>
    </div>

    <div
      v-else-if="filteredItems.length === 0"
      class="rounded-3xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center"
    >
      <p class="text-sm font-semibold text-muted">No items match this filter.</p>
      <p class="mt-1 text-sm text-muted">Switch to another status filter to continue planning handoffs.</p>
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="item in filteredItems"
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
              :aria-label="`Task name for ${item.task || 'new delegation item'}`"
              @update:model-value="updateTask(item.id, $event as string | number | undefined)"
            />
            <p class="mt-2 text-sm text-muted">
              {{ item.hoursPerWeek }}h/week · {{ formatCurrency(item.hoursPerWeek * block.hourlyRate) }} of founder time
            </p>
          </div>

          <div class="flex items-center gap-2">
            <UBadge variant="soft" size="sm" class="rounded-full px-3">
              {{ workspaceDelegationStatusLabels[item.status] }}
            </UBadge>
            <UBadge v-if="!item.to.trim()" color="warning" variant="soft" class="rounded-full">
              Needs owner
            </UBadge>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              class="rounded-2xl hover:text-error"
              :aria-label="`Remove ${item.task || 'delegation item'}`"
              @click="removeItem(item.id)"
            />
          </div>
        </div>

        <div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_14rem]">
          <UFormField
            label="From"
            size="sm"
            :ui="{ label: 'text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60' }"
          >
            <UInput
              :model-value="item.from"
              class="w-full"
              :ui="{ base: 'rounded-2xl' }"
              placeholder="Current owner"
              :aria-label="`Current owner for ${item.task || 'delegation task'}`"
              @update:model-value="updateFrom(item.id, $event as string | number | undefined)"
            />
          </UFormField>

          <div class="hidden items-center justify-center pt-7 text-muted lg:flex">
            <UIcon name="i-lucide-arrow-right" class="size-5" />
          </div>

          <UFormField
            label="To"
            size="sm"
            :ui="{ label: 'text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60' }"
          >
            <UInput
              :model-value="item.to"
              class="w-full"
              :ui="{ base: 'rounded-2xl' }"
              placeholder="Delegate owner"
              :aria-label="`Delegate owner for ${item.task || 'delegation task'}`"
              @update:model-value="updateTo(item.id, $event as string | number | undefined)"
            />
          </UFormField>

          <UFormField
            label="Hours / week"
            size="sm"
            :ui="{ label: 'text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60' }"
          >
            <UInput
              :model-value="String(item.hoursPerWeek)"
              type="number"
              step="0.5"
              class="w-full"
              :ui="{ base: 'rounded-2xl' }"
              :aria-label="`Weekly hours for ${item.task || 'delegation task'}`"
              @update:model-value="updateHours(item.id, $event as string | number | undefined)"
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
            :aria-label="`Set ${item.task || 'delegation task'} to ${workspaceDelegationStatusLabels[status]}`"
            @click="updateStatus(item.id, status)"
          >
            {{ workspaceDelegationStatusLabels[status] }}
          </button>
        </div>
      </article>
    </div>
  </div>
</template>
