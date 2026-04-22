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
const isShowingDiscardConfirm = ref(false);

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
const selectedTeam = computed(
    () => teams.value.find((team) => team.id === effectiveTeamId.value) ?? null,
);

// Projects query (simplified - no sprint filtering)
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

// Tags query (new)
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

// Active timer query
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
const selectedProject = computed(
    () => projects.value.find((p) => p.id === selectedProjectId.value) ?? null,
);

// Watch to sync form with active timer
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
        // Tags would be loaded from the timer if tags feature is added to API
    },
    { immediate: true },
);

// Mutations
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

const trackerRefreshing = computed(
    () =>
        teamsQuery.isFetching.value ||
        projectsQuery.isFetching.value ||
        tagsQuery.isFetching.value ||
        activeTimerQuery.isFetching.value,
);

const trackerStatus = computed(() => {
    if (!authEnabled.value) {
        return {
            label: "Sign in required",
            tone: "neutral" as const,
            description: "Connect your account to start tracking.",
        };
    }

    if (!effectiveTeamId.value) {
        return {
            label: "Team required",
            tone: "warning" as const,
            description: "Connect this tracker to a team.",
        };
    }

    if (activeTimer.value) {
        return {
            label: "Running",
            tone: "success" as const,
            description: activeTimer.value.projectName,
        };
    }

    if (!selectedProjectId.value) {
        return {
            label: "Ready to start",
            tone: "primary" as const,
            description: "Select a project and click Start.",
        };
    }

    return {
        label: "Ready to track",
        tone: "primary" as const,
        description: selectedProject.value?.name ?? "Pick a project",
    };
});

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
        // Note: API will need to be updated to accept projectId + tags instead of sprintItemId
        // This is a simplified approach pending API refactor
        await startTimerMutation.mutateAsync({
            teamId,
            projectId: selectedProjectId.value,
            tagIds: selectedTagIds.value,
            description: timerDescription.value.trim(),
        });

        await refreshTrackerData();
        toast.add({
            title: "Timer started",
            description: `${selectedProject.value?.name ?? "Project"} is now being tracked.`,
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
    // Discard (not stop) - just close without saving
    // Implementation depends on whether API supports discard vs stop
    try {
        // For now, assume we need a new endpoint: timer.discard
        // If not available, this would just reset the UI
        await stopTimerMutation.mutateAsync({
            teamId: effectiveTeamId.value!,
            discard: true,
        });

        timerDescription.value = "";
        selectedTagIds.value = [];
        syncedTimerId = null;
        isShowingDiscardConfirm.value = false;
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
    <div class="space-y-6">
        <!-- Team binding -->
        <div v-if="!effectiveTeamId" class="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div class="flex items-start gap-3">
                <UIcon name="i-lucide-alert-circle" class="mt-0.5 size-5 flex-shrink-0 text-amber-600" />
                <div>
                    <p class="font-semibold text-amber-900">No team connected</p>
                    <p class="mt-1 text-sm text-amber-800">
                        Select a team above to start tracking time.
                    </p>
                </div>
            </div>
        </div>

        <!-- Main form & timer -->
        <div class="rounded-2xl border border-zinc-200/30 bg-zinc-950/40 backdrop-blur-sm p-6 dark:border-zinc-800/50 dark:bg-zinc-950/50">
            <div class="space-y-4">
                <!-- Team selector -->
                <div>
                    <UFormField label="Team" size="sm" class="mb-2">
                        <USelect
                            :model-value="effectiveTeamId"
                            :items="
                                teams.map((team) => ({
                                    label: `${team.name} · ${team.role}`,
                                    value: team.id,
                                }))
                            "
                            placeholder="Select a team"
                            size="sm"
                            :disabled="!authEnabled || teamsQuery.isPending.value"
                            @update:model-value="updateTeam($event as string | undefined)"
                        />
                    </UFormField>
                </div>

                <!-- Project selector -->
                <div>
                    <UFormField label="Project" size="sm" class="mb-2">
                        <USelect
                            v-model="selectedProjectId"
                            :items="
                                projects.map((project) => ({
                                    label: project.name,
                                    value: project.id,
                                }))
                            "
                            :placeholder="
                                !effectiveTeamId
                                    ? 'Select a team first'
                                    : 'Select a project'
                            "
                            size="sm"
                            :disabled="!effectiveTeamId || projectsQuery.isPending.value"
                        />
                    </UFormField>
                </div>

                <!-- Description input -->
                <div>
                    <UFormField label="What are you working on?" size="sm" class="mb-2">
                        <UInput
                            v-model="timerDescription"
                            placeholder="Describe the work (optional)"
                            size="sm"
                            :disabled="trackerBusy || !effectiveTeamId"
                        />
                    </UFormField>
                </div>

                <!-- Tags selector -->
                <div v-if="tags.length > 0">
                    <UFormField label="Tags" size="sm" class="mb-2">
                        <div class="flex flex-wrap gap-2">
                            <UButton
                                v-for="tag in tags"
                                :key="tag.id"
                                :variant="
                                    selectedTagIds.includes(tag.id)
                                        ? 'soft'
                                        : 'ghost'
                                "
                                :color="
                                    selectedTagIds.includes(tag.id)
                                        ? 'emerald'
                                        : 'gray'
                                "
                                size="xs"
                                class="rounded-full"
                                @click="
                                    selectedTagIds.includes(tag.id)
                                        ? (selectedTagIds = selectedTagIds.filter(
                                              (id) => id !== tag.id,
                                          ))
                                        : (selectedTagIds = [
                                              ...selectedTagIds,
                                              tag.id,
                                          ])
                                "
                            >
                                {{ tag.name }}
                            </UButton>
                        </div>
                    </UFormField>
                </div>

                <!-- Timer display (when running) -->
                <div
                    v-if="activeTimer"
                    class="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4"
                >
                    <div class="flex items-baseline justify-between">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                                Elapsed time
                            </p>
                            <p class="mt-1 font-mono text-4xl font-bold tracking-tight text-emerald-900 dark:text-emerald-100">
                                {{ formatDuration(elapsedSeconds) }}
                            </p>
                        </div>
                        <UBadge
                            color="emerald"
                            variant="subtle"
                            class="rounded-full px-3 py-1 animate-pulse"
                        >
                            <span class="inline-flex items-center gap-1.5">
                                <span class="inline-block size-2 rounded-full bg-emerald-500" />
                                Recording
                            </span>
                        </UBadge>
                    </div>
                </div>

                <!-- Status & action buttons -->
                <div class="flex items-end justify-between gap-4 pt-2">
                    <div class="flex-1">
                        <p
                            class="text-xs font-semibold uppercase tracking-widest"
                            :class="
                                trackerStatus.tone === 'success'
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-zinc-600 dark:text-zinc-400'
                            "
                        >
                            {{ trackerStatus.label }}
                        </p>
                        <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            {{ trackerStatus.description }}
                        </p>
                    </div>

                    <div class="flex gap-2">
                        <!-- Discard button (shown only when running) -->
                        <div v-if="activeTimer" class="relative">
                            <UButton
                                icon="i-lucide-more-vertical"
                                color="gray"
                                variant="ghost"
                                size="md"
                                @click="isShowingDiscardConfirm = !isShowingDiscardConfirm"
                            />
                            
                            <!-- Discard menu -->
                            <transition
                                enter-active-class="transition duration-150"
                                leave-active-class="transition duration-100"
                                enter-from-class="scale-95 opacity-0"
                                leave-to-class="scale-95 opacity-0"
                            >
                                <div
                                    v-if="isShowingDiscardConfirm"
                                    class="absolute right-0 top-full mt-2 rounded-lg border border-zinc-200/30 bg-zinc-950/90 backdrop-blur-sm p-3 dark:border-zinc-800/50 shadow-lg z-10 w-56"
                                >
                                    <p class="text-sm font-medium text-zinc-100">
                                        Discard this timer?
                                    </p>
                                    <p class="mt-1 text-xs text-zinc-400">
                                        Your time won't be saved.
                                    </p>
                                    <div class="mt-3 flex gap-2">
                                        <UButton
                                            label="Cancel"
                                            size="xs"
                                            color="gray"
                                            variant="ghost"
                                            class="flex-1"
                                            @click="isShowingDiscardConfirm = false"
                                        />
                                        <UButton
                                            label="Discard"
                                            size="xs"
                                            color="red"
                                            class="flex-1"
                                            :loading="trackerBusy"
                                            @click="discardTimer"
                                        />
                                    </div>
                                </div>
                            </transition>
                        </div>

                        <!-- Start / Stop button -->
                        <UButton
                            :label="activeTimer ? 'Stop' : 'Start'"
                            :color="activeTimer ? 'amber' : 'emerald'"
                            size="md"
                            class="min-w-24"
                            :disabled="!canStartTimer && !activeTimer"
                            :loading="trackerBusy"
                            @click="activeTimer ? stopTimer() : startTimer()"
                        />
                    </div>
                </div>

                <!-- Loading indicator -->
                <div
                    v-if="trackerRefreshing"
                    class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 pt-2"
                >
                    <UIcon name="i-lucide-loader-2" class="size-3 animate-spin" />
                    Syncing...
                </div>
            </div>
        </div>
    </div>
</template>
