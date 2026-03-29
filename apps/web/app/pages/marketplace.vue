<script setup lang="ts">
import {
  WORKSPACE_NODE_LIMIT,
  normalizeWorkspaceNode,
  type WorkspaceMarketplaceItem,
  type WorkspaceNode,
  type WorkspaceNodeTab,
} from "@brainiac/workspace";
import { useQuery } from "@tanstack/vue-query";
import {
  cloneMarketplaceBlockPayload,
  cloneMarketplaceNodePayloadAsNode,
  cloneMarketplaceTabPayload,
  getMarketplacePayloadSummary,
  getMarketplacePayloadTypeLabel,
} from "~/utils/workspace-marketplace";

definePageMeta({
  middleware: ["auth", "workspace"],
});

const {
  authSession,
  isWorkspaceInitialLoading,
  isWorkspaceRefreshing,
  nodes,
  selectedNodeIds,
  saveBadge,
  saveError,
  workspaceQuery,
} = useWorkspaceBoard();
const workspaceStore = useWorkspaceStore();
const orpc = useOrpc();
const toast = useToast();

const marketplaceQuery = useQuery({
  ...orpc.workspace.marketplace.list.queryOptions(),
  enabled: computed(() => Boolean(authSession.value?.data?.user)),
  staleTime: 15_000,
});

const marketplaceSearch = ref("");
const normalizedMarketplaceSearch = computed(() => marketplaceSearch.value.trim().toLowerCase());
const marketplaceItems = computed(() => marketplaceQuery.data.value?.items ?? []);

const tabs = [
  { label: "All", kind: "all", icon: "i-lucide-layers" },
  { label: "Nodes", kind: "node", icon: "i-lucide-box" },
  { label: "Tabs", kind: "tab", icon: "i-lucide-layout" },
  { label: "Blocks", kind: "block", icon: "i-lucide-component" },
];

const selectedTab = ref(0);
const activeKind = computed(() => tabs[selectedTab.value]?.kind ?? "all");

const importTarget = reactive<{
  open: boolean;
  item: WorkspaceMarketplaceItem | null;
  nodeId: string;
  tabId: string;
}>({
  open: false,
  item: null,
  nodeId: "",
  tabId: "",
});

const nodeOptions = computed(() =>
  nodes.value.map((node) => ({
    label: getDisplayNodeTitle(node),
    value: node.id,
  })),
);

const selectedImportNode = computed(
  () => nodes.value.find((node) => node.id === importTarget.nodeId) ?? null,
);

const tabOptions = computed(() =>
  (selectedImportNode.value?.tabs ?? []).map((tab) => ({
    label: getDisplayTabTitle(tab),
    value: tab.id,
  })),
);

const canSubmitImport = computed(() => {
  if (!importTarget.item) {
    return false;
  }

  if (importTarget.item.payload.kind === "node") {
    return true;
  }

  if (importTarget.item.payload.kind === "tab") {
    return Boolean(importTarget.nodeId);
  }

  return Boolean(importTarget.nodeId && importTarget.tabId);
});

const filteredMarketplaceItems = computed(() => {
  let items = marketplaceItems.value;

  if (activeKind.value !== "all") {
    items = items.filter((item) => item.payload.kind === activeKind.value);
  }

  if (!normalizedMarketplaceSearch.value) {
    return items;
  }

  return items.filter((item) =>
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
  if (item.payload.kind === "tab" || item.payload.kind === "block") {
    openImportTargetDialog(item);
    return;
  }

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
  selectedNodeIds.value = [nextNode.id];

  toast.add({
    title: "Node inserted",
    description: `${item.title} was added to your dashboard.`,
    color: "success",
    icon: "i-lucide-check",
  });
}

function getDisplayNodeTitle(node: WorkspaceNode) {
  return node.title.trim() || "Untitled node";
}

function getDisplayTabTitle(tab: WorkspaceNodeTab | null | undefined) {
  return tab?.title.trim() || "Untitled tab";
}

function resetImportTargetDialog() {
  importTarget.open = false;
  importTarget.item = null;
  importTarget.nodeId = "";
  importTarget.tabId = "";
}

function syncImportTargetTab() {
  if (importTarget.item?.payload.kind !== "block") {
    importTarget.tabId = "";
    return;
  }

  const nextTabs = selectedImportNode.value?.tabs ?? [];

  if (nextTabs.some((tab) => tab.id === importTarget.tabId)) {
    return;
  }

  importTarget.tabId = nextTabs[0]?.id ?? "";
}

function openImportTargetDialog(item: WorkspaceMarketplaceItem) {
  if (nodes.value.length === 0) {
    toast.add({
      title: "No destination available",
      description:
        item.payload.kind === "tab"
          ? "Create a node first so the imported tab has somewhere to go."
          : "Create a node and tab first so the imported block has somewhere to go.",
      color: "warning",
      icon: "i-lucide-alert-triangle",
    });
    return;
  }

  const preferredNodeId =
    selectedNodeIds.value.find((nodeId) => nodes.value.some((node) => node.id === nodeId)) ??
    nodes.value[0]?.id ??
    "";

  importTarget.item = item;
  importTarget.nodeId = preferredNodeId;
  importTarget.open = true;
  syncImportTargetTab();
}

function insertMarketplaceTab(item: WorkspaceMarketplaceItem, nodeId: string) {
  const imported = cloneMarketplaceTabPayload(item.payload);

  if (!imported) {
    return false;
  }

  let inserted = false;
  let targetNodeTitle = "";

  workspaceStore.updateNodes((draftNodes) => {
    const nodeIndex = draftNodes.findIndex((node) => node.id === nodeId);

    if (nodeIndex < 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    const targetNode = draftNodes[nodeIndex]!;
    targetNode.tabs.push(imported.tab);
    targetNode.customBlockTemplates.push(...imported.templates);
    targetNodeTitle = getDisplayNodeTitle(targetNode);
    targetNode.viewState.activeTabId = imported.tab.id;
    targetNode.updatedAt = timestamp;
    draftNodes[nodeIndex] = normalizeWorkspaceNode(targetNode);
    inserted = true;
  });

  if (!inserted) {
    return false;
  }

  selectedNodeIds.value = [nodeId];
  toast.add({
    title: "Tab inserted",
    description: `${item.title} was added to ${targetNodeTitle}.`,
    color: "success",
    icon: "i-lucide-check",
  });

  return true;
}

function insertMarketplaceBlock(item: WorkspaceMarketplaceItem, nodeId: string, tabId: string) {
  const imported = cloneMarketplaceBlockPayload(item.payload);

  if (!imported) {
    return false;
  }

  let inserted = false;
  let targetTabTitle = "";

  workspaceStore.updateNodes((draftNodes) => {
    const nodeIndex = draftNodes.findIndex((node) => node.id === nodeId);

    if (nodeIndex < 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    const targetNode = draftNodes[nodeIndex]!;
    const targetTab = targetNode.tabs.find((tab) => tab.id === tabId);

    if (!targetTab) {
      return;
    }

    targetNode.customBlockTemplates.push(...imported.templates);
    targetTab.blocks.push(imported.block);
    targetTab.updatedAt = timestamp;
    targetTabTitle = getDisplayTabTitle(targetTab);
    targetNode.viewState.activeTabId = targetTab.id;
    targetNode.updatedAt = timestamp;
    draftNodes[nodeIndex] = normalizeWorkspaceNode(targetNode);
    inserted = true;
  });

  if (!inserted) {
    return false;
  }

  selectedNodeIds.value = [nodeId];
  toast.add({
    title: "Block inserted",
    description: `${item.title} was added to ${targetTabTitle}.`,
    color: "success",
    icon: "i-lucide-check",
  });

  return true;
}

function submitImportTargetDialog() {
  if (!importTarget.item) {
    return;
  }

  let inserted = false;

  if (importTarget.item.payload.kind === "tab") {
    inserted = insertMarketplaceTab(importTarget.item, importTarget.nodeId);
  } else if (importTarget.item.payload.kind === "block") {
    inserted = insertMarketplaceBlock(importTarget.item, importTarget.nodeId, importTarget.tabId);
  }

  if (inserted) {
    resetImportTargetDialog();
  }
}

watch(
  () => importTarget.nodeId,
  () => {
    syncImportTargetTab();
  },
);
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 selection:bg-blue-500/30">
    <Header />

    <main class="px-4 pb-10 pt-28 md:px-6">
      <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <section
          class="rounded-[32px] border border-neutral-200/50 bg-white/70 p-6 shadow-xl shadow-black/5 backdrop-blur-xl dark:border-neutral-800/50 dark:bg-neutral-900/70"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-2">
              <p
                class="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400"
              >
                Team Marketplace
              </p>
              <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
                Discover shared nodes, tabs, and blocks
              </h1>
              <p class="max-w-2xl text-sm text-muted">
                Add full nodes directly, or send imported tabs and blocks into the exact destination
                you want.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <UBadge color="neutral" variant="soft"> {{ marketplaceItems.length }} items </UBadge>
              <UBadge v-if="isWorkspaceRefreshing" color="primary" variant="soft" class="gap-1.5">
                <UIcon name="i-lucide-loader-2" class="size-3 animate-spin" />
                Syncing
              </UBadge>
              <span
                class="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
                :class="saveBadge.className"
              >
                {{ saveBadge.label }}
              </span>
            </div>
          </div>

          <div class="mt-6 flex flex-wrap items-center justify-between gap-4">
            <UTabs v-model="selectedTab" :items="tabs" variant="pill" />

            <div class="flex w-full items-center gap-2 md:w-auto md:min-w-[320px]">
              <UInput
                v-model="marketplaceSearch"
                icon="i-lucide-search"
                placeholder="Search marketplace..."
                class="flex-1"
                size="md"
              />
            </div>
          </div>
        </section>

        <UAlert
          v-if="workspaceQuery.status === 'error'"
          color="error"
          icon="i-lucide-alert-circle"
          title="Workspace unavailable"
          :description="workspaceQuery.error?.message || 'The user workspace could not be loaded.'"
        />

        <UAlert
          v-if="saveError"
          color="error"
          variant="soft"
          icon="i-lucide-cloud-off"
          title="Unable to persist workspace"
          :description="saveError"
        />

        <UPageGrid v-if="marketplaceQuery.isLoading.value">
          <USkeleton v-for="i in 6" :key="i" class="h-[200px] rounded-2xl" />
        </UPageGrid>

        <UEmpty
          v-else-if="filteredMarketplaceItems.length === 0"
          icon="i-lucide-search-x"
          title="No items found"
          description="We couldn't find any marketplace items matching your current filters or search query."
          class="rounded-3xl border border-dashed border-muted/40 py-20"
        />

        <UPageGrid v-else>
          <MarketplaceItemCard
            v-for="item in filteredMarketplaceItems"
            :key="item.id"
            :item="item"
            :loading="isWorkspaceInitialLoading"
            @insert="insertMarketplaceItem"
          />
        </UPageGrid>
      </div>
    </main>

    <UModal
      :open="importTarget.open"
      :title="
        importTarget.item?.payload.kind === 'tab'
          ? 'Choose a node for this tab'
          : 'Choose a tab for this block'
      "
      :description="
        importTarget.item
          ? `Import ${importTarget.item.title} into an existing workspace destination.`
          : undefined
      "
      :ui="{
        content: 'sm:max-w-lg rounded-[28px] overflow-hidden',
        body: 'space-y-5 p-6',
        footer: 'flex items-center justify-end gap-3 border-t border-muted/20 bg-elevated/20 p-5',
      }"
      @update:open="(value) => !value && resetImportTargetDialog()"
    >
      <template #body>
        <div class="rounded-2xl border border-muted/30 bg-elevated/20 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-muted">Importing</p>
          <p class="mt-2 font-semibold text-highlighted">
            {{ importTarget.item?.title }}
          </p>
          <p class="mt-1 text-sm text-muted">
            {{
              importTarget.item?.summary ||
              (importTarget.item && getMarketplacePayloadSummary(importTarget.item.payload))
            }}
          </p>
        </div>

        <UFormField label="Node">
          <USelect v-model="importTarget.nodeId" :items="nodeOptions" class="w-full" />
        </UFormField>

        <UFormField v-if="importTarget.item?.payload.kind === 'block'" label="Tab">
          <USelect v-model="importTarget.tabId" :items="tabOptions" class="w-full" />
        </UFormField>
      </template>

      <template #footer>
        <UButton color="neutral" variant="ghost" @click="resetImportTargetDialog"> Cancel </UButton>
        <UButton
          color="primary"
          icon="i-lucide-download"
          :disabled="!canSubmitImport"
          @click="submitImportTargetDialog"
        >
          Import
        </UButton>
      </template>
    </UModal>
  </div>
</template>
