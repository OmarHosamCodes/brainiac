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
  <div class="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
    <!-- Controls Section -->
    <section class="space-y-4 rounded-2xl border border-muted/20 bg-default/40 p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-sm font-black text-highlighted tracking-tight">Pricing Simulator</h2>
          <p class="text-xs text-muted">Monthly retainer model for executive decisions.</p>
        </div>

        <div class="rounded-xl bg-primary/5 border border-primary/10 px-4 py-2.5 text-right">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
            Active Clients
          </p>
          <p class="mt-1 text-xl sm:text-2xl font-black tracking-tight text-primary">
            {{ block.activeClients }}
          </p>
        </div>
      </div>

      <!-- Client Adjust -->
      <div class="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          class="rounded-xl border border-muted/20 bg-elevated/10 px-4 py-2.5 text-left transition hover:border-primary/30"
          @click="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== 'pricing-simulator') return;
              entry.activeClients = Math.max(1, entry.activeClients - 1);
            })
          "
        >
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Adjust</p>
          <p class="mt-1 text-base font-bold text-highlighted">-1 Client</p>
        </button>

        <button
          type="button"
          class="rounded-xl border border-muted/20 bg-elevated/10 px-4 py-2.5 text-left transition hover:border-primary/30"
          @click="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== 'pricing-simulator') return;
              entry.activeClients = Math.min(50, entry.activeClients + 1);
            })
          "
        >
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Adjust</p>
          <p class="mt-1 text-base font-bold text-highlighted">+1 Client</p>
        </button>
      </div>

      <!-- Variable Controls -->
      <article
        v-for="control in controls"
        :key="control.key"
        class="rounded-xl border border-muted/20 bg-elevated/10 p-3"
      >
        <div class="flex items-center justify-between gap-3 mb-2">
          <label
            :for="control.key"
            class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
          >
            {{ control.label }}
          </label>
          <div class="flex items-center gap-1.5">
            <span class="text-lg sm:text-xl font-black tracking-tight text-highlighted">
              {{ block[control.key] }}
            </span>
            <span class="text-xs font-semibold text-muted">{{ control.suffix }}</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <input
            :id="control.key"
            :value="block[control.key]"
            :min="control.min"
            :max="control.max"
            type="range"
            class="flex-1 h-1.5 cursor-pointer appearance-none rounded-full bg-muted/35 accent-primary"
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
          <UInput
            :model-value="String(block[control.key])"
            type="number"
            size="sm"
            class="w-20 rounded-xl"
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

        <div
          class="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted/50"
        >
          <span>{{ control.min }}</span>
          <span>{{ control.max }}</span>
        </div>
      </article>
    </section>

    <!-- Results Section -->
    <section class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-2xl bg-success/5 p-4 border border-success/10">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
            Projected Revenue
          </p>
          <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-success font-mono">
            {{ formatCurrency(summary.projectedRevenue) }}
          </p>
        </div>

        <div class="rounded-2xl bg-primary/5 p-4 border border-primary/10">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
            Min Retainer / Client
          </p>
          <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-primary font-mono">
            {{ formatCurrency(summary.minimumRetainerPerClient) }}
          </p>
        </div>

        <div class="rounded-2xl bg-secondary/5 p-4 border border-secondary/10">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
            Projected Profit
          </p>
          <p
            class="mt-2 text-xl sm:text-2xl font-black tracking-tight font-mono"
            :class="summary.projectedProfit >= 0 ? 'text-success' : 'text-error'"
          >
            {{ formatCurrency(summary.projectedProfit) }}
          </p>
        </div>

        <div class="rounded-2xl bg-warning/5 p-4 border border-warning/10">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
            Required Revenue
          </p>
          <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-warning font-mono">
            {{ formatCurrency(summary.requiredRevenue) }}
          </p>
        </div>
      </div>

      <!-- Scenario Readout -->
      <div class="rounded-2xl border border-muted/20 bg-default/40 p-4">
        <h3 class="text-sm font-black text-highlighted tracking-tight">Scenario Readout</h3>
        <div class="mt-3 space-y-2 text-sm text-toned">
          <p>
            At <strong>{{ block.activeClients }}</strong> active clients, the team carries
            <strong>{{ summary.monthlyClientHours }}</strong> monthly delivery hours.
          </p>
          <p>
            To hit a <strong>{{ block.targetMarginPercent }}%</strong> margin with current overhead,
            each client should clear at least
            <strong>{{ formatCurrency(summary.minimumRetainerPerClient) }}</strong> per month.
          </p>
          <p class="text-xs text-muted">
            Use this to pressure-test rate increases, hiring decisions, and minimum retainers.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
