<script setup lang="ts">
import {
  getPricingSimulatorSummary,
  type WorkspacePricingSimulatorBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspacePricingSimulatorBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getPricingSimulatorSummary(props.block));

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("en-US")} EGP`;
}

function toInteger(value: string, fallback: number) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.round(numeric);
}

function getInputValue(event: Event) {
  return (event.target as HTMLInputElement | null)?.value ?? "0";
}

const controls = [
  {
    key: "hoursPerClientPerMonth",
    label: "Hours / Client / Month",
    min: 5,
    max: 100,
    suffix: "h",
  },
  {
    key: "hourlyRateEgp",
    label: "Hourly Rate",
    min: 100,
    max: 2_000,
    suffix: "EGP",
  },
  {
    key: "monthlyOverheadEgp",
    label: "Monthly Overhead",
    min: 10_000,
    max: 200_000,
    suffix: "EGP",
  },
  {
    key: "targetMarginPercent",
    label: "Target Margin",
    min: 10,
    max: 80,
    suffix: "%",
  },
] as const;
</script>

<template>
  <div class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
    <section class="space-y-5 rounded-[32px] border border-muted/30 bg-default/60 p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-highlighted">Pricing simulator</p>
          <p class="text-sm text-muted">
            This model is monthly. Active clients stay editable because the retainer math depends on
            them.
          </p>
        </div>

        <div class="rounded-[22px] bg-primary/5 px-4 py-3 text-right">
          <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">
            Active Clients
          </p>
          <p class="mt-1 text-3xl font-black tracking-tight text-primary">
            {{ block.activeClients }}
          </p>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          class="rounded-[22px] border border-muted/30 bg-elevated/20 px-4 py-3 text-left transition hover:border-primary/30"
          @click="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== 'pricing-simulator') return;
              entry.activeClients = Math.max(1, entry.activeClients - 1);
            })
          "
        >
          <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Adjust</p>
          <p class="mt-1 text-lg font-bold text-highlighted">-1 Client</p>
        </button>

        <button
          type="button"
          class="rounded-[22px] border border-muted/30 bg-elevated/20 px-4 py-3 text-left transition hover:border-primary/30"
          @click="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== 'pricing-simulator') return;
              entry.activeClients = Math.min(50, entry.activeClients + 1);
            })
          "
        >
          <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Adjust</p>
          <p class="mt-1 text-lg font-bold text-highlighted">+1 Client</p>
        </button>
      </div>

      <article
        v-for="control in controls"
        :key="control.key"
        class="rounded-[26px] border border-muted/25 bg-elevated/20 p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">
              {{ control.label }}
            </p>
            <p class="mt-1 text-2xl font-black tracking-tight text-highlighted">
              {{ block[control.key] }}
              <span class="text-sm font-semibold text-muted">{{ control.suffix }}</span>
            </p>
          </div>

          <UInput
            :model-value="String(block[control.key])"
            type="number"
            class="w-32"
            @update:model-value="
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== 'pricing-simulator') return;
                entry[control.key] = Math.min(
                  control.max,
                  Math.max(
                    control.min,
                    toInteger($event ?? String(entry[control.key]), entry[control.key]),
                  ),
                );
              })
            "
          />
        </div>

        <input
          :value="block[control.key]"
          :min="control.min"
          :max="control.max"
          type="range"
          class="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted/35 accent-primary"
          @input="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== 'pricing-simulator') return;
              entry[control.key] = Math.min(
                control.max,
                Math.max(control.min, toInteger(getInputValue($event), entry[control.key])),
              );
            })
          "
        />

        <div class="mt-2 flex items-center justify-between text-xs text-muted">
          <span>{{ control.min }}</span>
          <span>{{ control.max }}</span>
        </div>
      </article>
    </section>

    <section class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-[28px] bg-success/5 p-5">
          <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-success/70">
            Projected Revenue
          </p>
          <p class="mt-2 text-3xl font-black tracking-tight text-success">
            {{ formatCurrency(summary.projectedRevenue) }}
          </p>
        </div>

        <div class="rounded-[28px] bg-primary/5 p-5">
          <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">
            Min Retainer / Client
          </p>
          <p class="mt-2 text-3xl font-black tracking-tight text-primary">
            {{ formatCurrency(summary.minimumRetainerPerClient) }}
          </p>
        </div>

        <div class="rounded-[28px] bg-secondary/10 p-5">
          <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary/80">
            Projected Profit
          </p>
          <p
            class="mt-2 text-3xl font-black tracking-tight"
            :class="summary.projectedProfit >= 0 ? 'text-success' : 'text-error'"
          >
            {{ formatCurrency(summary.projectedProfit) }}
          </p>
        </div>

        <div class="rounded-[28px] bg-warning/5 p-5">
          <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-warning/70">
            Required Revenue
          </p>
          <p class="mt-2 text-3xl font-black tracking-tight text-warning">
            {{ formatCurrency(summary.requiredRevenue) }}
          </p>
        </div>
      </div>

      <div class="rounded-[32px] border border-muted/30 bg-default/60 p-5">
        <p class="text-sm font-semibold text-highlighted">Scenario readout</p>
        <div class="mt-4 space-y-3 text-sm text-toned">
          <p>
            At <strong>{{ block.activeClients }}</strong> active clients, the team is carrying
            <strong>{{ summary.monthlyClientHours }}</strong> monthly delivery hours.
          </p>
          <p>
            To hit a <strong>{{ block.targetMarginPercent }}%</strong> margin with current overhead,
            each client should clear at least
            <strong>{{ formatCurrency(summary.minimumRetainerPerClient) }}</strong> per month.
          </p>
          <p>
            Use this to pressure-test rate increases, hiring decisions, and the minimum retainer you
            should accept.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
