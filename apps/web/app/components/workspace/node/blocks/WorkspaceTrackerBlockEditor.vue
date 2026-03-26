<script setup lang="ts">
import {
    getTrackerTrend,
    type WorkspaceTrackerBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
    block: WorkspaceTrackerBlock;
    tabId: string;
}>();

const { addTrackerEntry, mutateTrackerEntry, removeTrackerEntry } =
    useWorkspaceNodeEditorContext();

const trend = computed(() => getTrackerTrend(props.block));

function getInputValue(event: Event) {
    return (event.target as HTMLInputElement | null)?.value ?? "";
}
</script>

<template>
    <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl border border-muted/60 bg-elevated/40 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-muted">Entries</p>
            <p class="mt-2 text-2xl font-semibold text-highlighted">
                {{ block.entries.length }}
            </p>
        </div>

        <div class="rounded-2xl border border-muted/60 bg-elevated/40 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-muted">Trend</p>
            <p class="mt-2 text-2xl font-semibold text-highlighted">
                {{ trend.direction }}
            </p>
        </div>

        <div class="rounded-2xl border border-muted/60 bg-elevated/40 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-muted">Delta</p>
            <p class="mt-2 text-2xl font-semibold text-highlighted">
                {{ trend.delta }}
            </p>
        </div>
    </div>

    <div
        v-if="trend.points.length > 0"
        class="rounded-2xl border border-muted/60 bg-elevated/30 p-4"
    >
        <div class="flex h-20 items-end gap-2">
            <div
                v-for="(point, index) in trend.points"
                :key="`${block.id}-${index}`"
                class="min-w-0 flex-1 rounded-t bg-primary/55"
                :style="{ height: `${Math.max(point, 8)}%` }"
            />
        </div>
    </div>

    <div class="space-y-3">
        <div
            v-for="entry in block.entries"
            :key="entry.id"
            class="grid gap-3 rounded-2xl border border-muted/60 bg-default p-4 md:grid-cols-[minmax(0,1fr)_140px_auto]"
        >
            <UInput
                :model-value="entry.label"
                placeholder="Entry label"
                @update:model-value="
                    mutateTrackerEntry(tabId, block.id, entry.id, (item) => {
                        item.label = ($event ?? '').slice(0, 120);
                    })
                "
            />

            <input
                :value="entry.value"
                type="number"
                step="0.1"
                class="w-full rounded-xl border border-muted bg-default px-3 py-2 text-sm text-default outline-none ring-inset transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                @change="
                    mutateTrackerEntry(tabId, block.id, entry.id, (item) => {
                        item.value = Number(getInputValue($event) || 0);
                    })
                "
            />

            <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                @click="removeTrackerEntry(tabId, block.id, entry.id)"
            />
        </div>
    </div>

    <UButton
        color="neutral"
        variant="soft"
        icon="i-lucide-plus"
        @click="addTrackerEntry(tabId, block.id)"
    >
        Add entry
    </UButton>
</template>
