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

function toNumber(value: string) {
    return Number(value || 0);
}
</script>

<template>
    <div class="space-y-8">
        <!-- Analytics Header -->
        <div class="grid gap-6 sm:grid-cols-3">
            <div class="flex flex-col items-center justify-center rounded-[32px] bg-primary/5 p-6 text-center">
                <p class="text-[10px] font-bold uppercase tracking-widest text-primary/60">Data Points</p>
                <p class="mt-1 text-4xl font-black text-primary">{{ block.entries.length }}</p>
            </div>
            <div class="flex flex-col items-center justify-center rounded-[32px] bg-elevated/20 p-6 text-center">
                <p class="text-[10px] font-bold uppercase tracking-widest text-muted/60">Trend Velocity</p>
                <div class="mt-1 flex items-center gap-2">
                    <UIcon 
                        :name="trend.direction === 'up' ? 'i-lucide-trending-up' : trend.direction === 'down' ? 'i-lucide-trending-down' : 'i-lucide-minus'" 
                        class="size-8"
                        :class="trend.direction === 'up' ? 'text-success' : trend.direction === 'down' ? 'text-error' : 'text-muted'"
                    />
                    <p class="text-4xl font-black text-highlighted uppercase">{{ trend.direction }}</p>
                </div>
            </div>
            <div class="flex flex-col items-center justify-center rounded-[32px] bg-elevated/20 p-6 text-center">
                <p class="text-[10px] font-bold uppercase tracking-widest text-muted/60">Net Delta</p>
                <p class="mt-1 text-4xl font-black text-highlighted">{{ trend.delta > 0 ? '+' : '' }}{{ trend.delta }}</p>
            </div>
        </div>

        <!-- Visual Trend Map -->
        <div v-if="trend.points.length > 0" class="relative rounded-[40px] border border-muted/20 bg-default/40 p-8 shadow-inner overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50" />
            <div class="relative flex h-32 items-end gap-1.5 lg:gap-3">
                <div
                    v-for="(point, index) in trend.points"
                    :key="`${block.id}-chart-${index}`"
                    class="group relative flex-1 min-w-[4px] rounded-t-full bg-primary/20 transition-all hover:bg-primary/60"
                    :style="{ height: `${Math.max(point, 4)}%` }"
                >
                    <div class="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {{ trend.values[index] }}
                    </div>
                </div>
            </div>
            <div class="mt-4 flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-widest text-muted/40">
                <span>Start</span>
                <span>Current Velocity</span>
            </div>
        </div>

        <!-- Entry Management -->
        <div class="space-y-4">
            <div class="flex items-center justify-between px-2">
                <h3 class="text-sm font-bold uppercase tracking-widest text-muted/60">Data Log</h3>
                <UButton
                    color="primary"
                    variant="soft"
                    size="sm"
                    icon="i-lucide-plus"
                    class="rounded-full px-4"
                    @click="addTrackerEntry(tabId, block.id)"
                >
                    Add Entry
                </UButton>
            </div>

            <div class="space-y-2">
                <div
                    v-for="entry in block.entries"
                    :key="entry.id"
                    class="group flex items-center gap-4 rounded-2xl border border-muted/20 bg-default/40 p-3 transition-all hover:border-primary/20 hover:bg-default/60"
                >
                    <div class="flex-1 min-w-0">
                        <UInput
                            :model-value="entry.label"
                            variant="none"
                            placeholder="Entry context..."
                            class="w-full"
                            :ui="{ base: 'px-0 font-bold text-highlighted text-sm leading-tight' }"
                            @update:model-value="mutateTrackerEntry(tabId, block.id, entry.id, (item) => item.label = ($event ?? '').slice(0, 120))"
                        />
                        <p class="text-[9px] font-bold uppercase tracking-widest text-muted/40">{{ formatDateTime(entry.createdAt) }}</p>
                    </div>

                    <div class="flex items-center gap-3">
                        <div class="w-24">
                            <UInput
                                :model-value="String(entry.value)"
                                type="number"
                                step="0.1"
                                size="sm"
                                class="rounded-xl font-mono font-bold"
                                @update:model-value="mutateTrackerEntry(tabId, block.id, entry.id, (item) => item.value = toNumber($event ?? '0'))"
                            />
                        </div>
                        
                        <UButton
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            icon="i-lucide-trash-2"
                            class="rounded-lg opacity-0 group-hover:opacity-100 hover:text-error"
                            @click="removeTrackerEntry(tabId, block.id, entry.id)"
                        />
                    </div>
                </div>
                
                <div v-if="block.entries.length === 0" class="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-muted/30 bg-default/20 py-12 text-center">
                    <p class="text-sm font-bold text-muted/60 uppercase tracking-widest">No data entries</p>
                </div>
            </div>
        </div>
    </div>
</template>
