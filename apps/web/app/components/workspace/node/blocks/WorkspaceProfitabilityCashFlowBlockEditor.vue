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
  <div class="space-y-6">
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-[28px] bg-success/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-success/70">Revenue</p>
        <p class="mt-2 text-3xl font-black tracking-tight text-success">
          {{ formatCurrency(summary.totalRevenue) }}
        </p>
      </div>

      <div class="rounded-[28px] bg-error/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-error/70">Expenses</p>
        <p class="mt-2 text-3xl font-black tracking-tight text-error">
          {{ formatCurrency(summary.totalExpenses) }}
        </p>
      </div>

      <div class="rounded-[28px] bg-secondary/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary/80">Profit</p>
        <p
          class="mt-2 text-3xl font-black tracking-tight"
          :class="getProfitTone(summary.totalProfit)"
        >
          {{ formatCurrency(summary.totalProfit) }}
        </p>
      </div>

      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Margin</p>
        <p
          class="mt-2 text-3xl font-black tracking-tight"
          :class="getMarginTone(summary.marginPercent)"
        >
          {{ summary.marginPercent }}%
        </p>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(21rem,1fr)]">
      <section class="space-y-4">
        <div class="flex items-center justify-between gap-3 px-1">
          <div>
            <p class="text-sm font-semibold text-highlighted">Client profitability</p>
            <p class="text-sm text-muted">
              Revenue, delivery cost, collection status, and margin are shown side by side for each
              client.
            </p>
          </div>

          <UButton
            color="primary"
            variant="soft"
            icon="i-lucide-plus"
            class="rounded-full px-4"
            @click="addClient"
          >
            Add Client
          </UButton>
        </div>

        <div
          v-if="block.clients.length === 0"
          class="rounded-[32px] border border-dashed border-muted/40 bg-elevated/10 py-14 text-center"
        >
          <p class="text-sm font-semibold text-muted">No client rows yet.</p>
        </div>

        <div v-else class="space-y-3">
          <article
            v-for="client in block.clients"
            :key="client.id"
            class="rounded-[28px] border border-muted/30 bg-default/65 p-5"
          >
            <div
              class="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(9rem,0.8fr)_minmax(12rem,1fr)_minmax(8rem,0.8fr)_minmax(8rem,0.8fr)_minmax(8rem,0.8fr)_auto]"
            >
              <div>
                <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                  Client
                </p>
                <UInput
                  :model-value="client.name"
                  placeholder="Client name"
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

              <div>
                <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                  Status
                </p>
                <USelect
                  :model-value="client.paymentStatus"
                  :items="paymentStatusOptions"
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

              <div>
                <div
                  class="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted"
                >
                  <span>Health</span>
                  <span>{{ client.healthPercent }}%</span>
                </div>
                <UProgress :model-value="client.healthPercent" size="sm" class="rounded-full" />
                <UInput
                  :model-value="String(client.healthPercent)"
                  type="number"
                  size="sm"
                  class="mt-2"
                  @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'profitability-cash-flow') return;
                      const target = entry.clients.find((candidate) => candidate.id === client.id);
                      if (!target) return;
                      target.healthPercent = Math.min(
                        100,
                        toInteger($event ?? '0', target.healthPercent),
                      );
                    })
                  "
                />
              </div>

              <div>
                <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                  Revenue
                </p>
                <UInput
                  :model-value="String(client.revenueEgp)"
                  type="number"
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

              <div>
                <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Cost</p>
                <UInput
                  :model-value="String(client.costEgp)"
                  type="number"
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

              <div class="rounded-[22px] bg-elevated/40 p-3 text-center">
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Margin</p>
                <p
                  class="mt-2 text-2xl font-black"
                  :class="getMarginTone(getProfitabilityClientMarginPercent(client))"
                >
                  {{ getProfitabilityClientMarginPercent(client) }}%
                </p>
              </div>

              <div class="flex items-end justify-end">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  class="rounded-xl hover:text-error"
                  @click="removeClient(client.id)"
                />
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="space-y-4 rounded-[30px] border border-muted/30 bg-default/60 p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-highlighted">Expense breakdown</p>
            <p class="text-sm text-muted">Each category bar shows its share of overhead.</p>
          </div>

          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-plus"
            class="rounded-full px-4"
            @click="addExpense"
          >
            Add Expense
          </UButton>
        </div>

        <div
          v-if="block.expenses.length === 0"
          class="rounded-[26px] border border-dashed border-muted/40 bg-elevated/10 py-10 text-center"
        >
          <p class="text-sm font-semibold text-muted">No expense categories yet.</p>
        </div>

        <div v-else class="space-y-3">
          <article
            v-for="expense in block.expenses"
            :key="expense.id"
            class="rounded-[24px] border border-muted/25 bg-elevated/20 p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <UInput
                :model-value="expense.category"
                placeholder="Expense category"
                variant="none"
                :ui="{ base: 'px-0 font-semibold text-highlighted placeholder:text-muted/60' }"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'profitability-cash-flow') return;
                    const target = entry.expenses.find((candidate) => candidate.id === expense.id);
                    if (!target) return;
                    target.category = ($event ?? '').slice(0, 120);
                  })
                "
              />

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                class="rounded-xl hover:text-error"
                @click="removeExpense(expense.id)"
              />
            </div>

            <div class="mt-3 flex items-center gap-3">
              <div class="min-w-0 flex-1">
                <UProgress
                  :model-value="getExpenseSharePercent(expense, totalExpenseBreakdown)"
                  size="sm"
                  class="rounded-full"
                />
              </div>

              <p class="w-20 text-right text-xs font-bold uppercase tracking-[0.2em] text-muted">
                {{ getExpenseSharePercent(expense, totalExpenseBreakdown) }}%
              </p>
            </div>

            <UInput
              :model-value="String(expense.amountEgp)"
              type="number"
              class="mt-3"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'profitability-cash-flow') return;
                  const target = entry.expenses.find((candidate) => candidate.id === expense.id);
                  if (!target) return;
                  target.amountEgp = toInteger($event ?? '0', target.amountEgp);
                })
              "
            />

            <p class="mt-2 text-sm font-semibold text-toned">
              {{ formatCurrency(expense.amountEgp) }}
            </p>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
