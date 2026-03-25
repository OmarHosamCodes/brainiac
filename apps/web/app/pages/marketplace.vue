<script setup lang="ts">
import { WORKSPACE_NODE_LIMIT, type WorkspaceMarketplaceItem } from "@brainiac/workspace";
import { useQuery } from "@tanstack/vue-query";

import {
  cloneMarketplaceNodePayloadAsNode,
  getMarketplacePayloadSummary,
  getMarketplacePayloadTypeLabel,
} from "~/utils/workspace-marketplace";

definePageMeta({
  middleware: ["auth"],
});

const { authSession, nodes, saveBadge, saveError, workspaceQuery } = useWorkspaceBoard();
const orpc = useOrpc();
const toast = useToast();

const marketplaceQuery = useQuery({
  ...orpc.workspace.marketplace.list.queryOptions(),
  enabled: computed(() => Boolean(authSession.value?.data?.user)),
  staleTime: 15_000,
});

const marketplaceSearch = ref("");
const normalizedMarketplaceSearch = computed(() =>
  marketplaceSearch.value.trim().toLowerCase(),
);
const marketplaceItems = computed(() => marketplaceQuery.data.value?.items ?? []);
const visibleMarketplaceItems = computed(() => {
  if (!normalizedMarketplaceSearch.value) {
    return marketplaceItems.value;
  }

  return marketplaceItems.value.filter((item) =>
    [
      item.title,
      item.summary,
      item.createdByName,
      getMarketplacePayloadTypeLabel(item.payload),
      getMarketplacePayloadSummary(item.payload),
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedMarketplaceSearch.value),
  );
});

function insertMarketplaceItem(item: WorkspaceMarketplaceItem) {
  if (nodes.value.length >= WORKSPACE_NODE_LIMIT) {
    toast.add({
      title: "Node limit reached",
      description: `A workspace can store up to ${WORKSPACE_NODE_LIMIT} nodes.`,
      color: "warning",
      icon: "i-lucide-alert-triangle",
    });
    return;
  }

  const nextNode = cloneMarketplaceNodePayloadAsNode(item.payload);
  const anchorNode = nodes.value[nodes.value.length - 1];
  nextNode.x = (anchorNode?.x ?? 0) + 56;
  nextNode.y = (anchorNode?.y ?? 0) + 56;

  nodes.value = [...nodes.value, nextNode];

  toast.add({
    title: "Node inserted",
    description: `${item.title} was added to your dashboard.`,
    color: "success",
    icon: "i-lucide-check",
  });
}
</script>

<template>
  <div class="h-full min-h-0 overflow-y-auto p-4 md:p-6">
    <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-4">
      <UAlert
        v-if="workspaceQuery.status.value === 'error'"
        color="error"
        icon="i-lucide-alert-circle"
        title="Workspace unavailable"
        :description="
          workspaceQuery.error.value?.message || 'The user workspace could not be loaded.'
        "
      />

      <section class="rounded-2xl border border-muted/60 bg-default p-5 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.2em] text-muted">
              Team Marketplace
            </p>
            <h1 class="mt-2 text-2xl font-semibold tracking-tight text-highlighted">
              Shared Blocks, Tabs, and Nodes
            </h1>
            <p class="mt-2 text-sm text-muted">
              Insert any item as a ready-to-edit node on your dashboard.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <UBadge color="neutral" variant="soft">
              {{ marketplaceItems.length }} items
            </UBadge>
            <span
              class="rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em]"
              :class="saveBadge.className"
            >
              {{ saveBadge.label }}
            </span>
          </div>
        </div>

        <UInput
          v-model="marketplaceSearch"
          icon="i-lucide-search"
          class="mt-4"
          placeholder="Search marketplace"
        />

        <div v-if="marketplaceQuery.isLoading.value" class="mt-5 flex justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
        </div>

        <div
          v-else-if="visibleMarketplaceItems.length === 0"
          class="mt-5 rounded-2xl border border-dashed border-muted/70 bg-elevated/20 p-8 text-sm text-muted"
        >
          No marketplace items match this search.
        </div>

        <div v-else class="mt-5 space-y-3">
          <div
            v-for="item in visibleMarketplaceItems"
            :key="item.id"
            class="rounded-2xl border border-muted/60 bg-elevated/30 p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0 space-y-2">
                <p class="truncate font-medium text-highlighted">
                  {{ item.title }}
                </p>
                <p class="text-sm text-muted">
                  {{ item.summary || getMarketplacePayloadSummary(item.payload) }}
                </p>
                <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <UBadge color="neutral" variant="subtle">
                    {{ getMarketplacePayloadTypeLabel(item.payload) }}
                  </UBadge>
                  <span>{{ getMarketplacePayloadSummary(item.payload) }}</span>
                  <span>By {{ item.createdByName }}</span>
                </div>
              </div>

              <UButton
                color="primary"
                variant="soft"
                icon="i-lucide-download"
                @click="insertMarketplaceItem(item)"
              >
                Insert as node
              </UButton>
            </div>
          </div>
        </div>
      </section>

      <UAlert
        v-if="saveError"
        color="error"
        variant="soft"
        icon="i-lucide-cloud-off"
        title="Unable to persist workspace"
        :description="saveError"
      />
    </div>
  </div>
</template>
