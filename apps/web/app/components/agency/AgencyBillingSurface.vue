<script setup lang="ts">
/**
 * Agency Billing — invoice pipeline (draft → sent → paid) + summary band.
 *
 * Reads `invoices.summary` and `invoices.list` stubs. Both return empty
 * shapes today; the surface lands on its honest empty state with the
 * production composition rehearsed in three lanes. Anchor: Harvest's
 * calmer invoice rhythm + Productive's lane discipline.
 */
import { useQuery } from "@tanstack/vue-query";

import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
  teamId: string;
}>();

const orpc = useOrpc();

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

const summary = computed(() => summaryQuery.data.value ?? null);
const invoices = computed(() => invoicesQuery.data.value?.items ?? []);

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

const isLoading = computed(
  () => summaryQuery.isPending.value || invoicesQuery.isPending.value,
);
const isError = computed(
  () => Boolean(summaryQuery.error.value) || Boolean(invoicesQuery.error.value),
);

const anyInvoices = computed(() => invoices.value.length > 0);
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
    <div
      v-else-if="isError"
      class="rounded-2xl border border-error/30 bg-error/5 p-6 text-center"
    >
      <UIcon name="i-lucide-alert-triangle" class="mx-auto size-5 text-error" />
      <p class="mt-3 text-sm font-bold text-highlighted">Couldn't load billing.</p>
      <p class="mt-1 text-xs text-muted">
        {{ getErrorMessage(summaryQuery.error.value ?? invoicesQuery.error.value, "Try refreshing.") }}
      </p>
      <UButton
        label="Retry"
        color="neutral"
        variant="soft"
        size="xs"
        class="mt-3"
        @click="summaryQuery.refetch(); invoicesQuery.refetch()"
      />
    </div>

    <template v-else>
      <!-- Summary band -->
      <div v-if="summary" class="grid gap-3 sm:grid-cols-4">
        <div class="rounded-2xl border border-default bg-default p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            Outstanding
          </p>
          <p
            class="mt-1 font-mono text-2xl font-bold tabular-nums"
            :class="summary.outstandingCents > 0 ? 'text-highlighted' : 'text-dimmed'"
          >
            {{ formatCurrency(summary.outstandingCents, summary.currency) }}
          </p>
        </div>
        <div class="rounded-2xl border border-default bg-default p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Drafts</p>
          <p
            class="mt-1 font-mono text-2xl font-bold tabular-nums"
            :class="summary.draftCount > 0 ? 'text-highlighted' : 'text-dimmed'"
          >
            {{ summary.draftCount }}
          </p>
        </div>
        <div class="rounded-2xl border border-default bg-default p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Sent</p>
          <p
            class="mt-1 font-mono text-2xl font-bold tabular-nums"
            :class="summary.sentCount > 0 ? 'text-highlighted' : 'text-dimmed'"
          >
            {{ summary.sentCount }}
          </p>
        </div>
        <div class="rounded-2xl border border-default bg-default p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            Paid · all time
          </p>
          <p
            class="mt-1 font-mono text-2xl font-bold tabular-nums"
            :class="summary.paidCount > 0 ? 'text-highlighted' : 'text-dimmed'"
          >
            {{ summary.paidCount }}
          </p>
        </div>
      </div>

      <!-- Pipeline lanes -->
      <div class="grid gap-3 lg:grid-cols-3">
        <article
          v-for="lane in lanes"
          :key="lane.id"
          class="rounded-2xl border border-default bg-default"
        >
          <header class="flex items-baseline justify-between border-b border-default px-4 py-3">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                {{ lane.label }}
              </p>
              <p class="mt-0.5 text-[11px] text-muted">{{ lane.copy }}</p>
            </div>
            <span
              class="font-mono text-[11px] font-bold tabular-nums"
              :class="laneCount(lane.id) > 0 ? 'text-highlighted' : 'text-dimmed'"
            >
              {{ laneCount(lane.id) }}
            </span>
          </header>

          <ul v-if="laneItems(lane.id).length > 0" class="divide-y divide-default">
            <li
              v-for="invoice in laneItems(lane.id)"
              :key="invoice.id"
              class="px-4 py-3"
            >
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
            </li>
          </ul>

          <div v-else class="px-4 py-8 text-center">
            <p class="text-[11px] text-dimmed">No {{ lane.label.toLowerCase() }} invoices.</p>
          </div>
        </article>
      </div>

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
              Bill your first period from a closed week. Invoices flow through draft, sent,
              and paid lanes; the period-close checklist guides each cycle.
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
