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

function getSelectValue(event: Event) {
    return (event.target as HTMLSelectElement | null)?.value ?? "";
}

function canRemoveColumn() {
    return props.block.columns.length > 1;
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
                    Track cards across explicit workflow columns.
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
                class="min-w-[300px] flex-1 rounded-2xl border border-muted/60 bg-elevated/20 p-4"
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
                    >
                        <div class="flex items-start gap-2">
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

                        <div class="grid gap-3 md:grid-cols-3">
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

                            <select
                                :value="card.columnId"
                                class="w-full rounded-xl border border-muted bg-default px-3 py-2 text-sm text-default outline-none ring-inset transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                @change="
                                    mutateKanbanCard(
                                        tabId,
                                        block.id,
                                        card.id,
                                        (entry) => {
                                            entry.columnId =
                                                getSelectValue($event);
                                        },
                                    )
                                "
                            >
                                <option
                                    v-for="option in block.columns"
                                    :key="option.id"
                                    :value="option.id"
                                >
                                    {{ option.title || "Untitled column" }}
                                </option>
                            </select>
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
