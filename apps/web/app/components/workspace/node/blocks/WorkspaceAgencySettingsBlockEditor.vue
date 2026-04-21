<script setup lang="ts">
import type { WorkspaceAgencySettingsBlock } from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
    block: WorkspaceAgencySettingsBlock;
    tabId: string;
}>();

const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

const startDay = computed({
    get: () => props.block.billingPeriodStartDay,
    set: (value: number) => {
        mutateTypedBlock(props.tabId, props.block.id, "agency-settings", (draft) => {
            draft.billingPeriodStartDay = value;
        });
    },
});

const endDay = computed({
    get: () => props.block.billingPeriodEndDay,
    set: (value: number) => {
        mutateTypedBlock(props.tabId, props.block.id, "agency-settings", (draft) => {
            draft.billingPeriodEndDay = value;
        });
    },
});

const startDayRaw = ref(String(props.block.billingPeriodStartDay));
const endDayRaw = ref(String(props.block.billingPeriodEndDay));

watch(() => props.block.billingPeriodStartDay, (v) => {
    startDayRaw.value = String(v);
});
watch(() => props.block.billingPeriodEndDay, (v) => {
    endDayRaw.value = String(v);
});

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, Math.round(value)));
}

function applyStartDay() {
    const parsed = Number.parseInt(startDayRaw.value, 10);
    if (!Number.isNaN(parsed)) {
        const clamped = clamp(parsed, 1, 28);
        startDayRaw.value = String(clamped);
        startDay.value = clamped;
    } else {
        startDayRaw.value = String(props.block.billingPeriodStartDay);
    }
}

function applyEndDay() {
    const parsed = Number.parseInt(endDayRaw.value, 10);
    if (!Number.isNaN(parsed)) {
        const clamped = clamp(parsed, 1, 28);
        endDayRaw.value = String(clamped);
        endDay.value = clamped;
    } else {
        endDayRaw.value = String(props.block.billingPeriodEndDay);
    }
}

const periodDescription = computed(() => {
    const start = props.block.billingPeriodStartDay;
    const end = props.block.billingPeriodEndDay;
    const suffix = (n: number) => {
        if (n >= 11 && n <= 13) return "th";
        const mod = n % 10;
        if (mod === 1) return "st";
        if (mod === 2) return "nd";
        if (mod === 3) return "rd";
        return "th";
    };
    return `Billing period: ${start}${suffix(start)} → ${end}${suffix(end)} of the following month`;
});
</script>

<template>
    <div class="space-y-6 p-1">
        <!-- Header -->
        <div class="flex items-center gap-3">
            <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
                <UIcon name="i-lucide-calendar-range" class="size-4.5" />
            </div>
            <div>
                <h3 class="text-sm font-semibold text-highlighted">Billing Period</h3>
                <p class="text-xs text-muted">Configure the recurring billing window for this agency team.</p>
            </div>
        </div>

        <!-- Day inputs -->
        <div class="rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-5 dark:border-neutral-800/80 dark:bg-neutral-900/60">
            <div class="grid grid-cols-2 gap-4">
                <!-- Start day -->
                <div class="space-y-1.5">
                    <label class="block text-[11px] font-bold uppercase tracking-[0.18em] text-muted/80">
                        Starts on day
                    </label>
                    <UInput
                        v-model="startDayRaw"
                        type="number"
                        min="1"
                        max="28"
                        size="sm"
                        class="w-full"
                        @blur="applyStartDay"
                        @keydown.enter.prevent="applyStartDay"
                    />
                    <p class="text-[11px] text-muted/70">Day 1 – 28</p>
                </div>

                <!-- End day -->
                <div class="space-y-1.5">
                    <label class="block text-[11px] font-bold uppercase tracking-[0.18em] text-muted/80">
                        Ends on day
                    </label>
                    <UInput
                        v-model="endDayRaw"
                        type="number"
                        min="1"
                        max="28"
                        size="sm"
                        class="w-full"
                        @blur="applyEndDay"
                        @keydown.enter.prevent="applyEndDay"
                    />
                    <p class="text-[11px] text-muted/70">Day 1 – 28 of next month</p>
                </div>
            </div>

            <!-- Period summary -->
            <div class="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/8 px-3 py-2.5 dark:bg-emerald-400/8">
                <UIcon name="i-lucide-info" class="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <p class="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {{ periodDescription }}
                </p>
            </div>
        </div>

        <!-- Guidance note -->
        <p class="text-xs text-muted/70">
            Set the day of the month your billing window opens and the day it closes on the following month.
            For example, day 25 → day 24 covers the 25th through the 24th of next month.
        </p>
    </div>
</template>
