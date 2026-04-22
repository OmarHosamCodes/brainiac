<script setup lang="ts">
import type { WorkspaceAgencyTimeTrackerBlock } from "@brainiac/workspace";
import { useMutation, useQuery } from "@tanstack/vue-query";
import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
    block: WorkspaceAgencyTimeTrackerBlock;
    tabId: string;
}>();

const { currentNode, mutateTypedBlock } = useWorkspaceNodeEditorContext();
const orpc = useOrpc();
const toast = useToast();
const authSession = useAuthSession();
const authEnabled = computed(() => Boolean(authSession.value?.data?.user));

const now = ref(Date.now());
const timerDescription = ref("");
const selectedProjectId = ref("");
const selectedTagIds = ref<string[]>([]);
const tagSearch = ref("");

let tickerHandle: ReturnType<typeof setInterval> | null = null;
let syncedTimerId: string | null = null;

onMounted(() => {
    tickerHandle = setInterval(() => {
        now.value = Date.now();
    }, 1_000);
});

onBeforeUnmount(() => {
    if (tickerHandle) {
        clearInterval(tickerHandle);
        tickerHandle = null;
    }
});

const teamsQuery = useQuery(
    computed(() => ({
        ...orpc.team.list.queryOptions(),
        enabled: authEnabled.value,
    })),
);

const teams = computed(() => teamsQuery.data.value?.items ?? []);
const teamIds = computed(() => new Set(teams.value.map((team) => team.id)));
const preferredTeamId = computed(
    () => props.block.teamId ?? currentNode.value?.teamId ?? "",
);
const effectiveTeamId = computed(() => {
    if (!preferredTeamId.value) {
        return teams.value[0]?.id ?? "";
    }
    return teamIds.value.has(preferredTeamId.value) ? preferredTeamId.value : "";
});

const projectsQuery = useQuery(
    computed(() => ({
        ...orpc.agencyOps.projects.list.queryOptions({
            input: {
                teamId: effectiveTeamId.value,
            },
        }),
        enabled: Boolean(effectiveTeamId.value),
    })),
);

const projects = computed(() => projectsQuery.data.value?.items ?? []);

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
const filteredTags = computed(() => {
    const query = tagSearch.value.trim().toLowerCase();
    if (!query) {
        return tags.value;
    }

    return tags.value.filter((tag) => tag.name.toLowerCase().includes(query));
});

const activeTimerQuery = useQuery(
    computed(() => ({
        ...orpc.agencyOps.timer.getActive.queryOptions({
            input: {
                teamId: effectiveTeamId.value || undefined,
            },
        }),
        enabled: Boolean(effectiveTeamId.value),
        refetchInterval: 10_000,
    })),
);

const activeTimer = computed(() => activeTimerQuery.data.value?.timer ?? null);

watch(
    activeTimer,
    (timer) => {
        if (!timer) {
            syncedTimerId = null;
            return;
        }
        if (syncedTimerId === timer.id) {
            return;
        }
        syncedTimerId = timer.id;
        timerDescription.value = timer.description;
        selectedProjectId.value = timer.projectId;
    },
    { immediate: true },
);

const startTimerMutation = useMutation(
    orpc.agencyOps.timer.start.mutationOptions(),
);
const stopTimerMutation = useMutation(
    orpc.agencyOps.timer.stop.mutationOptions(),
);

const elapsedSeconds = computed(() => {
    if (!activeTimer.value) {
        return 0;
    }
    const startedAt = new Date(activeTimer.value.startedAt).getTime();
    if (Number.isNaN(startedAt)) {
        return 0;
    }
    return Math.max(0, Math.floor((now.value - startedAt) / 1_000));
});

const canStartTimer = computed(
    () =>
        Boolean(effectiveTeamId.value && selectedProjectId.value && !activeTimer.value),
);

const trackerBusy = computed(
    () =>
        startTimerMutation.isPending.value || stopTimerMutation.isPending.value,
);

const discardMenuItems = computed(() => [
    [
        {
            label: "Discard timer",
            icon: "i-lucide-trash-2",
            color: "error" as const,
            onSelect: discardTimer,
        },
    ],
]);

function updateTeam(teamId: string | undefined) {
    mutateTypedBlock(
        props.tabId,
        props.block.id,
        "agency-time-tracker",
        (entry) => {
            entry.teamId = teamId || null;
        },
    );
}

function formatDuration(seconds: number) {
    const safeSeconds = Math.max(0, Math.round(seconds));
    const hours = Math.floor(safeSeconds / 3_600)
        .toString()
        .padStart(2, "0");
    const minutes = Math.floor((safeSeconds % 3_600) / 60)
        .toString()
        .padStart(2, "0");
    const secs = Math.floor(safeSeconds % 60)
        .toString()
        .padStart(2, "0");
    return `${hours}:${minutes}:${secs}`;
}

function toggleTag(tagId: string) {
    if (selectedTagIds.value.includes(tagId)) {
        selectedTagIds.value = selectedTagIds.value.filter((id) => id !== tagId);
    } else {
        selectedTagIds.value = [...selectedTagIds.value, tagId];
    }
}

async function refreshTrackerData() {
    await Promise.all([
        activeTimerQuery.refetch(),
        projectsQuery.refetch(),
        tagsQuery.refetch(),
    ]);
}

async function startTimer() {
    const teamId = effectiveTeamId.value;
    if (!teamId || !selectedProjectId.value) {
        return;
    }
    try {
        await startTimerMutation.mutateAsync({
            teamId,
            projectId: selectedProjectId.value,
            tagIds: selectedTagIds.value,
            description: timerDescription.value.trim(),
        });
        await refreshTrackerData();
        toast.add({
            title: "Timer started",
            color: "success",
        });
    } catch (error) {
        toast.add({
            title: "Unable to start timer",
            description: getErrorMessage(error, "Please try again."),
            color: "error",
        });
    }
}

async function stopTimer() {
    if (!effectiveTeamId.value) {
        return;
    }
    try {
        const result = await stopTimerMutation.mutateAsync({
            teamId: effectiveTeamId.value,
            tagIds: selectedTagIds.value,
            description: timerDescription.value.trim(),
        });

        timerDescription.value = "";
        selectedTagIds.value = [];
        syncedTimerId = null;
        await refreshTrackerData();

        toast.add({
            title: "Timer stopped",
            description: result.createdEntry
                ? `Saved ${formatDuration(result.createdEntry.durationSeconds)}.`
                : "The timer has been stopped.",
            color: "success",
        });
    } catch (error) {
        toast.add({
            title: "Unable to stop timer",
            description: getErrorMessage(error, "Please try again."),
            color: "error",
        });
    }
}

async function discardTimer() {
    try {
        await stopTimerMutation.mutateAsync({
            teamId: effectiveTeamId.value!,
            discard: true,
        });

        timerDescription.value = "";
        selectedTagIds.value = [];
        syncedTimerId = null;
        await refreshTrackerData();

        toast.add({
            title: "Timer discarded",
            description: "Time was not saved.",
            color: "neutral",
        });
    } catch (error) {
        toast.add({
            title: "Unable to discard timer",
            description: getErrorMessage(error, "Please try again."),
            color: "error",
        });
    }
}
</script>

<template>
    <div>
        <div
            v-if="!effectiveTeamId"
            class="mb-2 flex items-center gap-2"
        >
            <UIcon
                name="i-lucide-alert-circle"
                class="size-3.5 shrink-0 text-warning"
            />
            <USelect
                :model-value="effectiveTeamId"
                :items="
                    teams.map((team) => ({
                        label: `${team.name} · ${team.role}`,
                        value: team.id,
                    }))
                "
                placeholder="Select a team"
                size="xs"
                :disabled="!authEnabled || teamsQuery.isPending.value"
                @update:model-value="updateTeam($event as string | undefined)"
            />
        </div>

        <div class="flex items-center gap-2">
            <UInput
                v-model="timerDescription"
                placeholder="What are you working on?"
                size="sm"
                class="min-w-0 flex-1"
                :disabled="trackerBusy || !effectiveTeamId"
            />

            <USelect
                v-model="selectedProjectId"
                :items="
                    projects.map((project) => ({
                        label: project.name,
                        value: project.id,
                    }))
                "
                :placeholder="!effectiveTeamId ? 'Team first' : 'Project'"
                size="sm"
                class="w-40 shrink-0"
                :disabled="!effectiveTeamId || projectsQuery.isPending.value"
            />

            <div v-if="tags.length > 0" class="shrink-0">
                <UPopover :content="{ align: 'end' }">
                    <UButton
                        icon="i-lucide-tag"
                        size="xs"
                        variant="ghost"
                        :color="selectedTagIds.length > 0 ? 'primary' : 'neutral'"
                    />

                    <template #content>
                        <div class="w-64 space-y-2 p-2">
                            <UInput
                                v-model="tagSearch"
                                icon="i-lucide-search"
                                placeholder="Search tags"
                                size="xs"
                            />

                            <div class="flex max-h-52 flex-wrap gap-1 overflow-y-auto">
                                <UButton
                                    v-for="tag in filteredTags"
                                    :key="tag.id"
                                    :variant="
                                        selectedTagIds.includes(tag.id)
                                            ? 'soft'
                                            : 'ghost'
                                    "
                                    :color="
                                        selectedTagIds.includes(tag.id)
                                            ? 'primary'
                                            : 'neutral'
                                    "
                                    size="xs"
                                    class="rounded-full"
                                    @click="toggleTag(tag.id)"
                                >
                                    {{ tag.name }}
                                </UButton>

                                <div
                                    v-if="filteredTags.length === 0"
                                    class="px-1 py-2 text-xs text-muted"
                                >
                                    No matching tags.
                                </div>
                            </div>
                        </div>
                    </template>
                </UPopover>
            </div>

            <UButton
                :label="
                    activeTimer ? formatDuration(elapsedSeconds) : 'Start'
                "
                :color="activeTimer ? 'warning' : 'primary'"
                size="sm"
                class="min-w-24 shrink-0 font-mono tabular-nums"
                :disabled="!canStartTimer && !activeTimer"
                :loading="trackerBusy"
                @click="activeTimer ? stopTimer() : startTimer()"
            />

            <UDropdownMenu
                v-if="activeTimer"
                :items="discardMenuItems"
                :content="{ align: 'end' }"
            >
                <UButton
                    icon="i-lucide-more-vertical"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                />
            </UDropdownMenu>
        </div>
    </div>
</template>
