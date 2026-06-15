<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

import { agencyEmptyPanelClass, agencySectionTitleClass } from "~/utils/agency-ui";

const props = defineProps<{
  teamId: string;
  active: boolean;
}>();

const orpc = useOrpc();
const teamId = computed(() => props.teamId);

const ratesQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.rates.list.queryOptions({ input: { teamId: teamId.value } }),
    enabled: Boolean(teamId.value) && props.active,
  })),
);

const rates = computed(() => ratesQuery.data.value?.items ?? []);

function formatRate(cents: number | null, currency: string): string {
  if (cents === null) return "Not set";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 :class="agencySectionTitleClass">Cost and billable rates per member</h2>
      <p class="mt-1 text-sm text-muted">
        Rates apply going forward, never retroactively. Override per project when a client negotiates
        a special rate.
      </p>
    </div>

    <div v-if="ratesQuery.isPending.value" class="space-y-2">
      <div v-for="i in 4" :key="i" class="h-10 animate-pulse rounded-lg bg-elevated/60" />
    </div>

    <div v-else-if="rates.length === 0" :class="agencyEmptyPanelClass">
      <UIcon name="i-lucide-dollar-sign" class="mx-auto size-6 text-muted" />
      <p class="mt-3 text-sm font-bold text-highlighted">No rates set yet</p>
      <p class="mx-auto mt-1 max-w-md text-xs text-muted">
        Once rates are configured for each member, budget burn and invoicing turn on across Projects
        and Billing. Rate editing ships in a follow-up release.
      </p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead class="border-b border-default text-left text-muted">
          <tr>
            <th class="py-2 pr-4 font-semibold">Member</th>
            <th class="px-3 py-2 text-right font-semibold">Cost rate</th>
            <th class="px-3 py-2 text-right font-semibold">Billable rate</th>
            <th class="py-2 pl-3 font-semibold">Effective from</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="rate in rates"
            :key="rate.userId"
            class="border-b border-default last:border-b-0"
          >
            <td class="py-3 pr-4">
              <p class="truncate font-bold text-highlighted">{{ rate.userName }}</p>
              <p class="truncate text-[11px] text-muted">{{ rate.userEmail }}</p>
            </td>
            <td class="px-3 py-3 text-right font-mono tabular-nums text-muted">
              {{ formatRate(rate.costRateCents, rate.currency) }}
            </td>
            <td class="px-3 py-3 text-right font-mono tabular-nums text-highlighted">
              {{ formatRate(rate.billableRateCents, rate.currency) }}
            </td>
            <td class="py-3 pl-3 text-muted">
              {{
                rate.effectiveFrom ? new Date(rate.effectiveFrom).toLocaleDateString() : "Not set"
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
