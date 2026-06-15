<script setup lang="ts">
import { agencyFocusRingClass } from "~/utils/agency-ui";

import { formatTenureHours, tenureStatusClass, tenureStatusLabel } from "./tenure-utils";

type TenureMemberSummary = {
  userId: string;
  userName: string;
  userEmail: string;
  awaitingFirstEntry: boolean;
  netTenureLabel: string;
  currentQuarter: {
    loggedHours: number;
    requiredHours: number;
    status: string;
  } | null;
};

defineProps<{
  members: TenureMemberSummary[];
  policyEnabled: boolean;
}>();

const emit = defineEmits<{
  select: [userId: string];
}>();
</script>

<template>
  <section>
    <div v-if="!policyEnabled" class="py-10 text-center">
      <UIcon name="i-lucide-users" class="mx-auto size-6 text-muted" />
      <p class="mt-3 text-sm font-bold text-highlighted">Tenure tracking is off</p>
      <p class="mx-auto mt-1 max-w-md text-xs text-muted">
        Set a policy effective date and enable tracking to start measuring agency tenure.
      </p>
    </div>

    <div v-else-if="members.length === 0" class="py-10 text-center text-sm text-muted">
      No team members to display.
    </div>

    <div v-else>
      <div
        class="hidden border-b border-default pb-2 text-[11px] font-semibold text-muted sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_2rem] sm:gap-3"
      >
        <span>Member</span>
        <span>Net tenure</span>
        <span class="text-right">This quarter</span>
        <span>Status</span>
        <span class="sr-only">Open</span>
      </div>

      <ul class="divide-y divide-default">
        <li v-for="member in members" :key="member.userId">
          <button
            type="button"
            class="group grid w-full gap-2 px-1 py-3 text-left transition-colors hover:bg-elevated/50 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_2rem] sm:items-center sm:gap-3"
            :class="agencyFocusRingClass"
            @click="emit('select', member.userId)"
          >
            <span class="min-w-0">
              <span class="block truncate text-sm font-bold text-highlighted">{{
                member.userName
              }}</span>
              <span class="block truncate text-xs text-muted">{{ member.userEmail }}</span>
            </span>
            <span class="font-mono text-sm tabular-nums text-highlighted">
              <span v-if="member.awaitingFirstEntry" class="text-muted">Awaiting first entry</span>
              <span v-else>{{ member.netTenureLabel }}</span>
            </span>
            <span class="font-mono text-sm tabular-nums text-muted sm:text-right">
              <template v-if="member.currentQuarter">
                {{ formatTenureHours(member.currentQuarter.loggedHours) }} /
                {{ formatTenureHours(member.currentQuarter.requiredHours) }} h
              </template>
              <span v-else>—</span>
            </span>
            <span>
              <span
                v-if="member.currentQuarter"
                class="text-xs font-bold"
                :class="tenureStatusClass(member.currentQuarter.status)"
              >
                {{ tenureStatusLabel(member.currentQuarter.status) }}
              </span>
              <span
                v-else-if="member.awaitingFirstEntry"
                class="text-xs font-bold text-muted"
              >
                Awaiting entry
              </span>
              <span v-else class="text-xs font-bold text-muted">—</span>
            </span>
            <span
              class="hidden justify-self-end text-muted transition-colors group-hover:text-highlighted sm:inline-flex"
              aria-hidden="true"
            >
              <UIcon name="i-lucide-chevron-right" class="size-4" />
            </span>
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>
