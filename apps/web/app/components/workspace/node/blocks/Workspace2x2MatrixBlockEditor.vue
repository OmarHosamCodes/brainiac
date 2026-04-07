<script setup lang="ts">
import {
    createWorkspace2x2MatrixItem,
    get2x2MatrixSummary,
    type Workspace2x2MatrixBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
    block: Workspace2x2MatrixBlock;
    tabId: string;
}>();

const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => get2x2MatrixSummary(props.block));
const totalQuadrants = 4;
const averageItemsPerQuadrant = computed(() =>
    Number((summary.value.itemCount / totalQuadrants).toFixed(1)),
);

const quadrants = [
    {
        key: "topLeft",
        tone: "border-emerald-300/40 bg-emerald-500/5",
        accent: "text-emerald-500",
    },
    {
        key: "topRight",
        tone: "border-sky-300/40 bg-sky-500/5",
        accent: "text-sky-500",
    },
    {
        key: "bottomLeft",
        tone: "border-amber-300/40 bg-amber-500/5",
        accent: "text-amber-500",
    },
    {
        key: "bottomRight",
        tone: "border-rose-300/40 bg-rose-500/5",
        accent: "text-rose-500",
    },
] as const;

function updateMatrixField(
    field:
        | "xAxisLabel"
        | "yAxisLabel"
        | "xStartLabel"
        | "xEndLabel"
        | "yStartLabel"
        | "yEndLabel",
    value: string | number | undefined,
    limit: number,
) {
    mutateTypedBlock(props.tabId, props.block.id, "2x2-matrix", (entry) => {
        entry[field] = String(value ?? "").slice(0, limit);
    });
}

function updateQuadrantName(
    quadrantKey: (typeof quadrants)[number]["key"],
    value: string | number | undefined,
) {
    mutateTypedBlock(props.tabId, props.block.id, "2x2-matrix", (entry) => {
        entry.quadrants[quadrantKey].name = String(value ?? "").slice(0, 80);
    });
}

function addQuadrantItem(quadrantKey: (typeof quadrants)[number]["key"]) {
    mutateTypedBlock(props.tabId, props.block.id, "2x2-matrix", (entry) => {
        entry.quadrants[quadrantKey].items.push(
            createWorkspace2x2MatrixItem({ text: "" }),
        );
    });
}

function updateQuadrantItem(
    quadrantKey: (typeof quadrants)[number]["key"],
    itemId: string,
    value: string | number | undefined,
) {
    mutateTypedBlock(props.tabId, props.block.id, "2x2-matrix", (entry) => {
        const target = entry.quadrants[quadrantKey].items.find(
            (candidate) => candidate.id === itemId,
        );

        if (!target) {
            return;
        }

        target.text = String(value ?? "").slice(0, 200);
    });
}

function removeQuadrantItem(
    quadrantKey: (typeof quadrants)[number]["key"],
    itemId: string,
) {
    mutateTypedBlock(props.tabId, props.block.id, "2x2-matrix", (entry) => {
        entry.quadrants[quadrantKey].items = entry.quadrants[
            quadrantKey
        ].items.filter((candidate) => candidate.id !== itemId);
    });
}
</script>

<template>
    <div class="space-y-6">
        <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >
                        Decision Matrix
                    </p>
                    <p class="mt-1 text-sm text-muted">
                        Compare ideas across four quadrants with clearer axis
                        labels and easier item management.
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <UBadge variant="subtle" class="rounded-2xl">
                        {{ summary.itemCount }} items
                    </UBadge>
                    <UBadge color="neutral" variant="soft" class="rounded-2xl">
                        {{ averageItemsPerQuadrant }} avg / quadrant
                    </UBadge>
                    <UBadge color="primary" variant="soft" class="rounded-2xl">
                        {{ block.xAxisLabel || "Horizontal axis" }}
                    </UBadge>
                    <UBadge color="primary" variant="soft" class="rounded-2xl">
                        {{ block.yAxisLabel || "Vertical axis" }}
                    </UBadge>
                </div>
            </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div
                    class="rounded-3xl bg-elevated/10 border border-muted/20 p-5"
                >
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >
                        Items
                    </p>
                    <p
                        class="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-highlighted"
                    >
                        {{ summary.itemCount }}
                    </p>
                </div>
                <div
                    class="rounded-3xl bg-elevated/10 border border-muted/20 p-5"
                >
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >
                        Axis X
                    </p>
                    <p
                        class="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-highlighted"
                    >
                        {{ block.xAxisLabel }}
                    </p>
                </div>
                <div
                    class="rounded-3xl bg-primary/10 border border-primary/20 p-5"
                >
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60"
                    >
                        Axis Y
                    </p>
                    <p
                        class="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-primary"
                    >
                        {{ block.yAxisLabel }}
                    </p>
                </div>
                <div
                    class="rounded-3xl bg-elevated/10 border border-muted/20 p-5"
                >
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >
                        Quadrants
                    </p>
                    <p
                        class="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-highlighted"
                    >
                        {{ totalQuadrants }}
                    </p>
                </div>
            </div>

            <div
                class="grid gap-3 rounded-3xl border border-muted/20 bg-default/40 p-4 sm:grid-cols-2 lg:w-[360px]"
            >
                <UInput
                    :model-value="block.xAxisLabel"
                    placeholder="Horizontal axis"
                    size="sm"
                    class="rounded-2xl"
                    aria-label="Horizontal axis label"
                    @update:model-value="
                        updateMatrixField('xAxisLabel', $event, 80)
                    "
                />
                <UInput
                    :model-value="block.yAxisLabel"
                    placeholder="Vertical axis"
                    size="sm"
                    class="rounded-2xl"
                    aria-label="Vertical axis label"
                    @update:model-value="
                        updateMatrixField('yAxisLabel', $event, 80)
                    "
                />
                <UInput
                    :model-value="block.xStartLabel"
                    placeholder="X low"
                    size="sm"
                    class="rounded-2xl"
                    aria-label="Horizontal axis low label"
                    @update:model-value="
                        updateMatrixField('xStartLabel', $event, 60)
                    "
                />
                <UInput
                    :model-value="block.xEndLabel"
                    placeholder="X high"
                    size="sm"
                    class="rounded-2xl"
                    aria-label="Horizontal axis high label"
                    @update:model-value="
                        updateMatrixField('xEndLabel', $event, 60)
                    "
                />
                <UInput
                    :model-value="block.yStartLabel"
                    placeholder="Y low"
                    size="sm"
                    class="rounded-2xl"
                    aria-label="Vertical axis low label"
                    @update:model-value="
                        updateMatrixField('yStartLabel', $event, 60)
                    "
                />
                <UInput
                    :model-value="block.yEndLabel"
                    placeholder="Y high"
                    size="sm"
                    class="rounded-2xl"
                    aria-label="Vertical axis high label"
                    @update:model-value="
                        updateMatrixField('yEndLabel', $event, 60)
                    "
                />
            </div>
        </div>

        <div class="rounded-3xl border border-muted/20 bg-default/40 p-4">
            <div
                class="mb-3 flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
            >
                <span>{{ block.yEndLabel }}</span>
                <span>{{ block.yAxisLabel }}</span>
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
                <article
                    v-for="quadrant in quadrants"
                    :key="quadrant.key"
                    class="rounded-2xl border p-4 transition-colors"
                    :class="quadrant.tone"
                >
                    <div class="mb-3 flex items-center justify-between gap-3">
                        <div class="min-w-0 flex-1 space-y-2">
                            <div class="flex items-center gap-2">
                                <UIcon
                                    name="i-lucide-square-dashed"
                                    class="size-4"
                                    :class="quadrant.accent"
                                />
                                <p
                                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                                >
                                    {{
                                        block.quadrants[quadrant.key].items
                                            .length
                                    }}
                                    items
                                </p>
                            </div>
                            <UInput
                                :model-value="
                                    block.quadrants[quadrant.key].name
                                "
                                variant="soft"
                                class="flex-1 rounded-2xl"
                                :aria-label="`Quadrant name for ${quadrant.key}`"
                                @update:model-value="
                                    updateQuadrantName(quadrant.key, $event)
                                "
                            />
                        </div>
                        <UButton
                            color="primary"
                            variant="soft"
                            size="xs"
                            icon="i-lucide-plus"
                            class="rounded-full"
                            :aria-label="`Add item to ${block.quadrants[quadrant.key].name || 'quadrant'}`"
                            @click="addQuadrantItem(quadrant.key)"
                        >
                            Add
                        </UButton>
                    </div>

                    <div class="space-y-2">
                        <div
                            v-for="item in block.quadrants[quadrant.key].items"
                            :key="item.id"
                            class="flex items-center gap-2 rounded-2xl border border-muted/20 bg-default/60 p-2"
                        >
                            <UInput
                                :model-value="item.text"
                                variant="none"
                                placeholder="Matrix item"
                                class="flex-1"
                                :ui="{ base: 'px-0 text-sm text-highlighted' }"
                                @update:model-value="
                                    updateQuadrantItem(
                                        quadrant.key,
                                        item.id,
                                        $event,
                                    )
                                "
                            />
                            <UButton
                                color="neutral"
                                variant="ghost"
                                size="xs"
                                icon="i-lucide-trash-2"
                                class="rounded-lg hover:text-error"
                                aria-label="Remove matrix item"
                                @click="
                                    removeQuadrantItem(quadrant.key, item.id)
                                "
                            />
                        </div>

                        <div
                            v-if="
                                block.quadrants[quadrant.key].items.length === 0
                            "
                            class="border-dashed border border-muted/20 rounded-2xl py-8 text-center bg-elevated/5"
                        >
                            <p
                                class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40"
                            >
                                Empty Quadrant
                            </p>
                            <p class="mt-2 text-sm text-muted">
                                Add the first item to clarify what belongs here.
                            </p>
                        </div>
                    </div>
                </article>
            </div>

            <div
                class="mt-3 flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
            >
                <span>{{ block.xStartLabel }}</span>
                <span>{{ block.xAxisLabel }}</span>
                <span>{{ block.xEndLabel }}</span>
            </div>
            <div
                class="mt-1 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40"
            >
                {{ block.yStartLabel }}
            </div>
        </div>
    </div>
</template>
