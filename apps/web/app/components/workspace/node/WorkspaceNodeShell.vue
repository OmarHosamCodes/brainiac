<script setup lang="ts">
import type {
  WorkspaceBlock,
  WorkspaceNode,
  WorkspaceNodeTab,
  WorkspaceTeamRole,
} from "@brainiac/workspace";
import {
  useWorkspaceNodeEditorContext,
  type WorkspaceSaveBadge,
} from "~/components/workspace/node/context";
import {
  workspaceAddBlockCategories,
  type WorkspaceAddBlockCategory,
} from "~/utils/workspace-add-block-menu";
import {
  workspaceBlockPresets,
  type WorkspaceBlockPresetId,
} from "~/utils/workspace-block-presets";
import {
  getWorkspaceBlockRegistryEntry,
  workspacePrimaryBlockTypes,
} from "~/utils/workspace-block-registry";

type WorkspaceTeamSummary = {
  id: string;
  name: string;
  role: WorkspaceTeamRole;
};

const props = defineProps<{
  node: WorkspaceNode;
  activeTab: WorkspaceNodeTab;
  activeTabId: string;
  saveBadge: WorkspaceSaveBadge;
  saveError: string | null;
  visibleBlocks: WorkspaceBlock[];
  nodeVisibilityLabel: string;
  nodeVisibilityBadgeClass: string;
  nodeOwnerLabel: string;
  nodeTeamName: string | null;
  activeTeamRole: WorkspaceTeamRole | null;
  canEditNodeContent: boolean;
  teams: WorkspaceTeamSummary[];
  nodeShareTeamId: string;
  canManageNodeSharing: boolean;
  sharePending: boolean;
  unsharePending: boolean;
}>();

const emit = defineEmits<{
  (event: "update:nodeShareTeamId", value: string): void;
  (event: "shareNode"): void;
  (event: "unshareNode"): void;
}>();

const {
  blockSearch,
  tabEditor,
  setActiveTab,
  openTabEditor,
  closeTabEditor,
  submitTabEditor,
  deleteActiveTab,
  saveActiveTabToMarketplace,
  addBlockToActiveTab,
  addBlockPresetToActiveTab,
  getDisplayTabTitle,
} = useWorkspaceNodeEditorContext();

const primaryBlockTypes = workspacePrimaryBlockTypes;

const nodeShareTeamIdModel = computed({
  get: () => props.nodeShareTeamId,
  set: (value: string) => {
    emit("update:nodeShareTeamId", value);
  },
});

const isNodeSharedWithTeam = computed(() => props.node.visibility === "team");
const isShareTogglePending = computed(() => props.sharePending || props.unsharePending);
const shareToggleLabel = computed(() => (isNodeSharedWithTeam.value ? "Unshare" : "Share"));
const shareToggleColor = computed(() => (isNodeSharedWithTeam.value ? "neutral" : "primary"));
const shareToggleVariant = computed(() => (isNodeSharedWithTeam.value ? "soft" : "solid"));
const isShareToggleDisabled = computed(() => {
  if (!props.canManageNodeSharing || isShareTogglePending.value) {
    return true;
  }

  if (isNodeSharedWithTeam.value) {
    return false;
  }

  return !props.nodeShareTeamId;
});

const activeTeamRoleLabel = computed(() => {
  if (!props.activeTeamRole) {
    return null;
  }

  if (props.activeTeamRole === "owner") {
    return "Owner";
  }

  if (props.activeTeamRole === "editor") {
    return "Editor";
  }

  return "Viewer";
});

function toggleNodeSharing() {
  if (isNodeSharedWithTeam.value) {
    emit("unshareNode");
    return;
  }

  emit("shareNode");
}

const isSidebarOpen = ref(true);

type WorkspaceBlockLauncherMode = "blocks" | "packs";
type WorkspaceBlockLauncherCategoryId = "all" | "core" | WorkspaceAddBlockCategory["id"];
type WorkspaceBlockLauncherItem = {
  blockType: WorkspaceBlock["type"];
  categoryId: Exclude<WorkspaceBlockLauncherCategoryId, "all">;
  categoryLabel: string;
  icon: string;
  label: string;
  searchText: string;
  teamOnly: boolean;
};
type WorkspaceBlockLauncherCategory = {
  id: Exclude<WorkspaceBlockLauncherCategoryId, "all">;
  label: string;
  items: WorkspaceBlockLauncherItem[];
};

const addBlockLauncherOpen = ref(false);
const addBlockLauncherMode = ref<WorkspaceBlockLauncherMode>("blocks");
const addBlockLauncherSearch = ref("");
const addBlockCategoryFilter = ref<WorkspaceBlockLauncherCategoryId>("all");

const addBlockLauncherTabs = [
  {
    label: "Blocks",
    icon: "i-lucide-blocks",
    value: "blocks",
  },
  {
    label: "Starter packs",
    icon: "i-lucide-layout-template",
    value: "packs",
  },
];

const addBlockQuickTypes: WorkspaceBlock["type"][] = [
  "task-list",
  "notes",
  "decision",
  "kanban",
  "timeline",
  "ai-prompt",
];

const blockLauncherCategories: WorkspaceBlockLauncherCategory[] = [
  {
    id: "core",
    label: "Core",
    items: primaryBlockTypes.map((type) => {
      const entry = getWorkspaceBlockRegistryEntry(type);

      return {
        blockType: type,
        categoryId: "core",
        categoryLabel: "Core",
        icon: entry.icon,
        label: entry.label,
        searchText: `${entry.label} ${type} core`.toLowerCase(),
        teamOnly: false,
      };
    }),
  },
  ...workspaceAddBlockCategories.map((category) => ({
    id: category.id,
    label: category.label,
    items: category.items.map((item) => ({
      blockType: item.blockType,
      categoryId: category.id,
      categoryLabel: category.label,
      icon: item.icon,
      label: item.label,
      searchText: `${item.label} ${item.blockType} ${category.label}`.toLowerCase(),
      teamOnly: "teamOnly" in item && Boolean(item.teamOnly),
    })),
  })),
];

const blockLauncherItems = blockLauncherCategories.flatMap((category) => category.items);

const normalizedAddBlockLauncherSearch = computed(() =>
  addBlockLauncherSearch.value.trim().toLowerCase(),
);
const addBlockLauncherCategoryOptions = computed(() => {
  const searchTerm = normalizedAddBlockLauncherSearch.value;
  const counts = blockLauncherCategories.map((category) => ({
    id: category.id,
    label: category.label,
    count: category.items.filter((item) => matchesBlockLauncherSearch(item, searchTerm)).length,
  }));

  return [
    {
      id: "all" as const,
      label: "All",
      count: counts.reduce((total, category) => total + category.count, 0),
    },
    ...counts,
  ];
});
const filteredBlockLauncherItems = computed(() => {
  const searchTerm = normalizedAddBlockLauncherSearch.value;

  return blockLauncherItems.filter((item) => {
    const matchesCategory =
      addBlockCategoryFilter.value === "all" || item.categoryId === addBlockCategoryFilter.value;

    return matchesCategory && matchesBlockLauncherSearch(item, searchTerm);
  });
});
const addBlockQuickItems = computed(() =>
  addBlockQuickTypes
    .map((type) => blockLauncherItems.find((item) => item.blockType === type))
    .filter((item): item is WorkspaceBlockLauncherItem => Boolean(item)),
);
const filteredBlockPresetItems = computed(() => {
  const searchTerm = normalizedAddBlockLauncherSearch.value;

  if (!searchTerm) {
    return workspaceBlockPresets;
  }

  return workspaceBlockPresets.filter((preset) =>
    `${preset.label} ${preset.description}`.toLowerCase().includes(searchTerm),
  );
});
const activeBlockCategoryLabel = computed(
  () =>
    addBlockLauncherCategoryOptions.value.find(
      (category) => category.id === addBlockCategoryFilter.value,
    )?.label ?? "All",
);
const blockLauncherResultLabel = computed(() =>
  formatLauncherCount(filteredBlockLauncherItems.value.length, "block"),
);
const blockLauncherPresetResultLabel = computed(() =>
  formatLauncherCount(filteredBlockPresetItems.value.length, "starter pack"),
);

watch(addBlockLauncherOpen, (isOpen) => {
  if (isOpen) {
    return;
  }

  resetBlockLauncherState();
});

function matchesBlockLauncherSearch(item: WorkspaceBlockLauncherItem, searchTerm: string) {
  return !searchTerm || item.searchText.includes(searchTerm);
}

function resetBlockLauncherState() {
  addBlockLauncherMode.value = "blocks";
  addBlockLauncherSearch.value = "";
  addBlockCategoryFilter.value = "all";
}

function formatLauncherCount(count: number, singular: string) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function handleAddBlockSelection(blockType: WorkspaceBlock["type"]) {
  if (!props.canEditNodeContent) {
    return;
  }

  addBlockToActiveTab(blockType);
  addBlockLauncherOpen.value = false;
}

function isBlockLauncherItemDisabled(item: WorkspaceBlockLauncherItem) {
  if (!props.canEditNodeContent) {
    return true;
  }

  return false;
}

function getBlockLauncherItemReason(item: WorkspaceBlockLauncherItem) {
  void item;

  if (!props.canEditNodeContent) {
    return "Viewer role is read-only";
  }

  return null;
}

function handleAddBlockPresetSelection(presetId: WorkspaceBlockPresetId) {
  addBlockPresetToActiveTab(presetId);
  addBlockLauncherOpen.value = false;
}
</script>

<template>
  <div class="flex h-full w-full gap-0 overflow-hidden">
    <!-- Modern Sidebar -->
    <aside
      class="flex flex-col border-r border-muted/30 bg-default/40 transition-all duration-300 backdrop-blur-xl"
      :class="isSidebarOpen ? 'w-80' : 'w-0 opacity-0'"
    >
      <div class="flex flex-1 flex-col overflow-y-auto p-6">
        <!-- Node Context -->
        <div class="mb-8 space-y-4">
          <UButton
            to="/dashboard"
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-left"
            class="px-0 hover:bg-transparent"
          >
            Dashboard
          </UButton>

          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span
                class="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                :class="saveBadge.className"
              >
                {{ saveBadge.label }}
              </span>
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-highlighted">
              {{ node.title }}
            </h1>
          </div>

          <div class="rounded-2xl border border-muted/40 bg-default/70 p-3 backdrop-blur-sm">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Node Access
                </p>
                <div class="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    :class="nodeVisibilityBadgeClass"
                  >
                    {{ nodeVisibilityLabel }}
                  </span>
                  <span class="text-[11px] text-muted">Owner: {{ nodeOwnerLabel }}</span>
                  <span
                    class="inline-flex items-center rounded-full border border-muted/40 bg-default px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted"
                  >
                    Type: {{ node.nodeType }}
                  </span>
                  <span
                    v-if="activeTeamRoleLabel"
                    class="inline-flex items-center rounded-full border border-muted/40 bg-default px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted"
                  >
                    Role: {{ activeTeamRoleLabel }}
                  </span>
                  <span
                    v-if="canManageNodeSharing && nodeTeamName"
                    class="truncate text-[11px] text-muted"
                  >
                    Team: {{ nodeTeamName }}
                  </span>
                </div>
              </div>
              <UIcon name="i-lucide-shield-check" class="mt-0.5 size-4 text-muted" />
            </div>

            <div v-if="canManageNodeSharing" class="mt-2.5 flex items-center gap-2">
              <select
                v-model="nodeShareTeamIdModel"
                class="h-8 w-full rounded-xl border border-muted/40 bg-default px-2.5 text-xs text-highlighted focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!canManageNodeSharing || teams.length === 0"
              >
                <option value="" disabled>Select team</option>
                <option v-for="team in teams" :key="team.id" :value="team.id">
                  {{ team.name }} ({{ team.role }})
                </option>
              </select>
              <UButton
                size="xs"
                :color="shareToggleColor"
                :variant="shareToggleVariant"
                class="rounded-lg"
                :loading="isShareTogglePending"
                :disabled="isShareToggleDisabled"
                @click="toggleNodeSharing"
              >
                {{ shareToggleLabel }}
              </UButton>
            </div>

            <p v-else class="mt-2 text-[11px] leading-relaxed text-muted">
              Editing is allowed for your role. Only team owners can access sharing controls and
              team identifiers.
            </p>
          </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="mb-8 space-y-1">
          <p class="mb-2 px-2 text-[11px] font-bold uppercase tracking-widest text-muted/60">
            Workspaces
          </p>
          <button
            v-for="tab in node.tabs"
            :key="tab.id"
            type="button"
            class="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all"
            :class="
              tab.id === activeTabId
                ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                : 'text-toned hover:bg-elevated/50 hover:text-highlighted'
            "
            @click="setActiveTab(tab.id)"
          >
            <UIcon
              :name="tab.id === activeTabId ? 'i-lucide-folder-open' : 'i-lucide-folder'"
              class="size-4.5 shrink-0"
            />
            <span class="flex-1 truncate text-left">{{ getDisplayTabTitle(tab) }}</span>
          </button>

          <button
            type="button"
            class="mt-2 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted transition-all hover:bg-elevated/50 hover:text-highlighted"
            @click="openTabEditor('create')"
          >
            <UIcon name="i-lucide-plus" class="size-4.5" />
            <span>Add workspace</span>
          </button>
        </div>

        <!-- Quick Actions -->
        <div class="mt-auto space-y-1">
          <p class="mb-2 px-2 text-[11px] font-bold uppercase tracking-widest text-muted/60">
            Tab Options
          </p>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-store"
            class="w-full justify-start rounded-2xl"
            @click="saveActiveTabToMarketplace"
          >
            Share template
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-pencil"
            class="w-full justify-start rounded-2xl"
            @click="openTabEditor('rename')"
          >
            Rename
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            class="w-full justify-start rounded-2xl hover:text-error"
            @click="deleteActiveTab"
          >
            Delete
          </UButton>
        </div>
      </div>
    </aside>

    <!-- Main Workspace Area -->
    <main class="relative flex flex-1 flex-col overflow-hidden bg-elevated/5">
      <!-- Header/Toolbar -->
      <header
        class="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-4 border-b border-muted/20 bg-default/40 px-4 py-4 backdrop-blur-md sm:px-6"
      >
        <div class="flex items-center gap-4">
          <UButton
            color="neutral"
            variant="ghost"
            :icon="isSidebarOpen ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'"
            @click="isSidebarOpen = !isSidebarOpen"
          />
          <div class="h-4 w-px bg-muted/30" />
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-highlighted">
              {{ getDisplayTabTitle(activeTab) }}
            </span>
            <span class="text-xs text-muted"> ({{ activeTab.blocks.length }} blocks) </span>
          </div>
        </div>

        <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div class="w-full sm:w-72">
            <UInput
              v-model="blockSearch"
              icon="i-lucide-search"
              placeholder="Filter current blocks..."
              size="md"
              class="rounded-full"
              :ui="{ base: 'rounded-full bg-elevated/50' }"
            />
          </div>

          <UPopover
            v-if="canEditNodeContent"
            v-model:open="addBlockLauncherOpen"
            :content="{ align: 'end', side: 'bottom', sideOffset: 12 }"
            :ui="{
              content: [
                'w-[calc(100vw-1.5rem)] max-w-[58rem] overflow-hidden rounded-[30px]',
                'border border-muted/60 bg-default/95 p-0 shadow-2xl shadow-primary/10 backdrop-blur-2xl',
              ],
            }"
          >
            <UButton
              color="primary"
              icon="i-lucide-plus"
              class="h-11 justify-center rounded-full px-5 shadow-lg shadow-primary/20"
            >
              Add Block
            </UButton>

            <template #content>
              <div class="flex max-h-[75vh] flex-col">
                <div class="border-b border-muted/40 bg-elevated/20 p-5">
                  <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div class="space-y-2">
                      <div
                        class="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary"
                      >
                        <UIcon name="i-lucide-sparkles" class="size-3.5" />
                        Block launcher
                      </div>

                      <div class="space-y-1">
                        <p class="text-lg font-semibold text-highlighted">
                          Insert one block or start with a pack
                        </p>
                        <p class="max-w-2xl text-sm leading-6 text-toned">
                          Quick picks keep the common actions one click away. Search and category
                          filters handle the long tail without the giant dropdown.
                        </p>
                      </div>
                    </div>

                    <div class="w-full max-w-sm">
                      <UInput
                        v-model="addBlockLauncherSearch"
                        autofocus
                        icon="i-lucide-search"
                        :placeholder="
                          addBlockLauncherMode === 'blocks'
                            ? 'Search blocks or categories...'
                            : 'Search starter packs...'
                        "
                        class="rounded-full"
                        :ui="{ base: 'rounded-full bg-default/80' }"
                      />
                    </div>
                  </div>

                  <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <UTabs
                      v-model="addBlockLauncherMode"
                      :content="false"
                      :items="addBlockLauncherTabs"
                      size="sm"
                      variant="pill"
                    />

                    <UBadge color="neutral" variant="soft" size="sm">
                      {{
                        addBlockLauncherMode === "blocks"
                          ? blockLauncherResultLabel
                          : blockLauncherPresetResultLabel
                      }}
                    </UBadge>
                  </div>
                </div>

                <div class="min-h-0 flex-1 overflow-y-auto p-5">
                  <div v-if="addBlockLauncherMode === 'blocks'" class="space-y-5">
                    <section
                      v-if="!addBlockLauncherSearch && addBlockCategoryFilter === 'all'"
                      class="space-y-3"
                    >
                      <div class="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p class="text-sm font-semibold text-highlighted">Most used</p>
                          <p class="mt-1 text-sm text-muted">
                            Common starting points for a fresh workspace tab.
                          </p>
                        </div>

                        <UBadge color="primary" variant="soft" size="sm">
                          One click quick add
                        </UBadge>
                      </div>

                      <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        <button
                          v-for="item in addBlockQuickItems"
                          :key="item.blockType"
                          type="button"
                          class="group flex items-center justify-between gap-3 rounded-2xl border border-muted/60 bg-default/80 px-4 py-3 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:border-primary/30 enabled:hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                          :disabled="isBlockLauncherItemDisabled(item)"
                          :title="getBlockLauncherItemReason(item) ?? undefined"
                          @click="handleAddBlockSelection(item.blockType)"
                        >
                          <div class="flex min-w-0 items-center gap-3">
                            <span
                              class="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary"
                            >
                              <UIcon :name="item.icon" class="size-5" />
                            </span>

                            <div class="min-w-0">
                              <p class="truncate text-sm font-semibold text-highlighted">
                                {{ item.label }}
                              </p>
                              <p class="text-xs text-muted">{{ item.categoryLabel }}</p>
                              <p
                                v-if="getBlockLauncherItemReason(item)"
                                class="text-[11px] text-warning"
                              >
                                {{ getBlockLauncherItemReason(item) }}
                              </p>
                            </div>
                          </div>

                          <UIcon
                            name="i-lucide-arrow-up-right"
                            class="size-4 shrink-0 text-muted transition group-hover:text-primary"
                          />
                        </button>
                      </div>
                    </section>

                    <section class="space-y-3">
                      <div class="flex flex-wrap gap-2">
                        <button
                          v-for="category in addBlockLauncherCategoryOptions"
                          :key="category.id"
                          type="button"
                          class="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition"
                          :class="
                            addBlockCategoryFilter === category.id
                              ? 'border-primary/30 bg-primary/10 text-primary'
                              : 'border-muted/60 bg-default/80 text-toned hover:border-muted hover:bg-elevated/60 hover:text-highlighted'
                          "
                          :disabled="category.count === 0"
                          @click="addBlockCategoryFilter = category.id"
                        >
                          <span>{{ category.label }}</span>
                          <span
                            class="rounded-full bg-default/80 px-2 py-0.5 text-[11px] font-semibold text-muted"
                          >
                            {{ category.count }}
                          </span>
                        </button>
                      </div>

                      <div class="flex items-center justify-between gap-3">
                        <div>
                          <p class="text-sm font-semibold text-highlighted">
                            {{ activeBlockCategoryLabel }}
                          </p>
                          <p class="mt-1 text-sm text-muted">
                            {{ blockLauncherResultLabel }} ready to insert.
                          </p>
                        </div>

                        <UButton
                          v-if="addBlockLauncherSearch || addBlockCategoryFilter !== 'all'"
                          color="neutral"
                          variant="ghost"
                          class="rounded-full"
                          @click="resetBlockLauncherState"
                        >
                          Reset
                        </UButton>
                      </div>

                      <div
                        v-if="filteredBlockLauncherItems.length > 0"
                        class="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
                      >
                        <button
                          v-for="item in filteredBlockLauncherItems"
                          :key="item.blockType"
                          type="button"
                          class="group flex items-start justify-between gap-3 rounded-[24px] border border-muted/60 bg-elevated/15 p-4 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:border-primary/30 enabled:hover:bg-default disabled:cursor-not-allowed disabled:opacity-50"
                          :disabled="isBlockLauncherItemDisabled(item)"
                          :title="getBlockLauncherItemReason(item) ?? undefined"
                          @click="handleAddBlockSelection(item.blockType)"
                        >
                          <div class="flex min-w-0 items-start gap-3">
                            <span
                              class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary"
                            >
                              <UIcon :name="item.icon" class="size-5" />
                            </span>

                            <div class="min-w-0">
                              <p class="truncate text-sm font-semibold text-highlighted">
                                {{ item.label }}
                              </p>
                              <p
                                class="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                              >
                                {{ item.categoryLabel }}
                              </p>
                              <p
                                v-if="getBlockLauncherItemReason(item)"
                                class="mt-1 text-[11px] text-warning"
                              >
                                {{ getBlockLauncherItemReason(item) }}
                              </p>
                            </div>
                          </div>

                          <UIcon
                            name="i-lucide-plus"
                            class="mt-1 size-4 shrink-0 text-muted transition group-hover:scale-110 group-hover:text-primary"
                          />
                        </button>
                      </div>

                      <div
                        v-else
                        class="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-muted/60 bg-elevated/15 px-6 py-12 text-center"
                      >
                        <UIcon name="i-lucide-search-x" class="mb-4 size-10 text-muted" />
                        <p class="text-base font-semibold text-highlighted">No matching blocks</p>
                        <p class="mt-2 max-w-sm text-sm leading-6 text-muted">
                          Try a different term or switch categories. The launcher keeps the long
                          list chunked so you do not have to scan the whole catalog.
                        </p>
                        <UButton
                          color="neutral"
                          variant="soft"
                          class="mt-5 rounded-full"
                          @click="resetBlockLauncherState"
                        >
                          Clear filters
                        </UButton>
                      </div>
                    </section>
                  </div>

                  <div v-else class="space-y-4">
                    <div class="rounded-[28px] border border-primary/15 bg-primary/10 p-4">
                      <div class="flex items-start gap-3">
                        <span
                          class="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-default/80 text-primary"
                        >
                          <UIcon name="i-lucide-layout-template" class="size-5" />
                        </span>

                        <div>
                          <p class="text-sm font-semibold text-highlighted">Starter packs</p>
                          <p class="mt-1 text-sm leading-6 text-toned">
                            Insert a coordinated set of blocks when you want the structure done for
                            you in one step.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      v-if="filteredBlockPresetItems.length > 0"
                      class="grid gap-3 xl:grid-cols-2"
                    >
                      <button
                        v-for="preset in filteredBlockPresetItems"
                        :key="preset.id"
                        type="button"
                        class="group rounded-[26px] border border-muted/60 bg-elevated/15 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-default"
                        @click="handleAddBlockPresetSelection(preset.id)"
                      >
                        <div class="flex items-start justify-between gap-3">
                          <div class="flex min-w-0 items-start gap-3">
                            <span
                              class="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary"
                            >
                              <UIcon :name="preset.icon" class="size-5" />
                            </span>

                            <div class="min-w-0">
                              <div class="flex flex-wrap items-center gap-2">
                                <p class="text-sm font-semibold text-highlighted">
                                  {{ preset.label }}
                                </p>
                                <UBadge color="neutral" variant="soft" size="sm">Pack</UBadge>
                              </div>
                              <p class="mt-2 text-sm leading-6 text-toned">
                                {{ preset.description }}
                              </p>
                            </div>
                          </div>

                          <UIcon
                            name="i-lucide-arrow-right"
                            class="mt-1 size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary"
                          />
                        </div>
                      </button>
                    </div>

                    <div
                      v-else
                      class="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-muted/60 bg-elevated/15 px-6 py-12 text-center"
                    >
                      <UIcon name="i-lucide-search-x" class="mb-4 size-10 text-muted" />
                      <p class="text-base font-semibold text-highlighted">
                        No starter packs match your search
                      </p>
                      <UButton
                        color="neutral"
                        variant="soft"
                        class="mt-5 rounded-full"
                        @click="addBlockLauncherSearch = ''"
                      >
                        Clear search
                      </UButton>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </UPopover>

          <div v-else class="flex flex-col items-end gap-1">
            <UButton
              color="neutral"
              icon="i-lucide-lock"
              class="h-11 justify-center rounded-full px-5"
              disabled
            >
              Add Block
            </UButton>
            <p class="text-[11px] text-muted">Viewer role is read-only for this node.</p>
          </div>
        </div>
      </header>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-8 lg:p-12">
        <div class="mx-auto w-full max-w-7xl space-y-8">
          <!-- Legacy Alert -->
          <UAlert
            v-if="node.customBlockTemplates.length > 0"
            color="warning"
            variant="soft"
            icon="i-lucide-shapes"
            title="Legacy custom templates detected"
            description="This node still contains legacy form templates."
            class="rounded-3xl border-warning/20"
          />

          <!-- Empty State -->
          <div
            v-if="activeTab.blocks.length === 0"
            class="flex flex-col items-center justify-center rounded-[40px] border border-dashed border-muted/50 bg-default/40 py-24 text-center"
          >
            <div
              class="mb-6 flex size-20 items-center justify-center rounded-3xl bg-primary/10 text-primary"
            >
              <UIcon name="i-lucide-layers" class="size-10" />
            </div>
            <h3 class="mb-2 text-xl font-bold text-highlighted">
              Your workspace is a blank canvas
            </h3>
            <p class="mb-8 max-w-xs text-toned">
              Add your first block to start organizing your thoughts and tasks.
            </p>

            <div v-if="canEditNodeContent" class="flex flex-wrap justify-center gap-3">
              <UButton
                v-for="type in primaryBlockTypes"
                :key="type"
                color="primary"
                variant="soft"
                class="rounded-2xl px-4 py-2.5"
                :icon="getWorkspaceBlockRegistryEntry(type).icon"
                @click="addBlockToActiveTab(type)"
              >
                {{ getWorkspaceBlockRegistryEntry(type).label }}
              </UButton>

              <UButton
                color="neutral"
                variant="soft"
                icon="i-lucide-layout-grid"
                class="rounded-2xl px-4 py-2.5"
                @click="addBlockLauncherOpen = true"
              >
                Browse all blocks
              </UButton>
            </div>

            <p v-else class="max-w-xs text-sm text-muted">
              Your role can view this shared node but cannot add blocks.
            </p>
          </div>

          <!-- Filtered Empty State -->
          <div
            v-else-if="visibleBlocks.length === 0"
            class="rounded-[40px] border border-dashed border-muted/50 bg-default/40 py-20 text-center"
          >
            <UIcon name="i-lucide-search-x" class="mx-auto mb-4 size-12 text-muted" />
            <p class="text-lg font-bold text-highlighted">No blocks match your search</p>
            <UButton color="neutral" variant="link" @click="blockSearch = ''">
              Clear search
            </UButton>
          </div>

          <!-- Blocks List -->
          <div v-else class="space-y-10">
            <WorkspaceNodeBlockRenderer
              v-for="block in visibleBlocks"
              :key="block.id"
              :block="block"
              :tab-id="activeTab.id"
            />
          </div>
        </div>
      </div>

      <!-- Footer / Save Error -->
      <div v-if="saveError" class="p-6">
        <UAlert
          color="error"
          variant="soft"
          icon="i-lucide-cloud-off"
          title="Changes not saved"
          :description="saveError"
          class="rounded-3xl"
        />
      </div>
    </main>

    <!-- Modals -->
    <UModal
      :open="tabEditor.open"
      :title="tabEditor.mode === 'create' ? 'Create workspace' : 'Rename workspace'"
      :ui="{
        content: 'sm:max-w-md rounded-[32px] overflow-hidden',
        body: 'space-y-4 p-8',
        footer: 'flex items-center justify-end gap-3 p-6 bg-elevated/20',
      }"
      @update:open="(value) => !value && closeTabEditor()"
    >
      <template #body>
        <UFormField label="Workspace name">
          <UInput
            :model-value="tabEditor.title"
            autofocus
            placeholder="e.g. Design System"
            size="xl"
            class="rounded-2xl"
            @update:model-value="tabEditor.title = $event ?? ''"
          />
        </UFormField>
      </template>

      <template #footer>
        <UButton color="neutral" variant="ghost" class="rounded-xl" @click="closeTabEditor"
          >Cancel</UButton
        >
        <UButton
          color="primary"
          icon="i-lucide-save"
          class="rounded-xl px-6"
          @click="submitTabEditor"
        >
          {{ tabEditor.mode === "create" ? "Create" : "Save" }}
        </UButton>
      </template>
    </UModal>
  </div>
</template>
