<script setup lang="ts">
import AgencyTimeSummary from "./AgencyTimeSummary.vue";

defineProps<{
  teamId: string;
}>();
</script>

<template>
  <AgencyTimeSummary :team-id="teamId" />
</template>
