<script setup lang="ts">
import AgencyTimeEntriesLog from "./AgencyTimeEntriesLog.vue";
import AgencyTimeTracker from "./AgencyTimeTracker.vue";

defineProps<{
  teamId: string;
}>();
</script>

<template>
  <div class="space-y-6">
    <AgencyTimeTracker :team-id="teamId" />
    <AgencyTimeEntriesLog :team-id="teamId" />
  </div>
</template>
