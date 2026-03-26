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

const { addDecisionItem, mutateDecisionItem, removeDecisionItem, mutateBlock } =
    useWorkspaceNodeEditorContext();

const summary = computed(() => getDecisionSummary(props.block));

function clampWeight(value: string) {
    const numeric = Number(value || 3);
    return Math.min(5, Math.max(1, Math.round(numeric)));
}

function getInputValue(event: Event) {
    return (event.target as HTMLInputElement | null)?.value ?? "";
}
</script>

<template>
    <div class="grid gap-4 lg:grid-cols-2">
        <div
            class="space-y-3 rounded-2xl border border-success/30 bg-success/5 p-4"
        >
            <div class="flex items-center justify-between gap-3">
                <p class="font-medium text-highlighted">Pros</p>
                <UButton
                    color="success"
                    variant="soft"
                    icon="i-lucide-plus"
                    size="sm"
                    @click="addDecisionItem(tabId, block.id, 'pros')"
                >
                    Add
                </UButton>
            </div>

            <div v-if="block.pros.length === 0" class="text-sm text-muted">
                Add reasons in favor of this decision.
            </div>

            <div
                v-for="item in block.pros"
                :key="item.id"
                class="grid gap-3 rounded-2xl border border-success/20 bg-default p-3 md:grid-cols-[minmax(0,1fr)_88px_auto]"
            >
                <UInput
                    :model-value="item.text"
                    placeholder="Pro point"
                    @update:model-value="
                        mutateDecisionItem(
                            tabId,
                            block.id,
                            item.id,
                            'pros',
                            (entry) => {
                                entry.text = ($event ?? '').slice(0, 240);
                            },
                        )
                    "
                />

                <input
                    :value="item.weight"
                    type="number"
                    min="1"
                    max="5"
                    class="w-full rounded-xl border border-muted bg-default px-3 py-2 text-sm text-default outline-none ring-inset transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    @change="
                        mutateDecisionItem(
                            tabId,
                            block.id,
                            item.id,
                            'pros',
                            (entry) => {
                                entry.weight = clampWeight(
                                    getInputValue($event),
                                );
                            },
                        )
                    "
                />

                <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-x"
                    @click="
                        removeDecisionItem(tabId, block.id, item.id, 'pros')
                    "
                />
            </div>
        </div>

        <div
            class="space-y-3 rounded-2xl border border-error/30 bg-error/5 p-4"
        >
            <div class="flex items-center justify-between gap-3">
                <p class="font-medium text-highlighted">Cons</p>
                <UButton
                    color="error"
                    variant="soft"
                    icon="i-lucide-plus"
                    size="sm"
                    @click="addDecisionItem(tabId, block.id, 'cons')"
                >
                    Add
                </UButton>
            </div>

            <div v-if="block.cons.length === 0" class="text-sm text-muted">
                Add concerns, risks, or tradeoffs.
            </div>

            <div
                v-for="item in block.cons"
                :key="item.id"
                class="grid gap-3 rounded-2xl border border-error/20 bg-default p-3 md:grid-cols-[minmax(0,1fr)_88px_auto]"
            >
                <UInput
                    :model-value="item.text"
                    placeholder="Con point"
                    @update:model-value="
                        mutateDecisionItem(
                            tabId,
                            block.id,
                            item.id,
                            'cons',
                            (entry) => {
                                entry.text = ($event ?? '').slice(0, 240);
                            },
                        )
                    "
                />

                <input
                    :value="item.weight"
                    type="number"
                    min="1"
                    max="5"
                    class="w-full rounded-xl border border-muted bg-default px-3 py-2 text-sm text-default outline-none ring-inset transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    @change="
                        mutateDecisionItem(
                            tabId,
                            block.id,
                            item.id,
                            'cons',
                            (entry) => {
                                entry.weight = clampWeight(
                                    getInputValue($event),
                                );
                            },
                        )
                    "
                />

                <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-x"
                    @click="
                        removeDecisionItem(tabId, block.id, item.id, 'cons')
                    "
                />
            </div>
        </div>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl border border-muted/60 bg-elevated/40 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-muted">
                Pros Weight
            </p>
            <p class="mt-2 text-2xl font-semibold text-highlighted">
                {{ summary.prosWeight }}
            </p>
        </div>

        <div class="rounded-2xl border border-muted/60 bg-elevated/40 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-muted">
                Cons Weight
            </p>
            <p class="mt-2 text-2xl font-semibold text-highlighted">
                {{ summary.consWeight }}
            </p>
        </div>

        <div class="rounded-2xl border border-muted/60 bg-elevated/40 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-muted">Signal</p>
            <p class="mt-2 text-2xl font-semibold text-highlighted">
                {{ summary.signal }}
            </p>
        </div>
    </div>

    <UFormField label="Final Recommendation">
        <UTextarea
            :model-value="block.recommendation"
            :rows="4"
            autoresize
            placeholder="State the decision you intend to make and why."
            @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'decision') {
                        return;
                    }

                    entry.recommendation = $event ?? '';
                })
            "
        />
    </UFormField>
</template>
