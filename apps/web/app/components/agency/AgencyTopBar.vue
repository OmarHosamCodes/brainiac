<script setup lang="ts">
/**
 * @deprecated Use AgencyTopBarNav in the app shell context slot instead.
 * Kept for any in-page usage; wraps nav only.
 */
import type { AgencyLiveConnectionState } from "~/utils/agency-live-rpc";

import type { AgencySegmentId } from "./agency-segments";
import AgencyTopBarNav from "./AgencyTopBarNav.vue";

const props = defineProps<{
  segment: AgencySegmentId;
  teamId: string;
  teams: Array<{ id: string; name: string }>;
  connectionState?: AgencyLiveConnectionState;
}>();

const emit = defineEmits<{
  "update:segment": [value: AgencySegmentId];
  "update:teamId": [value: string];
}>();
</script>

<template>
  <div class="agency-topbar space-y-2 border-b border-default pb-3">
    <AgencyTopBarNav
      :segment="props.segment"
      :team-id="props.teamId"
      :teams="props.teams"
      :connection-state="props.connectionState"
      @update:segment="emit('update:segment', $event)"
      @update:team-id="emit('update:teamId', $event)"
    />

    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
