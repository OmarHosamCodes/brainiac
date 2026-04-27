<script setup lang="ts">
import AgencyProjectManager from "./AgencyProjectManager.vue";

defineProps<{
  teamId: string;
}>();
</script>

<template>
  <AgencyProjectManager :team-id="teamId" />
</template>
