<script setup lang="ts">
/**
 * Agency Billing — invoice pipeline (draft → sent → paid) + summary band.
 */
import { useQuery } from "@tanstack/vue-query";

import { getErrorMessage } from "~/utils/get-error-message";
import { agencyLabelClass, agencyMetricClass, agencyErrorPanelClass } from "~/utils/agency-ui";

const props = defineProps<{
  teamId: string;
}>();

const orpc = useOrpc();
const agencyOps = useAgencyOpsStore();

const teamId = computed(() => props.teamId);

const summaryQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.invoices.summary.queryOptions({
      input: { teamId: teamId.value },
    }),
    enabled: Boolean(teamId.value),
  })),
);

const invoicesQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.invoices.list.queryOptions({
      input: { teamId: teamId.value },
    }),
    enabled: Boolean(teamId.value),
  })),
);

const clientsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.clients.list.queryOptions({
      input: { teamId: teamId.value, page: 1, pageSize: 200 },
    }),
    enabled: Boolean(teamId.value),
  })),
);

const summary = computed(() => summaryQuery.data.value ?? null);
const invoices = computed(() => invoicesQuery.data.value?.items ?? []);

const clientItems = computed(() =>
  (clientsQuery.data.value?.items ?? []).map((c) => ({ label: c.name, value: c.id })),
);

type LaneId = "draft" | "sent" | "paid";

const lanes: { id: LaneId; label: string; copy: string }[] = [
  {
    id: "draft",
    label: "Draft",
    copy: "Built from a closed week, still editable.",
  },
  {
    id: "sent",
    label: "Sent",
    copy: "Delivered to the client, awaiting payment.",
  },
  {
    id: "paid",
    label: "Paid",
    copy: "Reconciled and closed.",
  },
];

function laneItems(laneId: LaneId) {
  return invoices.value.filter((invoice) => invoice.status === laneId);
}

function laneCount(laneId: LaneId): number {
  if (!summary.value) return 0;
  if (laneId === "draft") return summary.value.draftCount;
  if (laneId === "sent") return summary.value.sentCount;
  return summary.value.paidCount;
}

function formatCurrency(cents: number, currency: string): string {
  const value = cents / 100;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const same = startDate.getUTCMonth() === endDate.getUTCMonth();
  const startLabel = startDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endLabel = endDate.toLocaleDateString(undefined, {
    month: same ? "numeric" : "short",
    day: "numeric",
  });
  return `${startLabel} to ${endLabel}`;
}

const isLoading = computed(() => summaryQuery.isPending.value || invoicesQuery.isPending.value);
const isError = computed(
  () => Boolean(summaryQuery.error.value) || Boolean(invoicesQuery.error.value),
);

const anyInvoices = computed(() => invoices.value.length > 0);

// ---------------------------------------------------------------------------
// Invoice creation panel
// ---------------------------------------------------------------------------

const createPanelOpen = ref(false);

// selectedClientId stores the id; selectedClientLabel for display
const selectedClientId = ref<string>("");
const periodStart = ref("");
const periodEnd = ref("");

const createFormValid = computed(
  () =>
    Boolean(selectedClientId.value) &&
    Boolean(periodStart.value) &&
    Boolean(periodEnd.value) &&
    periodEnd.value >= periodStart.value,
);

function openCreatePanel() {
  selectedClientId.value = "";
  periodStart.value = "";
  periodEnd.value = "";
  createPanelOpen.value = true;
}

function closeCreatePanel() {
  createPanelOpen.value = false;
}

async function generateDraft() {
  if (!createFormValid.value) return;

  const client = clientsQuery.data.value?.items.find((c) => c.id === selectedClientId.value);

  await agencyOps.createInvoice(
    {
      teamId: teamId.value,
      clientId: selectedClientId.value,
      clientName: client?.name ?? "",
      periodStart: new Date(periodStart.value).toISOString(),
      periodEnd: new Date(periodEnd.value).toISOString(),
    },
    { onSuccess: closeCreatePanel },
  );
}

// ---------------------------------------------------------------------------
// Lane status transitions
// ---------------------------------------------------------------------------

const pendingStatusInvoiceId = ref<string | null>(null);

async function advanceInvoiceStatus(invoiceId: string, currentStatus: LaneId) {
  const nextStatus = currentStatus === "draft" ? "sent" : "paid";
  pendingStatusInvoiceId.value = invoiceId;

  await agencyOps.updateInvoiceStatus(
    { teamId: teamId.value, invoiceId, status: nextStatus },
    {
      onSuccess: () => {
        pendingStatusInvoiceId.value = null;
      },
    },
  );

  pendingStatusInvoiceId.value = null;
}
</script>

<template>
  <div class="agency-billing space-y-4">
    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div class="grid gap-3 sm:grid-cols-4">
        <div v-for="i in 4" :key="i" class="h-20 animate-pulse rounded-2xl bg-elevated/60" />
      </div>
      <div class="grid gap-3 lg:grid-cols-3">
        <div v-for="i in 3" :key="i" class="h-64 animate-pulse rounded-2xl bg-elevated/60" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="isError" :class="agencyErrorPanelClass" role="alert">
      <UIcon name="i-lucide-alert-triangle" class="mx-auto size-5 text-error" />
      <p class="mt-3 text-sm font-bold text-highlighted">Couldn't load billing.</p>
      <p class="mt-1 text-xs text-muted">
        {{
          getErrorMessage(summaryQuery.error.value ?? invoicesQuery.error.value, "Try refreshing.")
        }}
      </p>
      <UButton
        label="Retry"
        color="neutral"
        variant="soft"
        size="xs"
        class="mt-3"
        @click="
          summaryQuery.refetch();
          invoicesQuery.refetch();
        "
      />
    </div>

    <template v-else>
      <!-- Summary row -->
      <div
        v-if="summary"
        class="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-default pb-3 text-xs"
      >
        <div>
          <span :class="agencyLabelClass">Outstanding</span>
          <span
            :class="[
              'ml-2 font-mono tabular-nums font-bold',
              summary.outstandingCents > 0 ? 'text-highlighted' : 'text-dimmed',
            ]"
          >
            {{ formatCurrency(summary.outstandingCents, summary.currency) }}
          </span>
        </div>
        <div>
          <span :class="agencyLabelClass">Drafts</span>
          <span :class="['ml-2', agencyMetricClass, summary.draftCount > 0 ? '' : 'text-dimmed']">
            {{ summary.draftCount }}
          </span>
        </div>
        <div>
          <span :class="agencyLabelClass">Sent</span>
          <span :class="['ml-2', agencyMetricClass, summary.sentCount > 0 ? '' : 'text-dimmed']">
            {{ summary.sentCount }}
          </span>
        </div>
        <div>
          <span :class="agencyLabelClass">Paid · all time</span>
          <span :class="['ml-2', agencyMetricClass, summary.paidCount > 0 ? '' : 'text-dimmed']">
            {{ summary.paidCount }}
          </span>
        </div>
      </div>

      <!-- Pipeline lanes -->
      <div class="grid gap-3 lg:grid-cols-3">
        <article
          v-for="lane in lanes"
          :key="lane.id"
          class="rounded-2xl border border-default bg-default"
        >
          <header class="flex items-center justify-between gap-3 border-b border-default px-4 py-3">
            <div class="min-w-0">
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                {{ lane.label }}
              </p>
              <p class="mt-0.5 text-[11px] text-muted">{{ lane.copy }}</p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <span
                class="font-mono text-[11px] font-bold tabular-nums"
                :class="laneCount(lane.id) > 0 ? 'text-highlighted' : 'text-dimmed'"
              >
                {{ laneCount(lane.id) }}
              </span>
              <UButton
                v-if="lane.id === 'draft'"
                icon="i-lucide-plus"
                color="neutral"
                variant="ghost"
                size="xs"
                square
                aria-label="New invoice"
                @click="openCreatePanel"
              />
            </div>
          </header>

          <ul v-if="laneItems(lane.id).length > 0" class="divide-y divide-default">
            <li v-for="invoice in laneItems(lane.id)" :key="invoice.id" class="px-4 py-3">
              <div class="flex items-baseline justify-between gap-3">
                <span class="truncate text-xs font-bold text-highlighted">
                  {{ invoice.number }}
                </span>
                <span class="font-mono text-[11px] tabular-nums text-highlighted">
                  {{ formatCurrency(invoice.amountCents, invoice.currency) }}
                </span>
              </div>
              <p class="mt-1 truncate text-[11px] text-muted">{{ invoice.clientName }}</p>
              <p class="mt-1 truncate text-[11px] text-dimmed">
                {{ formatPeriod(invoice.periodStart, invoice.periodEnd) }}
              </p>
              <div v-if="lane.id !== 'paid'" class="mt-2">
                <UButton
                  :label="lane.id === 'draft' ? 'Mark sent' : 'Mark paid'"
                  color="neutral"
                  variant="soft"
                  size="xs"
                  :loading="pendingStatusInvoiceId === invoice.id"
                  :disabled="agencyOps.isInvoiceMutationPending"
                  @click="advanceInvoiceStatus(invoice.id, lane.id)"
                />
              </div>
            </li>
          </ul>

          <div v-else class="px-4 py-8 text-center">
            <p class="text-[11px] text-dimmed">No {{ lane.label.toLowerCase() }} invoices.</p>
          </div>
        </article>
      </div>

      <!-- Invoice creation panel (slides in below lanes) -->
      <Transition
        enter-active-class="transition-[opacity,transform] duration-200 ease-out"
        leave-active-class="transition-[opacity,transform] duration-150 ease-in"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <div v-if="createPanelOpen" class="rounded-2xl border border-default bg-default">
          <div class="flex items-center justify-between border-b border-default px-5 py-4">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                New invoice
              </p>
              <h3 class="mt-1 text-sm font-bold text-highlighted">Draft from a closed period</h3>
            </div>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              aria-label="Close"
              @click="closeCreatePanel"
            />
          </div>

          <div class="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <label class="text-[11px] font-bold text-muted">Client</label>
              <USelectMenu
                v-model="selectedClientId"
                :items="clientItems"
                value-key="value"
                placeholder="Select client"
                size="sm"
                class="mt-1"
              />
            </div>
            <div>
              <label class="text-[11px] font-bold text-muted">Billing period</label>
              <div class="mt-1 flex items-center gap-2">
                <UInput v-model="periodStart" type="date" size="sm" class="flex-1" />
                <span class="text-[11px] text-muted">to</span>
                <UInput v-model="periodEnd" type="date" size="sm" class="flex-1" />
              </div>
            </div>
          </div>

          <div class="border-t border-default px-5 py-4">
            <div class="flex items-start gap-3 rounded-xl bg-muted/30 px-4 py-3">
              <UIcon
                name="i-lucide-info"
                class="mt-0.5 size-4 shrink-0 text-muted"
                aria-hidden="true"
              />
              <p class="text-[11px] text-muted">
                Line items are generated from approved time entries in the selected period.
              </p>
            </div>
            <div class="mt-4 flex items-center gap-3">
              <UButton
                label="Generate draft"
                color="primary"
                size="sm"
                :disabled="!createFormValid"
                :loading="agencyOps.isInvoiceMutationPending"
                @click="generateDraft"
              />
              <UButton
                label="Cancel"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="closeCreatePanel"
              />
            </div>
          </div>
        </div>
      </Transition>

      <!-- Period-close hint when fully empty -->
      <div
        v-if="!anyInvoices"
        class="rounded-2xl border border-dashed border-default bg-muted/20 p-6"
      >
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-receipt" class="mt-0.5 size-5 shrink-0 text-muted" />
          <div>
            <p class="text-sm font-bold text-highlighted">No invoices yet.</p>
            <p class="mt-1 text-xs text-muted">
              Bill your first period from a closed week. Invoices flow through draft, sent, and paid
              lanes; the period-close checklist guides each cycle.
            </p>
            <ul class="mt-4 space-y-1.5 text-[11px] text-muted">
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-corner-down-right"
                  class="mt-0.5 size-3.5 shrink-0 text-dimmed"
                />
                <span>Lock a week to draft invoices from approved time entries.</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-corner-down-right"
                  class="mt-0.5 size-3.5 shrink-0 text-dimmed"
                />
                <span>Send as PDF or push to QuickBooks · Xero from Settings · Integrations.</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-corner-down-right"
                  class="mt-0.5 size-3.5 shrink-0 text-dimmed"
                />
                <span>Mark paid to close the period and reconcile against your books.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
