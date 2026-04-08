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
const selectedSprintId = ref("");
const selectedSprintItemId = ref("");
const timerDescription = ref("");

let tickerHandle: ReturnType<typeof setInterval> | null = null;
let syncedTimerId: string | null = null;

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
});

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

    return teamIds.value.has(preferredTeamId.value)
        ? preferredTeamId.value
        : "";
});
const selectedTeam = computed(
    () => teams.value.find((team) => team.id === effectiveTeamId.value) ?? null,
);

const sprintsQuery = useQuery(
    computed(() => ({
        ...orpc.agencyOps.sprints.list.queryOptions({
            input: {
                teamId: effectiveTeamId.value,
                statuses: ["active", "planned"],
            },
        }),
        enabled: Boolean(effectiveTeamId.value),
    })),
);

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

const sprints = computed(() => sprintsQuery.data.value?.items ?? []);
const activeTimer = computed(() => activeTimerQuery.data.value?.timer ?? null);

watch(
    [sprints, activeTimer],
    ([nextSprints, timer]) => {
        const preferredSprintId = timer?.sprintId ?? "";

        if (
            selectedSprintId.value &&
            nextSprints.some((sprint) => sprint.id === selectedSprintId.value)
        ) {
            return;
        }

        selectedSprintId.value =
            nextSprints.find((sprint) => sprint.id === preferredSprintId)?.id ??
            nextSprints.find((sprint) => sprint.status === "active")?.id ??
            nextSprints[0]?.id ??
            "";
    },
    { immediate: true },
);

const sprintItemsQuery = useQuery(
    computed(() => ({
        ...orpc.agencyOps.sprintItems.list.queryOptions({
            input: {
                teamId: effectiveTeamId.value,
                sprintId: selectedSprintId.value,
            },
        }),
        enabled: Boolean(effectiveTeamId.value && selectedSprintId.value),
    })),
);

const sprintItems = computed(() => sprintItemsQuery.data.value?.items ?? []);
const selectedSprintItem = computed(
    () =>
        sprintItems.value.find(
            (item) => item.id === selectedSprintItemId.value,
        ) ?? null,
);
const sprintItemOptions = computed(() =>
    sprintItems.value.map((item) => ({
        label: `${item.title} · ${item.status}`,
        value: item.id,
    })),
);

watch(
    [sprintItems, activeTimer],
    ([nextItems, timer]) => {
        const preferredSprintItemId = timer?.sprintItemId ?? "";

        if (
            selectedSprintItemId.value &&
            nextItems.some((item) => item.id === selectedSprintItemId.value)
        ) {
            return;
        }

        selectedSprintItemId.value =
            nextItems.find((item) => item.id === preferredSprintItemId)?.id ??
            nextItems[0]?.id ??
            "";
    },
    { immediate: true },
);

const recentEntriesQuery = useQuery(
    computed(() => ({
        ...orpc.agencyOps.timeEntries.listMine.queryOptions({
            input: {
                teamId: effectiveTeamId.value,
                page: 1,
                pageSize: 5,
            },
        }),
        enabled: Boolean(effectiveTeamId.value),
    })),
);

const recentEntries = computed(
    () => recentEntriesQuery.data.value?.items ?? [],
);
const weekSummary = computed(
    () => recentEntriesQuery.data.value?.weekSummary ?? null,
);

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

const activeTimerStartedLabel = computed(() => {
    if (!activeTimer.value) {
        return null;
    }

    return formatDateTime(activeTimer.value.startedAt);
});

const canStartTimer = computed(() =>
    Boolean(
        effectiveTeamId.value &&
        selectedSprintItemId.value &&
        !activeTimer.value,
    ),
);
const trackerBusy = computed(
    () =>
        startTimerMutation.isPending.value || stopTimerMutation.isPending.value,
);
const trackerRefreshing = computed(
    () =>
        teamsQuery.isFetching.value ||
        sprintsQuery.isFetching.value ||
        sprintItemsQuery.isFetching.value ||
        activeTimerQuery.isFetching.value ||
        recentEntriesQuery.isFetching.value,
);
const trackerStatus = computed(() => {
    if (!authEnabled.value) {
        return {
            label: "Sign in required",
            tone: "neutral" as const,
            description:
                "Connect your account to load teams, sprints, and time entries.",
        };
    }

    if (!effectiveTeamId.value) {
        return {
            label: "Team required",
            tone: "warning" as const,
            description: "Bind this tracker to a team before starting timers.",
        };
    }

    if (activeTimer.value) {
        return {
            label: "Running",
            tone: "success" as const,
            description: `${activeTimer.value.projectName} · ${activeTimer.value.sprintItemTitle}`,
        };
    }

    if (!selectedSprintId.value || !selectedSprintItemId.value) {
        return {
            label: "Pick a sprint item",
            tone: "warning" as const,
            description: "Choose a sprint and task before you start the timer.",
        };
    }

    return {
        label: "Ready to track",
        tone: "primary" as const,
        description: "Your next timer will attach to the selected sprint item.",
    };
});

const summaryCards = computed(() => [
    {
        key: "status",
        label: "Tracker State",
        value: trackerStatus.value.label,
        supporting: activeTimer.value
            ? formatDuration(elapsedSeconds.value)
            : "No active timer",
        accentClass: activeTimer.value ? "text-success" : "text-highlighted",
    },
    {
        key: "work",
        label: "Current Focus",
        value:
            activeTimer.value?.sprintItemTitle ||
            selectedSprintItem.value?.title ||
            "No task selected",
        supporting:
            activeTimer.value?.projectName ||
            selectedSprintItem.value?.projectName ||
            "Choose a sprint item to start tracking",
        accentClass: "text-highlighted",
    },
    {
        key: "week",
        label: "This Week",
        value: formatDuration(weekSummary.value?.totalSeconds ?? 0),
        supporting: `${recentEntriesQuery.data.value?.total ?? 0} logged entr${
            (recentEntriesQuery.data.value?.total ?? 0) === 1 ? "y" : "ies"
        }`,
        accentClass: "text-primary",
    },
    {
        key: "team",
        label: "Team Context",
        value: selectedTeam.value?.name || "No team selected",
        supporting: selectedTeam.value
            ? selectedTeam.value.role
            : "Bind the block to a team",
        accentClass: "text-highlighted",
    },
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

function toggleRecentEntries(showRecentEntries: boolean) {
    mutateTypedBlock(
        props.tabId,
        props.block.id,
        "agency-time-tracker",
        (entry) => {
            entry.showRecentEntries = showRecentEntries;
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
    const remainingSeconds = Math.floor(safeSeconds % 60)
        .toString()
        .padStart(2, "0");

    return `${hours}:${minutes}:${remainingSeconds}`;
}

function formatDateTime(value: string | null | undefined) {
    if (!value) {
        return "No timestamp";
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return "Invalid date";
    }

    return dateTimeFormatter.format(parsed);
}

async function refreshTrackerData() {
    await Promise.all([
        activeTimerQuery.refetch(),
        sprintItemsQuery.refetch(),
        recentEntriesQuery.refetch(),
    ]);
}

async function startTimer() {
    const teamId = effectiveTeamId.value;

    if (!teamId || !selectedSprintItemId.value) {
        return;
    }

    try {
        await startTimerMutation.mutateAsync({
            teamId,
            sprintItemId: selectedSprintItemId.value,
            description: timerDescription.value.trim(),
        });

        await refreshTrackerData();
        toast.add({
            title: "Timer started",
            description: selectedSprintItem.value
                ? `${selectedSprintItem.value.title} is now being tracked.`
                : "Your timer is now running.",
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
            description: timerDescription.value.trim(),
        });

        timerDescription.value = "";
        syncedTimerId = null;
        await refreshTrackerData();

        toast.add({
            title: "Timer stopped",
            description: result.createdEntry
                ? `Saved ${formatDuration(result.createdEntry.durationSeconds)} to ${result.createdEntry.sprintItemTitle}.`
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
</script>

<template>
    <div class="space-y-6">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div
                v-for="card in summaryCards"
                :key="card.key"
                class="rounded-3xl border border-muted/20 bg-elevated/10 p-5"
            >
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    {{ card.label }}
                </p>
                <p
                    class="mt-2 text-2xl font-black tracking-tight sm:text-3xl"
                    :class="card.accentClass"
                >
                    {{ card.value }}
                </p>
                <p class="mt-2 text-sm text-muted">
                    {{ card.supporting }}
                </p>
            </div>
        </div>

        <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-4">
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h3 class="text-sm font-semibold text-highlighted">
                        Tracker setup
                    </h3>
                    <p class="mt-1 text-sm text-muted">
                        Switch team context, choose the sprint item, then start
                        or stop your active timer.
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <UBadge
                        :color="trackerStatus.tone"
                        variant="soft"
                        class="rounded-full"
                    >
                        {{ trackerStatus.label }}
                    </UBadge>
                    <UBadge
                        v-if="trackerBusy || trackerRefreshing"
                        color="neutral"
                        variant="soft"
                        class="rounded-full"
                    >
                        <span class="inline-flex items-center gap-1.5">
                            <UIcon
                                name="i-lucide-loader-2"
                                class="size-3.5 animate-spin"
                            />
                            Syncing
                        </span>
                    </UBadge>
                </div>
            </div>

            <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <UFormField label="Team binding" size="sm">
                    <USelect
                        :model-value="effectiveTeamId"
                        :items="
                            teams.map((team) => ({
                                label: `${team.name} (${team.role})`,
                                value: team.id,
                            }))
                        "
                        placeholder="Select a team"
                        size="sm"
                        :disabled="!authEnabled || teamsQuery.isPending.value"
                        @update:model-value="
                            updateTeam($event as string | undefined)
                        "
                    />
                </UFormField>

                <UFormField label="Sprint" size="sm">
                    <USelect
                        v-model="selectedSprintId"
                        :items="
                            sprints.map((sprint) => ({
                                label: `${sprint.name} (${sprint.status})`,
                                value: sprint.id,
                            }))
                        "
                        placeholder="Select sprint"
                        size="sm"
                        :disabled="
                            !effectiveTeamId || sprintsQuery.isPending.value
                        "
                    />
                </UFormField>

                <UFormField label="Task / step" size="sm">
                    <USelect
                        v-model="selectedSprintItemId"
                        :items="sprintItemOptions"
                        placeholder="Select sprint item"
                        size="sm"
                        :disabled="
                            !selectedSprintId ||
                            sprintItemsQuery.isPending.value
                        "
                    />
                </UFormField>

                <label
                    class="flex items-center gap-3 rounded-2xl border border-muted/20 bg-default/60 px-3 py-2"
                >
                    <UCheckbox
                        :model-value="block.showRecentEntries"
                        @update:model-value="
                            toggleRecentEntries(Boolean($event))
                        "
                    />
                    <div>
                        <p class="text-sm font-medium text-highlighted">
                            Show recent entries
                        </p>
                        <p class="text-xs text-muted">
                            Keep the latest tracked work visible in the block.
                        </p>
                    </div>
                </label>
            </div>
        </div>

        <UAlert
            v-if="!authEnabled"
            color="warning"
            variant="soft"
            icon="i-lucide-lock"
            title="Sign in required"
            description="Connect your account to load team time-tracking data."
        />

        <UAlert
            v-else-if="teamsQuery.error.value"
            color="error"
            variant="soft"
            icon="i-lucide-alert-triangle"
            title="Unable to load teams"
            :description="
                getErrorMessage(
                    teamsQuery.error.value,
                    'Please refresh and try again.',
                )
            "
        />

        <UAlert
            v-else-if="!effectiveTeamId"
            color="warning"
            variant="soft"
            icon="i-lucide-users-round"
            title="Team required"
            description="Bind this tracker to a team before starting timers."
        />

        <section class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="space-y-2">
                    <div class="flex flex-wrap items-center gap-2">
                        <p
                            class="text-xs font-bold uppercase tracking-[0.2em] text-muted"
                        >
                            Active timer
                        </p>
                        <UBadge
                            :color="trackerStatus.tone"
                            variant="soft"
                            class="rounded-full"
                        >
                            {{ trackerStatus.label }}
                        </UBadge>
                    </div>

                    <p
                        class="text-3xl font-black tracking-tight text-highlighted"
                    >
                        {{ formatDuration(elapsedSeconds) }}
                    </p>

                    <p v-if="activeTimer" class="text-sm text-muted">
                        {{ activeTimer.projectName }} ·
                        {{ activeTimer.sprintItemTitle }}
                    </p>
                    <p v-else class="text-sm text-muted">
                        {{ trackerStatus.description }}
                    </p>

                    <div
                        v-if="activeTimer"
                        class="flex flex-wrap items-center gap-2 text-xs text-muted"
                    >
                        <UBadge
                            color="neutral"
                            variant="soft"
                            class="rounded-full"
                        >
                            Started {{ activeTimerStartedLabel }}
                        </UBadge>
                        <UBadge
                            v-if="activeTimer.sprintName"
                            color="neutral"
                            variant="soft"
                            class="rounded-full"
                        >
                            {{ activeTimer.sprintName }}
                        </UBadge>
                        <UBadge
                            color="neutral"
                            variant="soft"
                            class="rounded-full"
                        >
                            {{ activeTimer.sprintItemType }}
                        </UBadge>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <UButton
                        color="primary"
                        icon="i-lucide-play"
                        :loading="startTimerMutation.isPending.value"
                        :disabled="!canStartTimer"
                        class="rounded-full px-4"
                        @click="startTimer"
                    >
                        Start timer
                    </UButton>
                    <UButton
                        color="neutral"
                        variant="soft"
                        icon="i-lucide-square"
                        :loading="stopTimerMutation.isPending.value"
                        :disabled="!activeTimer"
                        class="rounded-full px-4"
                        @click="stopTimer"
                    >
                        Stop timer
                    </UButton>
                </div>
            </div>

            <div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
                <UFormField label="Work log note" size="sm">
                    <UTextarea
                        v-model="timerDescription"
                        :rows="3"
                        autoresize
                        placeholder="Capture what you are working on, blockers, or the next handoff."
                    />
                </UFormField>

                <div
                    class="rounded-2xl border border-muted/20 bg-default/40 p-4"
                >
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >
                        Ready to start
                    </p>
                    <p class="mt-2 text-sm font-semibold text-highlighted">
                        {{
                            selectedSprintItem?.title || "Choose a sprint item"
                        }}
                    </p>
                    <p class="mt-1 text-sm text-muted">
                        {{
                            selectedSprintItem?.projectName ||
                            "Your active timer will appear here once a task is selected."
                        }}
                    </p>
                    <p
                        v-if="selectedSprintItem"
                        class="mt-3 text-xs text-muted"
                    >
                        {{ selectedSprintItem.status }} ·
                        {{ selectedSprintItem.type }}
                    </p>
                </div>
            </div>
        </section>

        <section
            v-if="block.showRecentEntries"
            class="space-y-4 rounded-3xl border border-muted/20 bg-elevated/10 p-4"
        >
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 class="text-sm font-semibold text-highlighted">
                        Recent entries
                    </h3>
                    <p class="mt-1 text-sm text-muted">
                        Review what was logged this week so context switching
                        stays visible.
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <UBadge color="neutral" variant="soft" class="rounded-full">
                        {{ recentEntries.length }} shown
                    </UBadge>
                    <UBadge color="primary" variant="soft" class="rounded-full">
                        {{
                            formatDuration(weekSummary?.totalSeconds ?? 0)
                        }}
                        this week
                    </UBadge>
                </div>
            </div>

            <UAlert
                v-if="recentEntriesQuery.error.value"
                color="error"
                variant="soft"
                icon="i-lucide-alert-triangle"
                title="Unable to load recent entries"
                :description="
                    getErrorMessage(
                        recentEntriesQuery.error.value,
                        'Please refresh and try again.',
                    )
                "
            />

            <div
                v-else-if="recentEntries.length === 0"
                class="rounded-2xl border border-dashed border-muted/30 bg-default/30 p-4 text-sm text-muted"
            >
                Start and stop a timer to capture your first entry for this
                team.
            </div>

            <div v-else class="space-y-3">
                <article
                    v-for="entry in recentEntries"
                    :key="entry.id"
                    class="rounded-2xl border border-muted/20 bg-default/70 p-4"
                >
                    <div
                        class="flex flex-wrap items-start justify-between gap-3"
                    >
                        <div>
                            <p class="text-sm font-semibold text-highlighted">
                                {{ entry.sprintItemTitle }}
                            </p>
                            <p class="mt-1 text-xs text-muted">
                                {{ entry.projectName }} · {{ entry.clientName }}
                            </p>
                        </div>

                        <div class="flex flex-wrap items-center gap-2">
                            <UBadge
                                color="primary"
                                variant="soft"
                                class="rounded-full"
                            >
                                {{ formatDuration(entry.durationSeconds) }}
                            </UBadge>
                            <UBadge
                                color="neutral"
                                variant="soft"
                                class="rounded-full"
                            >
                                {{ formatDateTime(entry.startedAt) }}
                            </UBadge>
                        </div>
                    </div>

                    <p v-if="entry.description" class="mt-3 text-sm text-toned">
                        {{ entry.description }}
                    </p>
                </article>
            </div>
        </section>
    </div>
</template>
