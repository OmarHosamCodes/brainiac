<script setup lang="ts">
import {
  createWorkspaceExpenseItem,
  createWorkspaceProfitabilityClient,
  getExpenseSharePercent,
  getProfitabilityCashFlowSummary,
  getProfitabilityClientMarginPercent,
  workspaceFinancePaymentStatusLabels,
  type WorkspaceFinancePaymentStatus,
  type WorkspaceProfitabilityCashFlowBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceProfitabilityCashFlowBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getProfitabilityCashFlowSummary(props.block));
const paymentStatusOptions = Object.entries(workspaceFinancePaymentStatusLabels).map(
  ([value, label]) => ({
    label,
    value: value as WorkspaceFinancePaymentStatus,
  }),
) satisfies Array<{ label: string; value: WorkspaceFinancePaymentStatus }>;
const totalExpenseBreakdown = computed(() =>
  props.block.expenses.reduce((sum, expense) => sum + expense.amountEgp, 0),
);

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

function addClient() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "profitability-cash-flow") {
      return;
    }

    block.clients.push(createWorkspaceProfitabilityClient());
  });
}

function removeClient(clientId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "profitability-cash-flow") {
      return;
    }

    block.clients = block.clients.filter((client) => client.id !== clientId);
  });
}

function addExpense() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "profitability-cash-flow") {
      return;
    }

    block.expenses.push(createWorkspaceExpenseItem());
  });
}

function removeExpense(expenseId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "profitability-cash-flow") {
      return;
    }

    block.expenses = block.expenses.filter((expense) => expense.id !== expenseId);
  });
}

function getMarginTone(marginPercent: number) {
  if (marginPercent > 40) {
    return "text-success";
  }

  if (marginPercent > 20) {
    return "text-warning";
  }

  return "text-error";
}

function getProfitTone(value: number) {
  if (value > 0) {
    return "text-success";
  }

  if (value === 0) {
    return "text-warning";
  }

  return "text-error";
}
</script>

<template>
  <div class="space-y-12 overflow-x-hidden">
    <!-- Top Summary Cards -->
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <div class="group relative overflow-hidden rounded-[32px] bg-success/5 p-6 border border-success/10 transition-all hover:bg-success/10">
        <div class="flex items-center gap-3">
          <div class="flex size-8 items-center justify-center rounded-xl bg-success/10 text-success">
            <UIcon name="i-lucide-trending-up" size="18" />
          </div>
          <p class="text-[10px] font-black uppercase tracking-[0.25em] text-success/60">Revenue</p>
        </div>
        <p class="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-success truncate font-mono">
          {{ formatCurrency(summary.totalRevenue) }}
        </p>
      </div>

      <div class="group relative overflow-hidden rounded-[32px] bg-error/5 p-6 border border-error/10 transition-all hover:bg-error/10">
        <div class="flex items-center gap-3">
          <div class="flex size-8 items-center justify-center rounded-xl bg-error/10 text-error">
            <UIcon name="i-lucide-trending-down" size="18" />
          </div>
          <p class="text-[10px] font-black uppercase tracking-[0.25em] text-error/60">Expenses</p>
        </div>
        <p class="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-error truncate font-mono">
          {{ formatCurrency(summary.totalExpenses) }}
        </p>
      </div>

      <div class="group relative overflow-hidden rounded-[32px] bg-secondary/5 p-6 border border-secondary/10 transition-all hover:bg-secondary/10">
        <div class="flex items-center gap-3">
          <div class="flex size-8 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
            <UIcon name="i-lucide-wallet" size="18" />
          </div>
          <p class="text-[10px] font-black uppercase tracking-[0.25em] text-secondary/60">Profit</p>
        </div>
        <p
          class="mt-4 text-2xl sm:text-3xl font-black tracking-tight truncate font-mono"
          :class="getProfitTone(summary.totalProfit)"
        >
          {{ formatCurrency(summary.totalProfit) }}
        </p>
      </div>

      <div class="group relative overflow-hidden rounded-[32px] bg-primary/5 p-6 border border-primary/10 transition-all hover:bg-primary/10">
        <div class="flex items-center gap-3">
          <div class="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon name="i-lucide-pie-chart" size="18" />
          </div>
          <p class="text-[10px] font-black uppercase tracking-[0.25em] text-primary/60">Margin</p>
        </div>
        <p
          class="mt-4 text-2xl sm:text-3xl font-black tracking-tight truncate"
          :class="getMarginTone(summary.marginPercent)"
        >
          {{ summary.marginPercent }}%
        </p>
      </div>
    </div>

    <div class="grid gap-12 2xl:grid-cols-[1fr_380px]">
      <!-- Client Profitability Section -->
      <section class="space-y-8 min-w-0">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-2">
          <div>
            <h3 class="text-2xl font-black text-highlighted tracking-tight">Client Profitability</h3>
            <p class="text-sm text-muted mt-1 font-medium">
              Manage client relationships, costs, and collection performance.
            </p>
          </div>

          <UButton
            color="primary"
            variant="soft"
            icon="i-lucide-plus"
            class="px-6 py-2.5 shadow-sm"
            @click="addClient"
          >
            Add New Client
          </UButton>
        </div>

        <div
          v-if="block.clients.length === 0"
          class="flex min-h-[350px] flex-col items-center justify-center rounded-[48px] border-2 border-dashed border-muted/20 bg-elevated/5 py-16 text-center"
        >
          <div class="flex size-20 items-center justify-center rounded-[32px] bg-muted/10 text-muted/30">
            <UIcon name="i-lucide-users-2" size="40" />
          </div>
          <p class="mt-6 text-base font-bold text-muted">No clients added yet.</p>
          <UButton
            variant="ghost"
            color="primary"
            class="mt-4"
            icon="i-lucide-plus"
            @click="addClient"
          >
            Add first client
          </UButton>
        </div>

        <div v-else class="space-y-8">
          <article
            v-for="client in block.clients"
            :key="client.id"
            class="group relative rounded-[40px] border border-muted/20 bg-default/40 p-8 sm:p-10 transition-all hover:border-primary/40 hover:bg-default/70 hover:shadow-2xl hover:shadow-primary/5"
          >
            <!-- Card Header: Title + Action + Margin -->
            <div class="flex items-start justify-between gap-6 mb-10 pb-8 border-b border-muted/10">
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-black uppercase tracking-[0.25em] text-muted mb-2">Client Identity</p>
                <UInput
                  :model-value="client.name"
                  placeholder="Enter client name..."
                  variant="none"
                  size="xl"
                  :ui="{ base: 'px-0 text-highlighted placeholder:text-muted/30 text-2xl sm:text-3xl' }"
                  @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'profitability-cash-flow') return;
                      const target = entry.clients.find((candidate) => candidate.id === client.id);
                      if (!target) return;
                      target.name = ($event ?? '').slice(0, 120);
                    })
                  "
                />
              </div>

              <div class="flex items-center gap-6">
                <div class="text-right">
                  <p class="text-[9px] font-black uppercase tracking-[0.2em] text-muted mb-1">Current Margin</p>
                  <p
                    class="text-3xl font-black"
                    :class="getMarginTone(getProfitabilityClientMarginPercent(client))"
                  >
                    {{ getProfitabilityClientMarginPercent(client) }}%
                  </p>
                </div>
                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  size="lg"
                  class="bg-error/5 hover:bg-error/15 text-error"
                  @click="removeClient(client.id)"
                />
              </div>
            </div>

            <!-- Card Body: Metrics Grouped with Flex-Wrap -->
            <div class="flex flex-wrap items-end gap-x-12 gap-y-10">
              <!-- Group 1: Collection Status -->
              <div class="w-full sm:w-[220px]">
                <UFormField label="Collection Status" size="sm" :ui="{ label: 'text-[10px] font-black uppercase tracking-[0.2em] text-muted/80 mb-2' }">
                  <USelect
                    :model-value="client.paymentStatus"
                    :items="paymentStatusOptions"
                    variant="subtle"
                    class="h-11"
                    @update:model-value="
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== 'profitability-cash-flow') return;
                        const target = entry.clients.find((candidate) => candidate.id === client.id);
                        if (!target) return;
                        target.paymentStatus =
                          ($event as WorkspaceFinancePaymentStatus | undefined) ?? 'paid';
                      })
                    "
                  />
                </UFormField>
              </div>

              <!-- Group 2: Financial Inputs -->
              <div class="flex flex-wrap items-end gap-8">
                <UFormField label="Revenue" size="sm" :ui="{ label: 'text-[10px] font-black uppercase tracking-[0.2em] text-muted/80 mb-2' }">
                  <UInput
                    :model-value="String(client.revenueEgp)"
                    type="number"
                    variant="subtle"
                    class="w-36"
                    :ui="{ base: 'h-11 text-success font-mono' }"
                    @update:model-value="
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== 'profitability-cash-flow') return;
                        const target = entry.clients.find((candidate) => candidate.id === client.id);
                        if (!target) return;
                        target.revenueEgp = toInteger($event ?? '0', target.revenueEgp);
                      })
                    "
                  />
                </UFormField>

                <UFormField label="Direct Cost" size="sm" :ui="{ label: 'text-[10px] font-black uppercase tracking-[0.2em] text-muted/80 mb-2' }">
                  <UInput
                    :model-value="String(client.costEgp)"
                    type="number"
                    variant="subtle"
                    class="w-36"
                    :ui="{ base: 'h-11 text-error font-mono' }"
                    @update:model-value="
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== 'profitability-cash-flow') return;
                        const target = entry.clients.find((candidate) => candidate.id === client.id);
                        if (!target) return;
                        target.costEgp = toInteger($event ?? '0', target.costEgp);
                      })
                    "
                  />
                </UFormField>
              </div>

              <!-- Group 3: Health Score -->
              <div class="flex-1 min-w-[200px] space-y-4 rounded-3xl bg-elevated/20 p-5 border border-muted/5 shadow-inner">
                <div class="flex items-center justify-between">
                  <p class="text-[9px] font-black uppercase tracking-[0.2em] text-muted">Relationship Health</p>
                  <div class="flex items-center gap-2">
                    <UInput
                      :model-value="String(client.healthPercent)"
                      type="number"
                      size="xs"
                      variant="none"
                      class="w-12"
                      :ui="{ base: 'text-right p-0 h-auto text-primary font-mono' }"
                      @update:model-value="
                        mutateBlock(tabId, block.id, (entry) => {
                          if (entry.type !== 'profitability-cash-flow') return;
                          const target = entry.clients.find((candidate) => candidate.id === client.id);
                          if (!target) return;
                          target.healthPercent = Math.min(100, toInteger($event ?? '0', target.healthPercent));
                        })
                      "
                    />
                    <span class="text-xs font-black text-primary/60">%</span>
                  </div>
                </div>
                <UProgress :model-value="client.healthPercent" size="md" color="primary" class="rounded-full" />
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- Expense Breakdown Section -->
      <section class="flex flex-col gap-8 rounded-[48px] border border-muted/20 bg-elevated/5 p-8 lg:sticky lg:top-8 lg:h-fit shadow-xl shadow-muted/5">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h3 class="text-xl font-black text-highlighted tracking-tight">Overhead</h3>
            <p class="text-xs text-muted mt-0.5 font-medium">Monthly recurring costs.</p>
          </div>

          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-plus"
            size="md"
            class="px-5 shadow-sm"
            @click="addExpense"
          >
            Add
          </UButton>
        </div>

        <div
          v-if="block.expenses.length === 0"
          class="flex flex-col items-center justify-center rounded-[36px] border-2 border-dashed border-muted/20 bg-default/40 py-12 text-center"
        >
          <UIcon name="i-lucide-receipt" size="32" class="text-muted/30" />
          <p class="mt-4 text-sm font-bold text-muted">No overhead listed.</p>
        </div>

        <div v-else class="space-y-6">
          <article
            v-for="expense in block.expenses"
            :key="expense.id"
            class="relative rounded-[32px] border border-muted/10 bg-default/70 p-6 transition-all hover:bg-default hover:border-primary/20 hover:shadow-md"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <UInput
                  :model-value="expense.category"
                  placeholder="Expense category..."
                  variant="none"
                  size="md"
                  :ui="{ base: 'px-0 text-highlighted placeholder:text-muted/30 text-lg' }"
                  @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'profitability-cash-flow') return;
                      const target = entry.expenses.find((candidate) => candidate.id === expense.id);
                      if (!target) return;
                      target.category = ($event ?? '').slice(0, 120);
                    })
                  "
                />
              </div>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="sm"
                class="hover:text-error hover:bg-error/10 transition-colors"
                @click="removeExpense(expense.id)"
              />
            </div>

            <div class="mt-6">
              <div class="mb-2.5 flex items-center justify-between px-1">
                <span class="text-[10px] font-black text-muted/60 uppercase tracking-widest">Share of Overhead</span>
                <span class="text-xs font-black text-primary">{{ getExpenseSharePercent(expense, totalExpenseBreakdown) }}%</span>
              </div>
              <UProgress
                :model-value="getExpenseSharePercent(expense, totalExpenseBreakdown)"
                size="md"
                class="rounded-full bg-primary/10"
              />
            </div>

            <div class="mt-8 pt-6 border-t border-muted/5 flex items-end justify-between gap-6">
              <div class="flex-1">
                <p class="mb-2 text-[9px] font-black uppercase tracking-widest text-muted/80">Monthly Amount</p>
                <UInput
                  :model-value="String(expense.amountEgp)"
                  type="number"
                  variant="subtle"
                  size="md"
                  class="h-11"
                  :ui="{ base: 'font-mono' }"
                  @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'profitability-cash-flow') return;
                      const target = entry.expenses.find((candidate) => candidate.id === expense.id);
                      if (!target) return;
                      target.amountEgp = toInteger($event ?? '0', target.amountEgp);
                    })
                  "
                />
              </div>
              <div class="text-right pb-1">
                <p class="text-sm font-black text-toned italic opacity-60 font-mono">
                  {{ formatCurrency(expense.amountEgp) }}
                </p>
              </div>
            </div>
          </article>

          <div class="mt-6 flex items-center justify-between rounded-[36px] bg-primary/10 p-7 border border-primary/20 shadow-inner">
            <div>
              <p class="text-[10px] font-black text-primary/60 uppercase tracking-[0.25em]">Total Overhead</p>
              <p class="text-2xl font-black text-primary mt-1.5 tracking-tight font-mono">
                {{ formatCurrency(totalExpenseBreakdown) }}
              </p>
            </div>
            <div class="size-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-sm border border-primary/10">
              <UIcon name="i-lucide-calculator" size="28" />
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>




