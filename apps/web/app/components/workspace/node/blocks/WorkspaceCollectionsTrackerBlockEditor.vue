<script setup lang="ts">
import {
  WORKSPACE_RECEIVABLE_FILTERS,
  createWorkspaceReceivableInvoice,
  getCollectionsTrackerSummary,
  getReceivableDaysOverdue,
  getReceivableRiskLevel,
  matchesReceivableFilter,
  sortReceivableInvoices,
  workspaceReceivableFilterLabels,
  workspaceReceivableRiskLevelLabels,
  workspaceReceivableStatusLabels,
  type WorkspaceCollectionsTrackerBlock,
  type WorkspaceReceivableFilter,
  type WorkspaceReceivableStatus,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceCollectionsTrackerBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getCollectionsTrackerSummary(props.block));
const filteredInvoices = computed(() =>
  sortReceivableInvoices(props.block.invoices).filter((invoice) =>
    matchesReceivableFilter(invoice, props.block.filter),
  ),
);
const statusOptions = Object.entries(workspaceReceivableStatusLabels).map(([value, label]) => ({
  label,
  value: value as WorkspaceReceivableStatus,
})) satisfies Array<{ label: string; value: WorkspaceReceivableStatus }>;
const rowGridStyle = {
  gridTemplateColumns:
    "minmax(12rem,1.1fr) minmax(8rem,0.8fr) minmax(9rem,0.9fr) minmax(7rem,0.6fr) minmax(9rem,0.8fr) minmax(9rem,0.8fr) minmax(8rem,0.8fr) minmax(8rem,0.8fr) minmax(18rem,1.3fr) auto",
};

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("en-US")} EGP`;
}

function toInteger(value: string, fallback = 0) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.round(numeric));
}

function addInvoice() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "collections-tracker") {
      return;
    }

    block.invoices.unshift(createWorkspaceReceivableInvoice());
  });
}

function removeInvoice(invoiceId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "collections-tracker") {
      return;
    }

    block.invoices = block.invoices.filter((invoice) => invoice.id !== invoiceId);
  });
}

function getRiskTone(risk: ReturnType<typeof getReceivableRiskLevel>) {
  switch (risk) {
    case "high":
      return "error" as const;
    case "medium":
      return "warning" as const;
    default:
      return "success" as const;
  }
}

function setFilter(filter: WorkspaceReceivableFilter) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "collections-tracker") {
      return;
    }

    block.filter = filter;
  });
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Outstanding</p>
        <p class="mt-2 text-3xl font-black tracking-tight text-primary">
          {{ formatCurrency(summary.totalOutstanding) }}
        </p>
      </div>

      <div class="rounded-[28px] bg-error/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-error/70">Overdue</p>
        <p class="mt-2 text-3xl font-black tracking-tight text-error">
          {{ formatCurrency(summary.overdueAmount) }}
        </p>
      </div>

      <div class="rounded-[28px] bg-warning/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-warning/70">
          Due This Week
        </p>
        <p class="mt-2 text-3xl font-black tracking-tight text-warning">
          {{ formatCurrency(summary.dueThisWeekAmount) }}
        </p>
      </div>

      <div class="rounded-[28px] bg-success/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-success/70">
          Collected This Month
        </p>
        <p class="mt-2 text-3xl font-black tracking-tight text-success">
          {{ formatCurrency(summary.collectedThisMonth) }}
        </p>
      </div>
    </div>

    <div class="flex flex-wrap items-start justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Collections & receivables tracker</p>
        <p class="text-sm text-muted">
          Risk is highlighted automatically from invoice size, status, and delay length so the team
          can focus follow-up where cash exposure is highest.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="filter in WORKSPACE_RECEIVABLE_FILTERS"
          :key="filter"
          color="neutral"
          :variant="block.filter === filter ? 'solid' : 'soft'"
          class="rounded-full px-4"
          @click="setFilter(filter)"
        >
          {{ workspaceReceivableFilterLabels[filter] }}
        </UButton>

        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-plus"
          class="rounded-full px-4"
          @click="addInvoice"
        >
          Add Invoice
        </UButton>
      </div>
    </div>

    <div
      v-if="filteredInvoices.length === 0"
      class="rounded-[32px] border border-dashed border-muted/40 bg-elevated/10 py-14 text-center"
    >
      <p class="text-sm font-semibold text-muted">No invoices match the current filter.</p>
    </div>

    <div v-else class="overflow-x-auto pb-2">
      <div
        class="grid min-w-[1560px] gap-px overflow-hidden rounded-[28px] border border-muted/30 bg-muted/30"
        :style="rowGridStyle"
      >
        <div
          v-for="label in [
            'Client',
            'Amount',
            'Due Date',
            'Overdue',
            'Owner',
            'Follow-up',
            'Status',
            'Risk',
            'Notes',
            '',
          ]"
          :key="label"
          class="bg-elevated/80 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.24em] text-muted"
        >
          {{ label }}
        </div>

        <template v-for="invoice in filteredInvoices" :key="invoice.id">
          <div class="bg-default/85 p-3">
            <UInput
              :model-value="invoice.clientName"
              variant="none"
              placeholder="Client"
              :ui="{ base: 'px-0 font-semibold text-highlighted placeholder:text-muted/60' }"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'collections-tracker') return;
                  const target = entry.invoices.find((candidate) => candidate.id === invoice.id);
                  if (!target) return;
                  target.clientName = ($event ?? '').slice(0, 120);
                })
              "
            />
          </div>

          <div class="bg-default/85 p-3">
            <UInput
              :model-value="String(invoice.amountEgp)"
              type="number"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'collections-tracker') return;
                  const target = entry.invoices.find((candidate) => candidate.id === invoice.id);
                  if (!target) return;
                  target.amountEgp = toInteger($event ?? '0', target.amountEgp);
                })
              "
            />
          </div>

          <div class="bg-default/85 p-3">
            <UInput
              :model-value="invoice.dueDate ?? ''"
              type="date"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'collections-tracker') return;
                  const target = entry.invoices.find((candidate) => candidate.id === invoice.id);
                  if (!target) return;
                  target.dueDate = $event || null;
                })
              "
            />
          </div>

          <div class="bg-default/85 p-3">
            <p
              class="rounded-full px-3 py-2 text-center text-sm font-bold"
              :class="
                getReceivableDaysOverdue(invoice) > 0
                  ? 'bg-error/10 text-error'
                  : 'bg-elevated/40 text-toned'
              "
            >
              {{
                getReceivableDaysOverdue(invoice) > 0
                  ? `${getReceivableDaysOverdue(invoice)}d`
                  : "0d"
              }}
            </p>
          </div>

          <div class="bg-default/85 p-3">
            <UInput
              :model-value="invoice.owner"
              placeholder="Owner"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'collections-tracker') return;
                  const target = entry.invoices.find((candidate) => candidate.id === invoice.id);
                  if (!target) return;
                  target.owner = ($event ?? '').slice(0, 120);
                })
              "
            />
          </div>

          <div class="bg-default/85 p-3">
            <UInput
              :model-value="invoice.nextFollowUpDate ?? ''"
              type="date"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'collections-tracker') return;
                  const target = entry.invoices.find((candidate) => candidate.id === invoice.id);
                  if (!target) return;
                  target.nextFollowUpDate = $event || null;
                })
              "
            />
          </div>

          <div class="bg-default/85 p-3">
            <USelect
              :model-value="invoice.status"
              :items="statusOptions"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'collections-tracker') return;
                  const target = entry.invoices.find((candidate) => candidate.id === invoice.id);
                  if (!target) return;
                  target.status = ($event as WorkspaceReceivableStatus | undefined) ?? 'due-soon';
                  if (target.status !== 'paid') {
                    target.paidAt = null;
                  }
                })
              "
            />
          </div>

          <div class="bg-default/85 p-3">
            <UBadge
              :color="getRiskTone(getReceivableRiskLevel(invoice))"
              variant="soft"
              size="sm"
              class="rounded-full px-3"
            >
              {{ workspaceReceivableRiskLevelLabels[getReceivableRiskLevel(invoice)] }}
            </UBadge>
            <UInput
              v-if="invoice.status === 'paid'"
              :model-value="invoice.paidAt ?? ''"
              type="date"
              size="sm"
              class="mt-2"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'collections-tracker') return;
                  const target = entry.invoices.find((candidate) => candidate.id === invoice.id);
                  if (!target) return;
                  target.paidAt = $event || null;
                })
              "
            />
          </div>

          <div class="bg-default/85 p-3">
            <UTextarea
              :model-value="invoice.notes"
              autoresize
              :rows="2"
              :ui="{ base: 'rounded-[18px] bg-elevated/20 text-sm' }"
              placeholder="Follow-up notes"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'collections-tracker') return;
                  const target = entry.invoices.find((candidate) => candidate.id === invoice.id);
                  if (!target) return;
                  target.notes = ($event ?? '').slice(0, 2000);
                })
              "
            />
          </div>

          <div class="bg-default/85 p-3">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              class="rounded-xl hover:text-error"
              @click="removeInvoice(invoice.id)"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
