<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { $authClient, $orpc } = useNuxtApp();

definePageMeta({
  middleware: ["auth"],
});

const route = useRoute();
const session = $authClient.useSession();

const workspaceQuery = useQuery({
  ...$orpc.workspace.get.queryOptions(),
  enabled: computed(() => Boolean(session.value?.data?.user)),
  staleTime: Number.POSITIVE_INFINITY,
});

const nodeId = computed(() => String(route.params.id ?? ""));

const node = computed(() => {
  const list = workspaceQuery.data.value?.nodes;
  if (!list) {
    return null;
  }

  return list.find((n) => n.id === nodeId.value) ?? null;
});

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-8 md:px-6">
    <UAlert
      v-if="workspaceQuery.status.value === 'error'"
      color="error"
      icon="i-lucide-alert-circle"
      title="Workspace unavailable"
      :description="
        workspaceQuery.error.value?.message || 'The user workspace could not be loaded.'
      "
    />

    <div v-else-if="workspaceQuery.isLoading.value" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
    </div>

    <template v-else-if="node">
      <div class="mb-8">
        <UButton
          to="/dashboard"
          color="neutral"
          variant="ghost"
          icon="i-lucide-arrow-left"
          class="-ml-2 mb-4"
        >
          Back to board
        </UButton>

        <h1 class="text-2xl font-semibold tracking-tight text-highlighted md:text-3xl">
          {{ node.title }}
        </h1>
        <p class="mt-2 text-sm text-muted">Updated {{ formatTimestamp(node.updatedAt) }}</p>
      </div>

      <UCard>
        <p class="whitespace-pre-wrap text-base leading-relaxed text-toned">
          {{ node.content || "No content yet." }}
        </p>
      </UCard>
    </template>

    <div v-else class="space-y-4">
      <UAlert
        color="warning"
        icon="i-lucide-search-x"
        title="Node not found"
        description="This node is not in your workspace. It may have been removed, or the link is invalid."
      />
      <UButton to="/dashboard" color="neutral" variant="soft"> Return to dashboard </UButton>
    </div>
  </div>
</template>
