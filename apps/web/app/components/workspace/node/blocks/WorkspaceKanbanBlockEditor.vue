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

function getInputValue(event: Event) {
    return (event.target as HTMLInputElement | null)?.value ?? "";
}

function canRemoveColumn() {
    return props.block.columns.length > 1;
}

const draggingCardId = ref<string | null>(null);
const dragOverColumnId = ref<string | null>(null);

function onCardDragStart(cardId: string, event: DragEvent) {
    draggingCardId.value = cardId;

    if (!event.dataTransfer) {
        return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-workspace-kanban-card", cardId);
    event.dataTransfer.setData("text/plain", cardId);
}

function clearDragState() {
    draggingCardId.value = null;
    dragOverColumnId.value = null;
}

function onColumnDragOver(columnId: string, event: DragEvent) {
    if (!draggingCardId.value) {
        return;
    }

    event.preventDefault();

    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
    }

    dragOverColumnId.value = columnId;
}

function onColumnDragLeave(columnId: string, event: DragEvent) {
    const currentTarget = event.currentTarget;
    const nextTarget = event.relatedTarget;

    if (
        currentTarget instanceof HTMLElement &&
        nextTarget instanceof Node &&
        currentTarget.contains(nextTarget)
    ) {
        return;
    }

    if (dragOverColumnId.value === columnId) {
        dragOverColumnId.value = null;
    }
}

function onColumnDrop(columnId: string, event: DragEvent) {
    event.preventDefault();

    const cardId =
        draggingCardId.value ||
        event.dataTransfer?.getData("application/x-workspace-kanban-card") ||
        event.dataTransfer?.getData("text/plain") ||
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
    <div class="space-y-4">
        <div
            class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-muted/60 bg-elevated/20 p-4"
        >
            <div>
                <p class="text-sm font-medium text-highlighted">
                    Structured kanban board
                </p>
                <p class="text-sm text-muted">
                    Drag cards between columns to move work forward.
                </p>
            </div>

            <div class="flex items-center gap-2">
                <UBadge color="neutral" variant="soft"
                    >{{ block.cards.length }} cards</UBadge
                >
                <UButton
                    color="primary"
                    variant="soft"
                    size="sm"
                    icon="i-lucide-plus"
                    @click="addKanbanColumn(tabId, block.id)"
                >
                    Add column
                </UButton>
            </div>
        </div>

        <div class="flex gap-4 overflow-x-auto pb-2">
            <section
                v-for="column in block.columns"
                :key="column.id"
                class="min-w-[300px] flex-1 rounded-2xl border border-muted/60 bg-elevated/20 p-4 transition"
                :class="
                    dragOverColumnId === column.id
                        ? 'border-primary/40 bg-primary/5 ring-2 ring-inset ring-primary/30'
                        : ''
                "
                @dragover="onColumnDragOver(column.id, $event)"
                @dragleave="onColumnDragLeave(column.id, $event)"
                @drop="onColumnDrop(column.id, $event)"
            >
                <div class="flex items-center gap-2">
                    <UInput
                        :model-value="column.title"
                        class="flex-1"
                        variant="none"
                        :ui="{ base: 'px-0 font-semibold text-highlighted' }"
                        placeholder="Column title"
                        @update:model-value="
                            mutateKanbanColumn(
                                tabId,
                                block.id,
                                column.id,
                                (entry) => {
                                    entry.title = ($event ?? '').slice(0, 80);
                                },
                            )
                        "
                    />
                    <UButton
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        icon="i-lucide-trash-2"
                        :disabled="!canRemoveColumn()"
                        @click="removeKanbanColumn(tabId, block.id, column.id)"
                    />
                </div>

                <div class="mt-4 space-y-3">
                    <article
                        v-for="card in cardsByColumn[column.id] ?? []"
                        :key="card.id"
                        class="space-y-3 rounded-2xl border border-muted/60 bg-default p-3"
                        :class="
                            draggingCardId === card.id
                                ? 'cursor-grabbing opacity-60'
                                : 'cursor-grab'
                        "
                        draggable="true"
                        @dragstart="onCardDragStart(card.id, $event)"
                        @dragend="clearDragState"
                    >
                        <div class="flex items-start gap-2">
                            <UIcon
                                name="i-lucide-grip-vertical"
                                class="mt-2 size-4 shrink-0 text-muted"
                            />
                            <UInput
                                :model-value="card.title"
                                class="flex-1"
                                placeholder="Card title"
                                @update:model-value="
                                    mutateKanbanCard(
                                        tabId,
                                        block.id,
                                        card.id,
                                        (entry) => {
                                            entry.title = ($event ?? '').slice(
                                                0,
                                                240,
                                            );
                                        },
                                    )
                                "
                            />
                            <UButton
                                color="neutral"
                                variant="ghost"
                                size="sm"
                                icon="i-lucide-x"
                                @click="
                                    removeKanbanCard(tabId, block.id, card.id)
                                "
                            />
                        </div>

                        <UTextarea
                            :model-value="card.description"
                            :rows="3"
                            autoresize
                            placeholder="Description"
                            @update:model-value="
                                mutateKanbanCard(
                                    tabId,
                                    block.id,
                                    card.id,
                                    (entry) => {
                                        entry.description = (
                                            $event ?? ''
                                        ).slice(0, 4000);
                                    },
                                )
                            "
                        />

                        <div class="grid gap-3 md:grid-cols-2">
                            <UInput
                                :model-value="card.assignee"
                                placeholder="Assignee"
                                @update:model-value="
                                    mutateKanbanCard(
                                        tabId,
                                        block.id,
                                        card.id,
                                        (entry) => {
                                            entry.assignee = (
                                                $event ?? ''
                                            ).slice(0, 120);
                                        },
                                    )
                                "
                            />

                            <input
                                :value="card.dueDate ?? ''"
                                type="date"
                                class="w-full rounded-xl border border-muted bg-default px-3 py-2 text-sm text-default outline-none ring-inset transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                @change="
                                    mutateKanbanCard(
                                        tabId,
                                        block.id,
                                        card.id,
                                        (entry) => {
                                            const value = getInputValue($event);
                                            entry.dueDate = value || null;
                                        },
                                    )
                                "
                            />
                        </div>
                    </article>

                    <UButton
                        color="neutral"
                        variant="soft"
                        block
                        icon="i-lucide-plus"
                        @click="addKanbanCard(tabId, block.id, column.id)"
                    >
                        Add card
                    </UButton>
                </div>
            </section>
        </div>
    </div>
</template>
