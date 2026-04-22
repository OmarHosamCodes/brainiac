<script setup lang="ts">
import type { WorkspaceAgencySettingsBlock } from "@brainiac/workspace";
import { useMutation, useQuery } from "@tanstack/vue-query";
import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
    block: WorkspaceAgencySettingsBlock;
    tabId: string;
}>();

const { currentNode, mutateTypedBlock } = useWorkspaceNodeEditorContext();
const orpc = useOrpc();
const toast = useToast();
const authSession = useAuthSession();
const authEnabled = computed(() => Boolean(authSession.value?.data?.user));



// Billing period computed
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

// Teams query
const teamsQuery = useQuery(
    computed(() => ({
        ...orpc.team.list.queryOptions(),
        enabled: authEnabled.value,
    })),
);

const teams = computed(() => teamsQuery.data.value?.items ?? []);
const effectiveTeamId = computed(() =>
    props.block.teamId || currentNode.value?.teamId || teams.value[0]?.id || "",
);

// Mutations are not needed for settings block


function updateTeam(teamId: string | undefined) {
    mutateTypedBlock(
        props.tabId,
        props.block.id,
        "agency-settings",
        (entry) => {
            entry.teamId = teamId || null;
        },
    );
}

</script>

<template>
    <div class="space-y-8">
        <!-- Billing Period Section -->
        <div>
            <div class="mb-4 flex items-center gap-3">
                <UIcon
                    name="i-lucide-calendar-range"
                    class="size-5 text-emerald-600 dark:text-emerald-400"
                />
                <div>
                    <h3 class="font-semibold text-zinc-100">Billing Period</h3>
                    <p class="text-xs text-zinc-500">
                        Configure the recurring billing window.
                    </p>
                </div>
            </div>

            <div class="rounded-2xl border border-zinc-200/30 bg-zinc-950/40 backdrop-blur-sm p-4 dark:border-zinc-800/50 dark:bg-zinc-950/50">
                <div class="grid gap-4 md:grid-cols-2">
                    <!-- Start day -->
                    <div>
                        <UFormField label="Start day (1-28)" size="sm" class="mb-0">
                            <div class="flex gap-2">
                                <UInput
                                    v-model="startDayRaw"
                                    type="number"
                                    min="1"
                                    max="28"
                                    size="sm"
                                />
                                <UButton
                                    label="Apply"
                                    size="sm"
                                    variant="soft"
                                    @click="applyStartDay"
                                />
                            </div>
                        </UFormField>
                    </div>

                    <!-- End day -->
                    <div>
                        <UFormField label="End day (1-28)" size="sm" class="mb-0">
                            <div class="flex gap-2">
                                <UInput
                                    v-model="endDayRaw"
                                    type="number"
                                    min="1"
                                    max="28"
                                    size="sm"
                                />
                                <UButton
                                    label="Apply"
                                    size="sm"
                                    variant="soft"
                                    @click="applyEndDay"
                                />
                            </div>
                        </UFormField>
                    </div>
                </div>

                <p class="mt-3 text-xs text-zinc-500">
                    {{ periodDescription }}
                </p>
            </div>
        </div>
    </div>
</template>
