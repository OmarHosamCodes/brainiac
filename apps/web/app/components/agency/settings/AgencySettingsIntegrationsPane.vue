<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

import { agencySectionTitleClass } from "~/utils/agency-ui";

const props = defineProps<{
  teamId: string;
  active: boolean;
}>();

const orpc = useOrpc();
const teamId = computed(() => props.teamId);

const integrationsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.integrations.list.queryOptions({ input: { teamId: teamId.value } }),
    enabled: Boolean(teamId.value) && props.active,
  })),
);

const integrations = computed(() => integrationsQuery.data.value?.items ?? []);
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 :class="agencySectionTitleClass">Push time and budgets to where your team works</h2>
    </div>

    <div v-if="integrationsQuery.isPending.value" class="grid gap-3 sm:grid-cols-2">
      <div v-for="i in 4" :key="i" class="h-24 animate-pulse rounded-xl bg-elevated/60" />
    </div>

    <ul v-else class="grid gap-3 sm:grid-cols-2">
      <li
        v-for="integration in integrations"
        :key="integration.id"
        class="rounded-xl border border-default p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="truncate text-sm font-bold text-highlighted">{{ integration.name }}</p>
          <span
            class="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold"
            :class="integration.status === 'connected' ? 'text-success' : 'text-dimmed'"
          >
            <span
              class="inline-block size-1.5 rounded-full"
              :class="integration.status === 'connected' ? 'bg-success' : 'bg-muted'"
              aria-hidden="true"
            />
            {{ integration.status === "connected" ? "Connected" : "Available" }}
          </span>
        </div>
        <p class="mt-1 text-xs text-muted">{{ integration.description }}</p>
        <UButton
          :label="integration.status === 'connected' ? 'Manage' : 'Connect'"
          color="neutral"
          variant="soft"
          size="xs"
          class="mt-3"
          :disabled="integration.status !== 'connected'"
        />
      </li>
    </ul>
  </div>
</template>
