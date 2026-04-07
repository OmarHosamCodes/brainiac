<script setup lang="ts">
import {
    getDecisionSummary,
    type WorkspaceDecisionBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
    block: WorkspaceDecisionBlock;
    tabId: string;
}>();

const {
    addDecisionItem,
    mutateDecisionItem,
    removeDecisionItem,
    mutateTypedBlock,
} = useWorkspaceNodeEditorContext();

const summary = computed(() => getDecisionSummary(props.block));

const totalWeight = computed(() =>
    Math.max(summary.value.prosWeight + summary.value.consWeight, 1),
);

function updateDecisionItemText(
    list: "pros" | "cons",
    itemId: string,
    value: string | number | undefined,
) {
    mutateDecisionItem(props.tabId, props.block.id, itemId, list, (entry) => {
        entry.text = String(value ?? "").slice(0, 240);
    });
}

function updateDecisionItemWeight(
    list: "pros" | "cons",
    itemId: string,
    weight: number,
) {
    mutateDecisionItem(props.tabId, props.block.id, itemId, list, (entry) => {
        entry.weight = Math.min(5, Math.max(1, Math.round(weight)));
    });
}

function updateRecommendation(value: string | number | undefined) {
    mutateTypedBlock(props.tabId, props.block.id, "decision", (entry) => {
        entry.recommendation = String(value ?? "");
    });
}

function getWeightButtonClass(
    list: "pros" | "cons",
    currentWeight: number,
    value: number,
) {
    const isActive = value <= currentWeight;

    if (list === "pros") {
        return isActive
            ? "border-success/30 bg-success text-white"
            : "border-muted/20 bg-default/60 text-muted/70 hover:border-success/30 hover:text-success";
    }

    return isActive
        ? "border-error/30 bg-error text-white"
        : "border-muted/20 bg-default/60 text-muted/70 hover:border-error/30 hover:text-error";
}
</script>

<template>
    <div class="space-y-8">
        <!-- Visual Balance Summary -->
        <div
            class="rounded-3xl bg-elevated/10 p-6 border border-muted/20 space-y-5"
        >
            <div class="flex flex-wrap items-center gap-2">
                <UBadge variant="subtle" class="rounded-2xl">
                    {{ block.pros.length }} pros
                </UBadge>
                <UBadge color="neutral" variant="soft" class="rounded-2xl">
                    {{ block.cons.length }} cons
                </UBadge>
            </div>

            <div class="flex items-center justify-between gap-4">
                <div class="text-center">
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-success/70"
                    >
                        Pros Weight
                    </p>
                    <p
                        class="text-2xl sm:text-3xl font-black tracking-tight text-success"
                    >
                        {{ summary.prosWeight }}
                    </p>
                </div>

                <div class="flex-1 px-4 sm:px-8">
                    <div
                        class="relative h-2 rounded-full bg-muted/20 overflow-hidden"
                    >
                        <div
                            class="absolute inset-y-0 left-0 bg-success transition-all duration-500"
                            :style="{
                                width: `${(summary.prosWeight / totalWeight) * 100}%`,
                            }"
                        />
                        <div
                            class="absolute inset-y-0 right-0 bg-error transition-all duration-500"
                            :style="{
                                width: `${(summary.consWeight / totalWeight) * 100}%`,
                            }"
                        />
                    </div>
                    <div class="mt-4 text-center">
                        <p
                            class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1"
                        >
                            Current Signal
                        </p>
                        <p
                            class="text-lg font-black text-highlighted uppercase tracking-tight"
                        >
                            {{ summary.signal }}
                        </p>
                    </div>
                </div>

                <div class="text-center">
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-error/70"
                    >
                        Cons Weight
                    </p>
                    <p
                        class="text-2xl sm:text-3xl font-black tracking-tight text-error"
                    >
                        {{ summary.consWeight }}
                    </p>
                </div>
            </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
            <!-- Pros Column -->
            <div class="space-y-4">
                <div class="flex items-center justify-between px-2">
                    <div class="flex items-center gap-2 text-success">
                        <UIcon name="i-lucide-plus-circle" class="size-5" />
                        <h3
                            class="text-[10px] font-bold uppercase tracking-[0.2em] text-success/80"
                        >
                            Pros
                        </h3>
                    </div>
                    <UButton
                        color="success"
                        variant="soft"
                        icon="i-lucide-plus"
                        size="xs"
                        class="rounded-full px-4"
                        aria-label="Add pro point"
                        @click="addDecisionItem(tabId, block.id, 'pros')"
                    >
                        Add Point
                    </UButton>
                </div>

                <div
                    v-if="block.pros.length === 0"
                    class="border-dashed border-muted/20 rounded-3xl py-12 text-center bg-elevated/5"
                >
                    <p class="text-sm font-semibold text-muted">
                        No pros added yet.
                    </p>
                </div>

                <div class="space-y-2">
                    <div
                        v-for="item in block.pros"
                        :key="item.id"
                        class="group space-y-3 rounded-2xl border border-success/20 bg-default/40 p-3 transition-all hover:bg-default/60"
                    >
                        <div class="flex items-start gap-3">
                            <UInput
                                :model-value="item.text"
                                variant="none"
                                placeholder="Add a pro point..."
                                class="flex-1"
                                :ui="{ base: 'px-2 py-1 text-sm font-medium' }"
                                @update:model-value="
                                    updateDecisionItemText(
                                        'pros',
                                        item.id,
                                        $event,
                                    )
                                "
                            />

                            <UButton
                                color="neutral"
                                variant="ghost"
                                icon="i-lucide-trash-2"
                                size="xs"
                                class="rounded-lg hover:text-error"
                                aria-label="Remove pro point"
                                @click="
                                    removeDecisionItem(
                                        tabId,
                                        block.id,
                                        item.id,
                                        'pros',
                                    )
                                "
                            />
                        </div>

                        <div
                            class="flex flex-wrap items-center justify-between gap-3 px-2"
                        >
                            <p
                                class="text-[10px] font-bold uppercase tracking-[0.2em] text-success/70"
                            >
                                Weight
                            </p>
                            <div class="flex flex-wrap items-center gap-2">
                                <button
                                    v-for="w in 5"
                                    :key="w"
                                    type="button"
                                    class="min-w-8 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors"
                                    :class="
                                        getWeightButtonClass(
                                            'pros',
                                            item.weight,
                                            w,
                                        )
                                    "
                                    :aria-label="`Set pro weight to ${w}`"
                                    @click="
                                        updateDecisionItemWeight(
                                            'pros',
                                            item.id,
                                            w,
                                        )
                                    "
                                >
                                    {{ w }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Cons Column -->
            <div class="space-y-4">
                <div class="flex items-center justify-between px-2">
                    <div class="flex items-center gap-2 text-error">
                        <UIcon name="i-lucide-minus-circle" class="size-5" />
                        <h3
                            class="text-[10px] font-bold uppercase tracking-[0.2em] text-error/80"
                        >
                            Cons
                        </h3>
                    </div>
                    <UButton
                        color="error"
                        variant="soft"
                        icon="i-lucide-plus"
                        size="xs"
                        class="rounded-full px-4"
                        aria-label="Add con point"
                        @click="addDecisionItem(tabId, block.id, 'cons')"
                    >
                        Add Point
                    </UButton>
                </div>

                <div
                    v-if="block.cons.length === 0"
                    class="border-dashed border-muted/20 rounded-3xl py-12 text-center bg-elevated/5"
                >
                    <p class="text-sm font-semibold text-muted">
                        No cons added yet.
                    </p>
                </div>

                <div class="space-y-2">
                    <div
                        v-for="item in block.cons"
                        :key="item.id"
                        class="group space-y-3 rounded-2xl border border-error/20 bg-default/40 p-3 transition-all hover:bg-default/60"
                    >
                        <div class="flex items-start gap-3">
                            <UInput
                                :model-value="item.text"
                                variant="none"
                                placeholder="Add a con point..."
                                class="flex-1"
                                :ui="{ base: 'px-2 py-1 text-sm font-medium' }"
                                @update:model-value="
                                    updateDecisionItemText(
                                        'cons',
                                        item.id,
                                        $event,
                                    )
                                "
                            />

                            <UButton
                                color="neutral"
                                variant="ghost"
                                icon="i-lucide-trash-2"
                                size="xs"
                                class="rounded-lg hover:text-error"
                                aria-label="Remove con point"
                                @click="
                                    removeDecisionItem(
                                        tabId,
                                        block.id,
                                        item.id,
                                        'cons',
                                    )
                                "
                            />
                        </div>

                        <div
                            class="flex flex-wrap items-center justify-between gap-3 px-2"
                        >
                            <p
                                class="text-[10px] font-bold uppercase tracking-[0.2em] text-error/70"
                            >
                                Weight
                            </p>
                            <div class="flex flex-wrap items-center gap-2">
                                <button
                                    v-for="w in 5"
                                    :key="w"
                                    type="button"
                                    class="min-w-8 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors"
                                    :class="
                                        getWeightButtonClass(
                                            'cons',
                                            item.weight,
                                            w,
                                        )
                                    "
                                    :aria-label="`Set con weight to ${w}`"
                                    @click="
                                        updateDecisionItemWeight(
                                            'cons',
                                            item.id,
                                            w,
                                        )
                                    "
                                >
                                    {{ w }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Final Recommendation -->
        <div
            class="rounded-3xl border border-primary/20 bg-primary/5 p-6 space-y-4"
        >
            <div class="flex items-center gap-2 text-primary">
                <UIcon name="i-lucide-check-circle-2" class="size-5" />
                <h3
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80"
                >
                    Final Recommendation
                </h3>
            </div>
            <UTextarea
                :model-value="block.recommendation"
                variant="none"
                placeholder="Based on the pros and cons above, my recommendation is..."
                autoresize
                :max-rows="6"
                class="w-full"
                :ui="{
                    base: 'p-0 text-base text-toned font-medium placeholder:text-muted/40',
                }"
                @update:model-value="updateRecommendation($event)"
            />
        </div>
    </div>
</template>
