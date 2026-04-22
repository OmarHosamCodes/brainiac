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

const newTagName = ref("");

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

// Tags query
const tagsQuery = useQuery(
    computed(() => ({
        ...orpc.agencyOps.tags.list.queryOptions({
            input: {
                teamId: effectiveTeamId.value,
            },
        }),
        enabled: Boolean(effectiveTeamId.value),
    })),
);

const tags = computed(() => tagsQuery.data.value?.items ?? []);

// Mutations
const createTagMutation = useMutation(
    orpc.agencyOps.tags.create.mutationOptions(),
);

const deleteTagMutation = useMutation(
    orpc.agencyOps.tags.delete.mutationOptions(),
);

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

async function createTag() {
    const name = newTagName.value.trim();

    if (!name || !effectiveTeamId.value) {
        return;
    }

    try {
        await createTagMutation.mutateAsync({
            teamId: effectiveTeamId.value,
            name,
        });

        newTagName.value = "";
        await tagsQuery.refetch();

        toast.add({
            title: "Tag created",
            description: name,
            color: "success",
        });
    } catch (error) {
        toast.add({
            title: "Unable to create tag",
            description: getErrorMessage(error, "Please try again."),
            color: "error",
        });
    }
}

async function deleteTag(tagId: string) {
    if (!effectiveTeamId.value) {
        return;
    }

    try {
        await deleteTagMutation.mutateAsync({
            teamId: effectiveTeamId.value,
            tagId,
        });

        await tagsQuery.refetch();

        toast.add({
            title: "Tag deleted",
            color: "success",
        });
    } catch (error) {
        toast.add({
            title: "Unable to delete tag",
            description: getErrorMessage(error, "Please try again."),
            color: "error",
        });
    }
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

        <!-- Tags Section -->
        <div v-if="effectiveTeamId">
            <div class="mb-4 flex items-center gap-3">
                <UIcon
                    name="i-lucide-tags"
                    class="size-5 text-emerald-600 dark:text-emerald-400"
                />
                <div>
                    <h3 class="font-semibold text-zinc-100">Tags</h3>
                    <p class="text-xs text-zinc-500">
                        Organize time entries with team-wide tags.
                    </p>
                </div>
            </div>

            <!-- Team selector for tags -->
            <div class="mb-4 rounded-2xl border border-zinc-200/30 bg-zinc-950/40 backdrop-blur-sm p-4 dark:border-zinc-800/50 dark:bg-zinc-950/50">
                <UFormField label="Team" size="sm" class="mb-0">
                    <USelect
                        :model-value="effectiveTeamId"
                        :items="
                            teams.map((team) => ({
                                label: team.name,
                                value: team.id,
                            }))
                        "
                        placeholder="Select team"
                        size="sm"
                        @update:model-value="updateTeam($event as string)"
                    />
                </UFormField>
            </div>

            <!-- Create tag form -->
            <div class="mb-4 rounded-2xl border border-zinc-200/30 bg-zinc-950/40 backdrop-blur-sm p-4 dark:border-zinc-800/50 dark:bg-zinc-950/50">
                <div class="flex gap-2">
                    <UInput
                        v-model="newTagName"
                        placeholder="Tag name"
                        size="sm"
                        :disabled="createTagMutation.isPending.value"
                        @keyup.enter="createTag"
                    />
                    <UButton
                        label="Add"
                        size="sm"
                        color="emerald"
                        :loading="createTagMutation.isPending.value"
                        :disabled="!newTagName.trim()"
                        @click="createTag"
                    />
                </div>
            </div>

            <!-- Tags list -->
            <div
                v-if="tags.length > 0"
                class="rounded-2xl border border-zinc-200/30 bg-zinc-950/40 backdrop-blur-sm p-4 dark:border-zinc-800/50 dark:bg-zinc-950/50"
            >
                <div class="flex flex-wrap gap-2">
                    <div
                        v-for="tag in tags"
                        :key="tag.id"
                        class="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm border border-emerald-500/30"
                    >
                        <span class="text-emerald-100">{{ tag.name }}</span>
                        <button
                            class="ml-auto text-emerald-500/60 hover:text-emerald-400 transition-colors"
                            :disabled="deleteTagMutation.isPending.value"
                            @click="deleteTag(tag.id)"
                        >
                            <UIcon
                                name="i-lucide-x"
                                class="size-3.5"
                            />
                        </button>
                    </div>
                </div>
            </div>

            <!-- Empty state -->
            <div
                v-else
                class="rounded-2xl border border-dashed border-zinc-400/30 p-4 text-center dark:border-zinc-700/30"
            >
                <p class="text-xs text-zinc-500">
                    No tags yet — add your first tag to start categorizing time entries
                </p>
            </div>
        </div>
    </div>
</template>
