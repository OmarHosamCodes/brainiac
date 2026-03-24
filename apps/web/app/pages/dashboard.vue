<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { $authClient, $orpc } = useNuxtApp();

definePageMeta({
  middleware: ["auth"],
});

const session = $authClient.useSession();

const privateData = useQuery({
  ...$orpc.privateData.queryOptions(),
  enabled: computed(() => !!session.value?.data?.user),
});
</script>

<template>
  <InfiniteCanvas>
    <!-- First node on the canvas: the welcome / private-data card -->
    <div class="canvas-node" style="left: 80px; top: 80px">
      <UCard class="w-80">
        <template #header>
          <div class="text-lg font-semibold">
            {{
              session?.data?.user
                ? `Welcome back, ${session.data.user.name}!`
                : "Loading..."
            }}
          </div>
        </template>

        <USkeleton
          v-if="privateData.status.value === 'pending'"
          class="h-6 w-48"
        />

        <UAlert
          v-else-if="privateData.status.value === 'error'"
          color="error"
          icon="i-lucide-alert-circle"
          title="Error loading data"
          :description="
            privateData.error.value?.message || 'Failed to load private data'
          "
        />

        <div
          v-else-if="privateData.data.value"
          class="flex items-center gap-2"
        >
          <UIcon name="i-lucide-check-circle" class="text-success" />
          <span>{{ privateData.data.value.message }}</span>
        </div>
      </UCard>
    </div>
  </InfiniteCanvas>
</template>

<style scoped>
.canvas-node {
  position: absolute;
}
</style>
