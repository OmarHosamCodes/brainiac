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
    return {
      text: "text-success",
      bg: "bg-success/5",
      border: "border-success/10",
      icon: "bg-success/10 text-success",
    };
  }

  if (marginPercent > 20) {
    return {
      text: "text-warning",
      bg: "bg-warning/5",
      border: "border-warning/10",
      icon: "bg-warning/10 text-warning",
    };
  }

  return {
    text: "text-error",
    bg: "bg-error/5",
    border: "border-error/10",
    icon: "bg-error/10 text-error",
  };
}

function getProfitTone(value: number) {
  if (value > 0) {
    return {
      text: "text-success",
      bg: "bg-success/5",
      border: "border-success/10",
      icon: "bg-success/10 text-success",
    };
  }

  if (value === 0) {
    return {
      text: "text-warning",
      bg: "bg-warning/5",
      border: "border-warning/10",
      icon: "bg-warning/10 text-warning",
    };
  }

  return {
    text: "text-error",
    bg: "bg-error/5",
    border: "border-error/10",
    icon: "bg-error/10 text-error",
  };
}

function getHealthTone(healthPercent: number) {
  if (healthPercent >= 75) {
    return "success";
  }

  if (healthPercent >= 50) {
    return "warning";
  }

  return "error";
}
</script>

<template>
  <div class="space-y-8 overflow-x-hidden">
    <!-- Executive Summary: Key Cash Flow Metrics -->
    <section class="space-y-4">
      <div class="flex items-center justify-between gap-3 px-1">
        <div>
          <h2 class="text-lg font-black text-highlighted tracking-tight">Cash Flow Overview</h2>
          <p class="text-xs text-muted">
            Real-time profitability and margin metrics across all clients.
          </p>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Revenue Card -->
        <div
          class="rounded-3xl p-5 border transition-colors"
          :class="
            getProfitTone(summary.totalRevenue > 0 ? 1 : 0).bg +
            ' ' +
            getProfitTone(summary.totalRevenue > 0 ? 1 : 0).border
          "
        >
          <div class="flex items-center gap-2.5">
            <div
              class="flex size-8 items-center justify-center rounded-xl text-success"
              :class="getProfitTone(summary.totalRevenue > 0 ? 1 : 0).icon"
            >
              <UIcon name="i-lucide-trending-up" size="18" />
            </div>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Revenue</p>
          </div>
          <p
            class="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-success truncate font-mono"
          >
            {{ formatCurrency(summary.totalRevenue) }}
          </p>
        </div>

        <!-- Expenses Card -->
        <div
          class="rounded-3xl p-5 border transition-colors"
          :class="getProfitTone(-1).bg + ' ' + getProfitTone(-1).border"
        >
          <div class="flex items-center gap-2.5">
            <div
              class="flex size-8 items-center justify-center rounded-xl text-error"
              :class="getProfitTone(-1).icon"
            >
              <UIcon name="i-lucide-trending-down" size="18" />
            </div>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Expenses</p>
          </div>
          <p
            class="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-error truncate font-mono"
          >
            {{ formatCurrency(summary.totalExpenses) }}
          </p>
        </div>

        <!-- Profit Card -->
        <div
          class="rounded-3xl p-5 border transition-colors"
          :class="
            getProfitTone(summary.totalProfit).bg + ' ' + getProfitTone(summary.totalProfit).border
          "
        >
          <div class="flex items-center gap-2.5">
            <div
              class="flex size-8 items-center justify-center rounded-xl"
              :class="getProfitTone(summary.totalProfit).icon"
            >
              <UIcon name="i-lucide-wallet" size="18" />
            </div>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Net Profit</p>
          </div>
          <p
            class="mt-3 text-2xl sm:text-3xl font-black tracking-tight truncate font-mono"
            :class="getProfitTone(summary.totalProfit).text"
          >
            {{ formatCurrency(summary.totalProfit) }}
          </p>
        </div>

        <!-- Margin Card -->
        <div
          class="rounded-3xl p-5 border transition-colors"
          :class="
            getMarginTone(summary.marginPercent).bg +
            ' ' +
            getMarginTone(summary.marginPercent).border
          "
        >
          <div class="flex items-center gap-2.5">
            <div
              class="flex size-8 items-center justify-center rounded-xl"
              :class="getMarginTone(summary.marginPercent).icon"
            >
              <UIcon name="i-lucide-percent" size="18" />
            </div>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Margin</p>
          </div>
          <p
            class="mt-3 text-2xl sm:text-3xl font-black tracking-tight truncate font-mono"
            :class="getMarginTone(summary.marginPercent).text"
          >
            {{ summary.marginPercent }}%
          </p>
        </div>
      </div>
    </section>

    <div class="grid gap-8 lg:grid-cols-[1fr_340px]">
      <!-- Client Profitability Section -->
      <section class="space-y-6 min-w-0">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
          <div>
            <h2 class="text-lg font-black text-highlighted tracking-tight">Client Portfolio</h2>
            <p class="text-xs text-muted">
              Track profitability, margins, and collection status per client.
            </p>
          </div>

          <UButton
            color="primary"
            variant="soft"
            icon="i-lucide-plus"
            size="sm"
            class="rounded-full"
            @click="addClient"
          >
            Add Client
          </UButton>
        </div>

        <div
          v-if="block.clients.length === 0"
          class="border-dashed border-muted/20 rounded-3xl py-10 text-center bg-elevated/5 flex flex-col items-center justify-center"
        >
          <div
            class="flex size-16 items-center justify-center rounded-2xl bg-muted/10 text-muted/30"
          >
            <UIcon name="i-lucide-users-2" size="32" />
          </div>
          <p class="mt-4 text-sm font-bold text-muted">No clients yet</p>
          <p class="mt-1 text-xs text-muted/60">Add your first client to track profitability</p>
          <UButton
            variant="ghost"
            color="primary"
            size="sm"
            class="mt-3"
            icon="i-lucide-plus"
            @click="addClient"
          >
            Add first client
          </UButton>
        </div>

        <div v-else class="space-y-4">
          <article
            v-for="client in block.clients"
            :key="client.id"
            class="group relative rounded-2xl border border-muted/20 bg-default/40 p-5 transition-all hover:border-muted/30"
          >
            <!-- Card Header: Name + Margin Badge + Delete Action -->
            <div class="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-muted/10">
              <div class="flex-1 min-w-0">
                <UInput
                  :model-value="client.name"
                  placeholder="Client name"
                  variant="none"
                  size="lg"
                  :ui="{
                    base: 'px-0 text-highlighted placeholder:text-muted/30 text-xl font-black tracking-tight',
                  }"
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

              <div class="flex items-center gap-3 shrink-0">
                <UBadge
                  :color="
                    getMarginTone(getProfitabilityClientMarginPercent(client)).text ===
                    'text-success'
                      ? 'success'
                      : getMarginTone(getProfitabilityClientMarginPercent(client)).text ===
                          'text-warning'
                        ? 'warning'
                        : 'error'
                  "
                  variant="soft"
                  size="md"
                  class="rounded-xl px-3 py-1 font-mono font-bold"
                >
                  {{ getProfitabilityClientMarginPercent(client) }}% margin
                </UBadge>
                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  size="md"
                  class="rounded-xl hover:bg-error/10"
                  aria-label="Remove client"
                  @click="removeClient(client.id)"
                />
              </div>
            </div>

            <!-- Key Metrics Grid -->
            <div class="grid gap-4 sm:grid-cols-3">
              <!-- Collection Status -->
              <div>
                <label
                  class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-2"
                >
                  Payment Status
                </label>
                <USelect
                  :model-value="client.paymentStatus"
                  :items="paymentStatusOptions"
                  variant="subtle"
                  size="md"
                  class="rounded-xl"
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
              </div>

              <!-- Revenue -->
              <div>
                <label
                  class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-2"
                >
                  Revenue (EGP)
                </label>
                <UInput
                  :model-value="String(client.revenueEgp)"
                  type="number"
                  variant="subtle"
                  size="md"
                  :ui="{ base: 'text-success font-mono rounded-xl' }"
                  @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'profitability-cash-flow') return;
                      const target = entry.clients.find((candidate) => candidate.id === client.id);
                      if (!target) return;
                      target.revenueEgp = toInteger($event ?? '0', target.revenueEgp);
                    })
                  "
                />
              </div>

              <!-- Direct Cost -->
              <div>
                <label
                  class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-2"
                >
                  Direct Cost (EGP)
                </label>
                <UInput
                  :model-value="String(client.costEgp)"
                  type="number"
                  variant="subtle"
                  size="md"
                  :ui="{ base: 'text-error font-mono rounded-xl' }"
                  @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'profitability-cash-flow') return;
                      const target = entry.clients.find((candidate) => candidate.id === client.id);
                      if (!target) return;
                      target.costEgp = toInteger($event ?? '0', target.costEgp);
                    })
                  "
                />
              </div>
            </div>

            <!-- Relationship Health -->
            <div class="mt-4 rounded-xl bg-elevated/10 p-4 border border-muted/10">
              <div class="flex items-center justify-between mb-2">
                <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
                  Relationship Health
                </label>
                <div class="flex items-center gap-1.5">
                  <UInput
                    :model-value="String(client.healthPercent)"
                    type="number"
                    size="xs"
                    variant="none"
                    class="w-10"
                    :ui="{ base: 'text-right p-0 h-auto text-primary font-mono font-bold' }"
                    @update:model-value="
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== 'profitability-cash-flow') return;
                        const target = entry.clients.find(
                          (candidate) => candidate.id === client.id,
                        );
                        if (!target) return;
                        target.healthPercent = Math.min(
                          100,
                          toInteger($event ?? '0', target.healthPercent),
                        );
                      })
                    "
                  />
                  <span class="text-xs font-black text-primary/60">%</span>
                </div>
              </div>
              <UProgress
                :model-value="client.healthPercent"
                size="sm"
                :color="getHealthTone(client.healthPercent)"
                class="rounded-full"
              />
            </div>
          </article>
        </div>
      </section>

      <!-- Expense Breakdown Section -->
      <section
        class="flex flex-col gap-5 rounded-2xl border border-muted/20 bg-elevated/5 p-6 lg:sticky lg:top-8 lg:h-fit"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-black text-highlighted tracking-tight">Monthly Overhead</h2>
            <p class="text-[11px] text-muted mt-0.5">Recurring operating costs.</p>
          </div>

          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-plus"
            size="sm"
            class="rounded-full"
            @click="addExpense"
          >
            Add
          </UButton>
        </div>

        <div
          v-if="block.expenses.length === 0"
          class="border-dashed border-muted/20 rounded-xl py-8 text-center bg-elevated/5 flex flex-col items-center justify-center"
        >
          <UIcon name="i-lucide-receipt" size="24" class="text-muted/30" />
          <p class="mt-3 text-xs font-bold text-muted">No overhead costs</p>
        </div>

        <div v-else class="space-y-3">
          <article
            v-for="expense in block.expenses"
            :key="expense.id"
            class="relative rounded-xl border border-muted/10 bg-default/40 p-4 transition-all hover:bg-default/60"
          >
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex-1">
                <UInput
                  :model-value="expense.category"
                  placeholder="Category name"
                  variant="none"
                  size="sm"
                  :ui="{
                    base: 'px-0 text-highlighted placeholder:text-muted/30 text-sm font-bold',
                  }"
                  @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'profitability-cash-flow') return;
                      const target = entry.expenses.find(
                        (candidate) => candidate.id === expense.id,
                      );
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
                size="xs"
                class="rounded-lg hover:text-error hover:bg-error/10"
                aria-label="Remove expense"
                @click="removeExpense(expense.id)"
              />
            </div>

            <div class="flex items-end justify-between gap-3">
              <div class="flex-1">
                <label
                  class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5"
                >
                  Monthly (EGP)
                </label>
                <UInput
                  :model-value="String(expense.amountEgp)"
                  type="number"
                  variant="subtle"
                  size="sm"
                  :ui="{ base: 'font-mono rounded-xl' }"
                  @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'profitability-cash-flow') return;
                      const target = entry.expenses.find(
                        (candidate) => candidate.id === expense.id,
                      );
                      if (!target) return;
                      target.amountEgp = toInteger($event ?? '0', target.amountEgp);
                    })
                  "
                />
              </div>

              <div class="text-right pb-0.5">
                <p class="text-xs font-black text-muted/60 font-mono">
                  {{ getExpenseSharePercent(expense, totalExpenseBreakdown) }}%
                </p>
              </div>
            </div>
          </article>

          <!-- Total Overhead Summary -->
          <div
            class="flex items-center justify-between rounded-xl bg-primary/5 p-4 border border-primary/10"
          >
            <div>
              <p class="text-[10px] font-bold text-muted/60 uppercase tracking-[0.2em]">
                Total Monthly
              </p>
              <p class="text-lg font-black text-primary mt-1 tracking-tight font-mono">
                {{ formatCurrency(totalExpenseBreakdown) }}
              </p>
            </div>
            <div
              class="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10"
            >
              <UIcon name="i-lucide-calculator" size="20" />
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
