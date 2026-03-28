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
})) satisfies Array<{ label: string; value: WorkspaceContentPlatform }>;

const columnConfigs: Array<{
  status: WorkspaceContentPipelineStatus;
  className: string;
  dotClass: string;
}> = [
  {
    status: "ideas",
    className: "border-muted/35 bg-elevated/30",
    dotClass: "bg-muted",
  },
  {
    status: "draft",
    className: "border-warning/35 bg-warning/5",
    dotClass: "bg-warning",
  },
  {
    status: "review",
    className: "border-primary/35 bg-primary/5",
    dotClass: "bg-primary",
  },
  {
    status: "approved",
    className: "border-success/35 bg-success/5",
    dotClass: "bg-success",
  },
  {
    status: "published",
    className: "border-secondary/35 bg-secondary/10",
    dotClass: "bg-secondary",
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
  <div class="space-y-6">
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">
          Total Pieces
        </p>
        <p class="mt-2 text-4xl font-black tracking-tight text-primary">
          {{ summary.totalItems }}
        </p>
        <p class="mt-1 text-sm text-muted">All content currently moving through the pipeline</p>
      </div>

      <div class="rounded-[28px] bg-warning/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-warning/70">
          Review Queue
        </p>
        <p class="mt-2 text-4xl font-black tracking-tight text-warning">
          {{ summary.reviewCount }}
        </p>
        <p class="mt-1 text-sm text-muted">Pieces waiting on feedback or approval</p>
      </div>

      <div class="rounded-[28px] bg-success/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-success/70">
          Published
        </p>
        <p class="mt-2 text-4xl font-black tracking-tight text-success">
          {{ summary.publishedCount }}
        </p>
        <p class="mt-1 text-sm text-muted">Content already out in the market</p>
      </div>

      <div class="rounded-[28px] bg-secondary/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary/80">
          Top Platform
        </p>
        <p class="mt-2 text-3xl font-black tracking-tight text-secondary">
          {{ getTopPlatformLabel() }}
        </p>
        <p class="mt-1 text-sm text-muted">Most active publishing lane right now</p>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Five-stage publishing flow</p>
        <p class="text-sm text-muted">
          Drag pieces between stages, keep platform ownership visible, and surface review bottlenecks.
        </p>
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        class="rounded-full px-4"
        @click="addItem"
      >
        New
      </UButton>
    </div>

    <div class="grid gap-4 xl:grid-cols-5 md:grid-cols-2">
      <section
        v-for="column in columnConfigs"
        :key="column.status"
        class="rounded-[30px] border p-4 transition-all duration-200"
        :class="[
          column.className,
          dragOverStatus === column.status ? 'ring-2 ring-primary/20 shadow-lg shadow-black/5' : '',
        ]"
        @dragover="onColumnDragOver(column.status, $event)"
        @dragleave="onColumnDragLeave(column.status, $event)"
        @drop="onColumnDrop(column.status, $event)"
      >
        <div class="mb-4 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="size-2.5 rounded-full" :class="column.dotClass" />
              <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">
                {{ workspaceContentPipelineStatusLabels[column.status] }}
              </p>
            </div>
            <p class="mt-2 text-2xl font-black tracking-tight text-highlighted">
              {{ itemsByStatus[column.status]?.length ?? 0 }}
            </p>
          </div>
        </div>

        <div
          v-if="(itemsByStatus[column.status]?.length ?? 0) === 0"
          class="rounded-[24px] border border-dashed border-muted/40 bg-default/40 px-4 py-8 text-center"
        >
          <p class="text-sm font-semibold text-muted">
            No pieces in {{ workspaceContentPipelineStatusLabels[column.status].toLowerCase() }}.
          </p>
        </div>

        <div v-else class="space-y-3">
          <article
            v-for="item in itemsByStatus[column.status]"
            :key="item.id"
            class="rounded-[24px] border border-muted/30 bg-default/75 p-4 shadow-sm transition-all"
            :class="
              draggingItemId === item.id
                ? 'pointer-events-none scale-95 opacity-40 grayscale'
                : 'cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-lg hover:shadow-black/5'
            "
            draggable="true"
            @dragstart="onItemDragStart(item.id, $event)"
            @dragend="clearDragState"
          >
            <div class="flex items-start gap-3">
              <div class="min-w-0 flex-1">
                <UInput
                  :model-value="item.title"
                  variant="none"
                  placeholder="Untitled content piece"
                  class="w-full"
                  :ui="{ base: 'px-0 text-sm font-bold text-highlighted placeholder:text-muted/60' }"
                  @update:model-value="
                    mutateItem(item.id, (entry) => {
                      entry.title = ($event ?? '').slice(0, 240);
                    })
                  "
                />
              </div>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="xs"
                class="rounded-lg hover:bg-error/10 hover:text-error"
                @click="removeItem(item.id)"
              />
            </div>

            <div class="mt-4 flex flex-wrap items-center gap-2">
              <USelect
                :model-value="item.platform"
                :items="platformOptions"
                size="xs"
                class="min-w-[6.5rem] rounded-full"
                @update:model-value="
                  mutateItem(item.id, (entry) => {
                    entry.platform = ($event as WorkspaceContentPlatform | undefined) ?? 'instagram';
                  })
                "
              />

              <UInput
                :model-value="item.assignee"
                size="xs"
                icon="i-lucide-user"
                placeholder="Assignee"
                class="min-w-[7rem] flex-1 rounded-full"
                @update:model-value="
                  mutateItem(item.id, (entry) => {
                    entry.assignee = ($event ?? '').slice(0, 120);
                  })
                "
              />
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
