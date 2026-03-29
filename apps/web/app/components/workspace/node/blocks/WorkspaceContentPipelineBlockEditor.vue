<script setup lang="ts">
import {
  WORKSPACE_CONTENT_PIPELINE_STATUSES,
  WORKSPACE_CONTENT_PLATFORMS,
  createWorkspaceContentPipelineItem,
  getContentPipelineSummary,
  workspaceContentPipelineStatusLabels,
  workspaceContentPlatformLabels,
  type WorkspaceContentPipelineBlock,
  type WorkspaceContentPipelineStatus,
  type WorkspaceContentPlatform,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceContentPipelineBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getContentPipelineSummary(props.block));
const platformOptions = WORKSPACE_CONTENT_PLATFORMS.map((platform) => ({
  label: workspaceContentPlatformLabels[platform],
  value: platform,
  icon: getPlatformIcon(platform),
})) satisfies Array<{ label: string; value: WorkspaceContentPlatform; icon: string }>;

function getPlatformIcon(platform: WorkspaceContentPlatform) {
  switch (platform) {
    case "instagram":
      return "i-simple-icons-instagram";
    case "linkedin":
      return "i-simple-icons-linkedin";
    case "twitter":
      return "i-simple-icons-x";
    case "youtube":
      return "i-simple-icons-youtube";
    case "tiktok":
      return "i-simple-icons-tiktok";
    case "facebook":
      return "i-simple-icons-facebook";
    default:
      return "i-lucide-share-2";
  }
}

const columnConfigs: Array<{
  status: WorkspaceContentPipelineStatus;
  className: string;
  dotClass: string;
  icon: string;
}> = [
  {
    status: "ideas",
    className: "border-muted/10 bg-muted/5",
    dotClass: "bg-muted/60",
    icon: "i-lucide-lightbulb",
  },
  {
    status: "draft",
    className: "border-warning/10 bg-warning/5",
    dotClass: "bg-warning",
    icon: "i-lucide-pencil-line",
  },
  {
    status: "review",
    className: "border-primary/10 bg-primary/5",
    dotClass: "bg-primary",
    icon: "i-lucide-eye",
  },
  {
    status: "approved",
    className: "border-success/10 bg-success/5",
    dotClass: "bg-success",
    icon: "i-lucide-check-circle-2",
  },
  {
    status: "published",
    className: "border-secondary/10 bg-secondary/5",
    dotClass: "bg-secondary",
    icon: "i-lucide-rocket",
  },
];

const itemsByStatus = computed(
  () =>
    Object.fromEntries(
      WORKSPACE_CONTENT_PIPELINE_STATUSES.map((status) => [
        status,
        props.block.items.filter((item) => item.status === status),
      ]),
    ) as Record<WorkspaceContentPipelineStatus, WorkspaceContentPipelineBlock["items"]>,
);
const draggingItemId = ref<string | null>(null);
const dragOverStatus = ref<WorkspaceContentPipelineStatus | null>(null);

function addItem() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "content-pipeline") {
      return;
    }

    block.items.unshift(
      createWorkspaceContentPipelineItem({
        title: "",
        status: "ideas",
      }),
    );
  });
}

function mutateItem(
  itemId: string,
  mutator: (item: WorkspaceContentPipelineBlock["items"][number]) => void,
) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "content-pipeline") {
      return;
    }

    const target = block.items.find((candidate) => candidate.id === itemId);

    if (!target) {
      return;
    }

    mutator(target);
  });
}

function moveItem(itemId: string, status: WorkspaceContentPipelineStatus) {
  mutateItem(itemId, (item) => {
    item.status = status;
  });
}

function onItemDragStart(itemId: string, event: DragEvent) {
  draggingItemId.value = itemId;

  if (!event.dataTransfer) {
    return;
  }

  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("application/x-workspace-content-item", itemId);
  event.dataTransfer.setData("text/plain", itemId);
}

function clearDragState() {
  draggingItemId.value = null;
  dragOverStatus.value = null;
}

function onColumnDragOver(status: WorkspaceContentPipelineStatus, event: DragEvent) {
  if (!draggingItemId.value) {
    return;
  }

  event.preventDefault();

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  dragOverStatus.value = status;
}

function onColumnDragLeave(status: WorkspaceContentPipelineStatus, event: DragEvent) {
  const currentTarget = event.currentTarget;
  const nextTarget = event.relatedTarget;

  if (
    currentTarget instanceof HTMLElement &&
    nextTarget instanceof Node &&
    currentTarget.contains(nextTarget)
  ) {
    return;
  }

  if (dragOverStatus.value === status) {
    dragOverStatus.value = null;
  }
}

function onColumnDrop(status: WorkspaceContentPipelineStatus, event: DragEvent) {
  event.preventDefault();
  const itemId =
    draggingItemId.value ||
    event.dataTransfer?.getData("application/x-workspace-content-item") ||
    "";

  if (!itemId) {
    clearDragState();
    return;
  }

  moveItem(itemId, status);
  clearDragState();
}

function removeItem(itemId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "content-pipeline") {
      return;
    }

    block.items = block.items.filter((item) => item.id !== itemId);
  });
}

function getTopPlatformLabel() {
  return summary.value.topPlatform
    ? workspaceContentPlatformLabels[summary.value.topPlatform]
    : "None";
}
</script>

<template>
  <div class="space-y-8">
    <!-- Summary Metrics -->
    <div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <div class="group relative overflow-hidden rounded-[24px] bg-elevated/5 p-5 border border-muted/10 transition-all hover:bg-elevated/10">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/50">
              Total Pieces
            </p>
            <p class="mt-2 text-3xl font-black tracking-tight text-highlighted">
              {{ summary.totalItems }}
            </p>
          </div>
          <div class="size-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <UIcon name="i-lucide-layers" class="size-5 text-primary" />
          </div>
        </div>
        <p class="mt-4 text-xs text-muted/60 leading-relaxed">Active items in pipeline</p>
      </div>

      <div class="group relative overflow-hidden rounded-[24px] bg-elevated/5 p-5 border border-muted/10 transition-all hover:bg-elevated/10">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/50">
              Review Queue
            </p>
            <p class="mt-2 text-3xl font-black tracking-tight text-highlighted">
              {{ summary.reviewCount }}
            </p>
          </div>
          <div class="size-10 rounded-2xl bg-warning/10 flex items-center justify-center">
            <UIcon name="i-lucide-clipboard-check" class="size-5 text-warning" />
          </div>
        </div>
        <p class="mt-4 text-xs text-muted/60 leading-relaxed">Awaiting approval</p>
      </div>

      <div class="group relative overflow-hidden rounded-[24px] bg-elevated/5 p-5 border border-muted/10 transition-all hover:bg-elevated/10">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/50">Published</p>
            <p class="mt-2 text-3xl font-black tracking-tight text-highlighted">
              {{ summary.publishedCount }}
            </p>
          </div>
          <div class="size-10 rounded-2xl bg-success/10 flex items-center justify-center">
            <UIcon name="i-lucide-rocket" class="size-5 text-success" />
          </div>
        </div>
        <p class="mt-4 text-xs text-muted/60 leading-relaxed">Live content pieces</p>
      </div>

      <div class="group relative overflow-hidden rounded-[24px] bg-elevated/5 p-5 border border-muted/10 transition-all hover:bg-elevated/10">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/50">
              Top Platform
            </p>
            <p class="mt-2 text-3xl font-black tracking-tight text-highlighted">
              {{ summary.topPlatform ? summary.topPlatform.slice(0, 3).toUpperCase() : 'N/A' }}
            </p>
          </div>
          <div class="size-10 rounded-2xl bg-secondary/10 flex items-center justify-center">
            <UIcon :name="summary.topPlatform ? getPlatformIcon(summary.topPlatform) : 'i-lucide-trending-up'" class="size-5 text-secondary" />
          </div>
        </div>
        <p class="mt-4 text-xs text-muted/60 leading-relaxed">{{ getTopPlatformLabel() }}</p>
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="flex flex-wrap items-center justify-between gap-4 px-1">
      <div class="space-y-1">
        <h3 class="text-base font-bold text-highlighted">Content Pipeline</h3>
        <p class="text-xs text-muted">
          Drag and drop items to update their publishing status.
        </p>
      </div>

      <UButton
        color="primary"
        variant="solid"
        icon="i-lucide-plus"
        class="rounded-full px-5 py-2.5 font-bold shadow-lg shadow-primary/20"
        @click="addItem"
      >
        New Piece
      </UButton>
    </div>

    <!-- Pipeline Board -->
    <div class="overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin scrollbar-thumb-muted/20 snap-x snap-mandatory">
      <div class="flex gap-6">
        <section
          v-for="column in columnConfigs"
          :key="column.status"
          class="flex flex-col flex-shrink-0 w-[300px] snap-start rounded-[32px] border p-4 transition-all duration-300"
          :class="[
            column.className,
            dragOverStatus === column.status ? 'ring-2 ring-primary/30 brightness-110 shadow-xl' : '',
          ]"
          @dragover="onColumnDragOver(column.status, $event)"
          @dragleave="onColumnDragLeave(column.status, $event)"
          @drop="onColumnDrop(column.status, $event)"
        >
          <!-- Column Header -->
          <div class="p-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="size-8 rounded-xl bg-default/80 flex items-center justify-center border border-muted/10 shadow-sm">
                <UIcon :name="column.icon" class="size-4" :class="column.dotClass.replace('bg-', 'text-')" />
              </div>
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-muted/50 leading-none">
                  {{ workspaceContentPipelineStatusLabels[column.status] }}
                </p>
                <p class="mt-1 text-xs font-bold text-highlighted/60 leading-none">
                  {{ itemsByStatus[column.status]?.length ?? 0 }} items
                </p>
              </div>
            </div>
          </div>

          <!-- Items Container -->
          <div class="flex-1 space-y-3 p-2 min-h-[400px]">
            <article
              v-for="item in itemsByStatus[column.status]"
              :key="item.id"
              class="group relative rounded-[24px] border border-muted/10 bg-default/80 p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md hover:bg-default"
              :class="
                draggingItemId === item.id
                  ? 'pointer-events-none scale-95 opacity-40 grayscale'
                  : 'cursor-grab active:cursor-grabbing'
              "
              draggable="true"
              @dragstart="onItemDragStart(item.id, $event)"
              @dragend="clearDragState"
            >
              <!-- Card Header -->
              <div class="flex items-start gap-2">
                <UTextarea
                  :model-value="item.title"
                  variant="none"
                  placeholder="Untitled content piece"
                  class="flex-1"
                  autoresize
                  :rows="1"
                  :ui="{
                    base: 'p-0 text-sm font-bold text-highlighted placeholder:text-muted/30 focus:ring-0',
                  }"
                  @update:model-value="
                    mutateItem(item.id, (entry) => {
                      entry.title = ($event ?? '').slice(0, 240);
                    })
                  "
                />

                <UDropdownMenu
                  :items="[[{ label: 'Remove', icon: 'i-lucide-trash', color: 'error', onSelect: () => removeItem(item.id) }]]"
                  :ui="{ content: 'w-32 rounded-xl' }"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-more-horizontal"
                    size="xs"
                    class="rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </UDropdownMenu>
              </div>

              <!-- Card Meta -->
              <div class="mt-4 flex flex-wrap items-center gap-2">
                <USelectMenu
                  :model-value="item.platform"
                  :items="platformOptions"
                  value-attribute="value"
                  size="xs"
                  class="w-[110px]"
                  :ui-menu="{ base: 'rounded-xl' }"
                  :ui="{ base: 'rounded-full bg-elevated/5 border-muted/10' }"
                  @update:model-value="
                    mutateItem(item.id, (entry) => {
                      entry.platform =
                        ($event as WorkspaceContentPlatform | undefined) ?? 'instagram';
                    })
                  "
                >
                  <template #leading>
                    <UIcon :name="getPlatformIcon(item.platform)" class="size-3.5" />
                  </template>
                </USelectMenu>

                <div class="flex-1 min-w-0">
                  <UInput
                    :model-value="item.assignee"
                    size="xs"
                    icon="i-lucide-user"
                    placeholder="Assignee"
                    class="w-full"
                    :ui="{ base: 'rounded-full bg-elevated/5 border-muted/10' }"
                    @update:model-value="
                      mutateItem(item.id, (entry) => {
                        entry.assignee = ($event ?? '').slice(0, 120);
                      })
                    "
                  />
                </div>
              </div>
            </article>

            <!-- Empty State -->
            <div
              v-if="(itemsByStatus[column.status]?.length ?? 0) === 0"
              class="h-full flex flex-col items-center justify-center border-2 border-dashed border-muted/5 rounded-[24px] bg-default/10 p-6 text-center"
            >
              <div class="size-10 rounded-full bg-muted/5 flex items-center justify-center mb-2">
                <UIcon :name="column.icon" class="size-5 text-muted/20" />
              </div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-muted/30">
                No {{ column.status }}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

