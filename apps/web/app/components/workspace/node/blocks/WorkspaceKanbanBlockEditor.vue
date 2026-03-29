<script setup lang="ts">
import type { WorkspaceKanbanBlock } from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceKanbanBlock;
  tabId: string;
}>();

const {
  addKanbanColumn,
  mutateKanbanColumn,
  removeKanbanColumn,
  addKanbanCard,
  mutateKanbanCard,
  moveKanbanCard,
  removeKanbanCard,
} = useWorkspaceNodeEditorContext();

const cardsByColumn = computed(() =>
  Object.fromEntries(
    props.block.columns.map((column) => [
      column.id,
      props.block.cards.filter((card) => card.columnId === column.id),
    ]),
  ),
);

function canRemoveColumn() {
  return props.block.columns.length > 1;
}

const draggingCardId = ref<string | null>(null);
const dragOverColumnId = ref<string | null>(null);
const expandedCardId = ref<string | null>(null);

function toggleCard(cardId: string) {
  expandedCardId.value = expandedCardId.value === cardId ? null : cardId;
}

function onCardDragStart(cardId: string, event: DragEvent) {
  draggingCardId.value = cardId;
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("application/x-workspace-kanban-card", cardId);
  event.dataTransfer.setData("text/plain", cardId);
}

function clearDragState() {
  draggingCardId.value = null;
  dragOverColumnId.value = null;
}

function onColumnDragOver(columnId: string, event: DragEvent) {
  if (!draggingCardId.value) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  dragOverColumnId.value = columnId;
}

function onColumnDragLeave(columnId: string, event: DragEvent) {
  const currentTarget = event.currentTarget;
  const nextTarget = event.relatedTarget;
  if (
    currentTarget instanceof HTMLElement &&
    nextTarget instanceof Node &&
    currentTarget.contains(nextTarget)
  )
    return;
  if (dragOverColumnId.value === columnId) dragOverColumnId.value = null;
}

function onColumnDrop(columnId: string, event: DragEvent) {
  event.preventDefault();
  const cardId =
    draggingCardId.value ||
    event.dataTransfer?.getData("application/x-workspace-kanban-card") ||
    "";
  if (!cardId) {
    clearDragState();
    return;
  }
  moveKanbanCard(props.tabId, props.block.id, cardId, columnId);
  clearDragState();
}
</script>

<template>
  <div class="space-y-6">
    <!-- Board Header -->
    <div class="flex items-center justify-between px-2">
      <div class="space-y-1">
        <h3 class="text-sm font-bold uppercase tracking-widest text-muted/60">Flow Board</h3>
        <p class="text-xs text-muted/40">Drag cards to advance workflow</p>
      </div>
      <UButton
        color="primary"
        variant="soft"
        size="sm"
        icon="i-lucide-plus"
        class="rounded-full px-4"
        @click="addKanbanColumn(tabId, block.id)"
      >
        Add Column
      </UButton>
    </div>

    <!-- Horizontal Scroll Container -->
    <div class="flex gap-6 overflow-x-auto pb-6 -mx-2 px-2 scrollbar-hide">
      <section
        v-for="column in block.columns"
        :key="column.id"
        class="flex min-w-[320px] max-w-[320px] flex-col rounded-[32px] border border-muted/20 bg-elevated/5 p-4 transition-all duration-300"
        :class="dragOverColumnId === column.id ? 'bg-primary/5 ring-2 ring-primary/20' : ''"
        @dragover="onColumnDragOver(column.id, $event)"
        @dragleave="onColumnDragLeave(column.id, $event)"
        @drop="onColumnDrop(column.id, $event)"
      >
        <!-- Column Header -->
        <div class="mb-4 flex items-center justify-between px-2">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="size-2 rounded-full bg-primary/40 shrink-0" />
            <UInput
              :model-value="column.title"
              variant="none"
              class="flex-1"
              :ui="{
                base: 'px-0 font-black text-highlighted placeholder:text-muted/30 uppercase tracking-tighter',
              }"
              @update:model-value="
                mutateKanbanColumn(
                  tabId,
                  block.id,
                  column.id,
                  (entry) => (entry.title = ($event ?? '').slice(0, 80)),
                )
              "
            />
            <span class="text-[10px] font-bold text-muted/40">{{
              cardsByColumn[column.id]?.length || 0
            }}</span>
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-trash-2"
            class="rounded-lg opacity-0 hover:text-error transition-opacity hover:bg-error/10"
            :class="{ 'opacity-100': canRemoveColumn() }"
            :disabled="!canRemoveColumn()"
            @click="removeKanbanColumn(tabId, block.id, column.id)"
          />
        </div>

        <!-- Cards List -->
        <div class="flex-1 space-y-3">
          <article
            v-for="card in cardsByColumn[column.id] ?? []"
            :key="card.id"
            class="group relative flex flex-col rounded-2xl border border-muted/20 bg-default/60 p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-black/5"
            :class="[
              draggingCardId === card.id
                ? 'opacity-40 grayscale pointer-events-none scale-95'
                : 'cursor-grab active:cursor-grabbing',
              expandedCardId === card.id ? 'ring-2 ring-primary/20 bg-default' : '',
            ]"
            draggable="true"
            @dragstart="onCardDragStart(card.id, $event)"
            @dragend="clearDragState"
          >
            <div class="flex items-start gap-3">
              <UCheckbox
                v-if="expandedCardId !== card.id"
                :model-value="false"
                class="mt-1"
                disabled
              />

              <div class="flex-1 min-w-0" @click="toggleCard(card.id)">
                <UInput
                  :model-value="card.title"
                  variant="none"
                  placeholder="Task title..."
                  class="w-full"
                  :ui="{ base: 'px-0 py-0 font-bold text-highlighted text-sm leading-tight' }"
                  @update:model-value="
                    mutateKanbanCard(
                      tabId,
                      block.id,
                      card.id,
                      (entry) => (entry.title = ($event ?? '').slice(0, 240)),
                    )
                  "
                />
                <p
                  v-if="card.description && expandedCardId !== card.id"
                  class="mt-1 truncate text-xs text-muted/60"
                >
                  {{ card.description }}
                </p>
              </div>

              <UButton
                v-if="expandedCardId !== card.id"
                color="neutral"
                variant="ghost"
                icon="i-lucide-more-horizontal"
                size="xs"
                class="rounded-lg opacity-0 group-hover:opacity-100"
                @click.stop="toggleCard(card.id)"
              />
            </div>

            <!-- Expanded Card Details -->
            <div
              v-if="expandedCardId === card.id"
              class="mt-4 space-y-4 border-t border-muted/10 pt-4"
            >
              <UTextarea
                :model-value="card.description"
                variant="none"
                placeholder="Add more detailed description..."
                autoresize
                :max-rows="8"
                class="w-full"
                :ui="{ base: 'px-0 text-sm text-toned leading-relaxed' }"
                @update:model-value="
                  mutateKanbanCard(
                    tabId,
                    block.id,
                    card.id,
                    (entry) => (entry.description = ($event ?? '').slice(0, 4000)),
                  )
                "
              />

              <div class="grid grid-cols-2 gap-3">
                <UFormField label="Assignee" size="xs">
                  <UInput
                    :model-value="card.assignee"
                    size="xs"
                    icon="i-lucide-user"
                    class="rounded-xl"
                    @update:model-value="
                      mutateKanbanCard(
                        tabId,
                        block.id,
                        card.id,
                        (entry) => (entry.assignee = ($event ?? '').slice(0, 120)),
                      )
                    "
                  />
                </UFormField>

                <UFormField label="Due Date" size="xs">
                  <UInput
                    :model-value="card.dueDate ?? ''"
                    type="date"
                    size="xs"
                    icon="i-lucide-calendar"
                    class="rounded-xl"
                    @update:model-value="
                      mutateKanbanCard(
                        tabId,
                        block.id,
                        card.id,
                        (entry) => (entry.dueDate = $event || null),
                      )
                    "
                  />
                </UFormField>
              </div>

              <div class="flex justify-end gap-2 pt-2">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-trash-2"
                  class="rounded-lg hover:text-error"
                  @click="removeKanbanCard(tabId, block.id, card.id)"
                >
                  Remove
                </UButton>
                <UButton
                  color="neutral"
                  variant="soft"
                  size="xs"
                  class="rounded-lg"
                  @click="toggleCard(card.id)"
                >
                  Close
                </UButton>
              </div>
            </div>

            <!-- Card Footer Meta -->
            <div v-else-if="card.assignee || card.dueDate" class="mt-3 flex items-center gap-3">
              <div
                v-if="card.assignee"
                class="flex items-center gap-1.5 text-[10px] font-bold text-muted/70"
              >
                <UIcon name="i-lucide-user" class="size-3" />
                <span>{{ card.assignee }}</span>
              </div>
              <div
                v-if="card.dueDate"
                class="flex items-center gap-1.5 text-[10px] font-bold text-muted/70"
              >
                <UIcon name="i-lucide-calendar" class="size-3" />
                <span>{{ card.dueDate }}</span>
              </div>
            </div>
          </article>

          <UButton
            color="neutral"
            variant="ghost"
            block
            icon="i-lucide-plus"
            class="mt-2 rounded-2xl border border-dashed border-muted/20 bg-transparent py-3 text-xs font-bold hover:bg-elevated/50"
            @click="addKanbanCard(tabId, block.id, column.id)"
          >
            Add Task
          </UButton>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
