<script setup lang="ts">
import type { WorkspaceMarketplaceItem } from "@brainiac/workspace";
import { useInfiniteQuery } from "@tanstack/vue-query";

definePageMeta({
  layout: "app",
  middleware: ["auth", "workspace"],
});

useAppShellPageTitle("Marketplace");
useAppShellContextSlot();
useAppShellActionsSlot();

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
const orpc = useOrpc();

const MARKETPLACE_PAGE_SIZE = 20;

const filterTabs = [
  { label: "All", kind: "all" as const, icon: "i-lucide-layers" },
  { label: "Nodes", kind: "node" as const, icon: "i-lucide-box" },
  { label: "Tabs", kind: "tab" as const, icon: "i-lucide-layout" },
  { label: "Blocks", kind: "block" as const, icon: "i-lucide-component" },
];

const selectedTabIndex = ref(0);
const activeKind = computed(() => filterTabs[selectedTabIndex.value]?.kind ?? "all");

const searchInput = ref("");
const debouncedSearch = ref("");
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(searchInput, (value) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    debouncedSearch.value = value;
  }, 300);
});

onUnmounted(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
});

const normalizedSearch = computed(() => debouncedSearch.value.trim() || undefined);

const marketplaceQuery = useInfiniteQuery(
  computed(() => ({
    ...orpc.workspace.marketplace.list.infiniteOptions({
      input: (pageParam: string | null) => ({
        cursor: pageParam ?? undefined,
        limit: MARKETPLACE_PAGE_SIZE,
        kind: activeKind.value,
        search: normalizedSearch.value,
      }),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage: { nextCursor: string | null }) => lastPage.nextCursor,
    }),
    enabled: Boolean(authSession.value?.data?.user),
    staleTime: 15_000,
  })),
);

const allItems = computed(
  () => marketplaceQuery.data.value?.pages.flatMap((page) => page.items) ?? [],
);

const totalLoaded = computed(() => allItems.value.length);

const isInitialLoading = computed(
  () => marketplaceQuery.isLoading.value && !marketplaceQuery.isFetchingNextPage.value,
);

// Scroll sentinel & IntersectionObserver
const sentinelRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      if (
        entry?.isIntersecting &&
        marketplaceQuery.hasNextPage.value &&
        !marketplaceQuery.isFetchingNextPage.value
      ) {
        marketplaceQuery.fetchNextPage();
      }
    },
    { rootMargin: "300px" },
  );

  watchEffect(() => {
    if (sentinelRef.value) {
      observer?.disconnect();
      observer?.observe(sentinelRef.value);
    }
  });
});

onUnmounted(() => {
  observer?.disconnect();
  observer = null;
});

// Import modal state
const importModal = reactive<{
  open: boolean;
  item: WorkspaceMarketplaceItem | null;
}>({
  open: false,
  item: null,
});

function openImportModal(item: WorkspaceMarketplaceItem) {
  importModal.item = item;
  importModal.open = true;
}

function onImported(payload: { kind: string; nodeId?: string }) {
  if (payload.nodeId) {
    selectedNodeIds.value = [payload.nodeId];
  }
}
</script>

<template>
  <div class="flex h-full flex-col overflow-y-auto bg-default">
    <Teleport to="#app-shell-context" defer>
      <div class="hidden md:block">
        <UTabs v-model="selectedTabIndex" :items="filterTabs" variant="pill" size="sm" />
      </div>
    </Teleport>

    <Teleport to="#app-shell-actions" defer>
      <div class="flex items-center gap-1.5 sm:gap-2">
        <UInput
          v-model="searchInput"
          icon="i-lucide-search"
          placeholder="Search..."
          class="hidden w-36 lg:block xl:w-44"
          size="sm"
        />
        <UBadge color="neutral" variant="soft" size="sm" class="hidden sm:inline-flex">
          {{ totalLoaded }}
        </UBadge>
        <UBadge
          v-if="isWorkspaceRefreshing"
          color="primary"
          variant="soft"
          size="sm"
          class="gap-1"
        >
          <UIcon name="i-lucide-loader-2" class="size-3 animate-spin" aria-hidden="true" />
        </UBadge>
      </div>
    </Teleport>

    <main class="flex flex-1 flex-col px-6 pb-16 pt-4 lg:px-8">
      <div class="flex flex-1 flex-col gap-6">
        <p class="text-sm text-muted">
          Browse and import shared nodes, tabs, and blocks into your workspace.
          <span
            v-if="saveBadge.label"
            class="ml-2 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
            :class="saveBadge.className"
          >
            {{ saveBadge.label }}
          </span>
        </p>

        <!-- Mobile filters -->
        <div class="flex flex-col gap-3 md:hidden">
          <UTabs v-model="selectedTabIndex" :items="filterTabs" variant="pill" />
          <UInput
            v-model="searchInput"
            icon="i-lucide-search"
            placeholder="Search marketplace..."
            size="sm"
          />
        </div>

        <!-- Error alerts -->
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

        <!-- Initial loading skeleton -->
        <UPageGrid v-if="isInitialLoading">
          <USkeleton v-for="i in 6" :key="i" class="h-50 rounded-2xl" />
        </UPageGrid>

        <!-- Empty state -->
        <UEmpty
          v-else-if="
            !isInitialLoading && allItems.length === 0 && !marketplaceQuery.isFetchingNextPage.value
          "
          icon="i-lucide-search-x"
          title="No items found"
          description="We couldn't find any marketplace items matching your current filters or search query."
          class="rounded-3xl border border-dashed border-muted/40 py-20"
        />

        <!-- Items grid -->
        <template v-else>
          <UPageGrid>
            <MarketplaceItemCard
              v-for="item in allItems"
              :key="item.id"
              :item="item"
              :loading="isWorkspaceInitialLoading"
              @insert="openImportModal"
            />
          </UPageGrid>

          <!-- Scroll sentinel for infinite loading -->
          <div ref="sentinelRef" class="flex items-center justify-center py-8">
            <div
              v-if="marketplaceQuery.isFetchingNextPage.value"
              class="flex items-center gap-2 text-sm text-muted"
            >
              <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
              Loading more items...
            </div>
            <p
              v-else-if="!marketplaceQuery.hasNextPage.value && allItems.length > 0"
              class="text-xs text-muted/60 uppercase tracking-wider"
            >
              All items loaded
            </p>
          </div>
        </template>
      </div>
    </main>

    <!-- Import modal -->
    <MarketplaceImportModal
      :open="importModal.open"
      :item="importModal.item"
      :nodes="nodes"
      :selected-node-ids="selectedNodeIds"
      @update:open="importModal.open = $event"
      @imported="onImported"
    />
  </div>
</template>
