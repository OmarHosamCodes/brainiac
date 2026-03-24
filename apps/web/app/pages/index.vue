<script setup lang="ts">
const { $orpc } = useNuxtApp();
import { useQuery } from "@tanstack/vue-query";

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

const healthCheck = useQuery($orpc.healthCheck.queryOptions());

onServerPrefetch(async () => {
  try {
    await healthCheck.suspense();
  } catch {}
});
</script>

<template>
  <UContainer class="py-8">
    <pre class="overflow-x-auto font-mono text-sm whitespace-pre-wrap">{{ TITLE_TEXT }}</pre>

    <div class="grid gap-6 mt-6">
      <UCard>
        <template #header>
          <div class="font-medium">API Status</div>
        </template>

        <div class="flex items-center gap-2">
          <UIcon
            :name="
              healthCheck.isLoading.value
                ? 'i-lucide-loader-2'
                : healthCheck.isSuccess.value
                  ? 'i-lucide-check-circle'
                  : 'i-lucide-x-circle'
            "
            :class="[
              healthCheck.isLoading.value ? 'animate-spin text-muted' : '',
              healthCheck.isSuccess.value ? 'text-success' : '',
              healthCheck.isError.value ? 'text-error' : '',
            ]"
          />
          <span class="text-sm">
            <template v-if="healthCheck.isLoading.value"> Checking... </template>
            <template v-else-if="healthCheck.isSuccess.value">
              Connected ({{ healthCheck.data.value }})
            </template>
            <template v-else-if="healthCheck.isError.value">
              Error: {{ healthCheck.error.value?.message || "Failed to connect" }}
            </template>
            <template v-else> Idle </template>
          </span>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
