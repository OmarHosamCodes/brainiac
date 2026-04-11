<script setup lang="ts">
import {
    WORKSPACE_TASK_DOMAINS,
    WORKSPACE_TASK_QUADRANTS,
    collectWorkspaceNodeTasks,
    createWorkspaceTimeOrchestratorSettings,
    getWorkspaceTaskDomainLabel,
    getWorkspaceTaskQuadrant,
    getWorkspaceTaskQuadrantLabel,
    type WorkspaceCollectedTask,
    type WorkspaceTaskDomain,
    type WorkspaceTaskQuadrant,
    type WorkspaceTimeOrchestratorBlock,
} from "@brainiac/workspace";

import WorkspaceOrchestratorSourcesModal from "~/components/workspace/node/blocks/WorkspaceOrchestratorSourcesModal.vue";
import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
    block: WorkspaceTimeOrchestratorBlock;
    tabId: string;
}>();

const {
    currentNode,
    allNodes,
    mutateTypedBlock,
    mutateCollectedTask,
    connectSource,
    disconnectSource,
    removeCollectedTask,
    addTaskToSource,
    navigateToSource,
    getTimeOrchestratorSummaryForBlock,
    formatRelativeTaskMeta,
} = useWorkspaceNodeEditorContext();

const sourcesModalOpen = ref(false);

const summary = computed(() => getTimeOrchestratorSummaryForBlock(props.block));

const openTasks = computed(() =>
    currentNode.value
        ? collectWorkspaceNodeTasks(currentNode.value).filter(
              ({ task }) => !task.completed,
          )
        : [],
);

const domainFilters = computed(() => {
    const counts = new Map<WorkspaceTaskDomain, number>();

    for (const domain of WORKSPACE_TASK_DOMAINS) {
        counts.set(domain, 0);
    }

    let unassigned = 0;

    for (const item of openTasks.value) {
        if (item.task.domain) {
            counts.set(
                item.task.domain,
                (counts.get(item.task.domain) ?? 0) + 1,
            );
            continue;
        }

        unassigned += 1;
    }

    return [
        ...WORKSPACE_TASK_DOMAINS.map((domain) => ({
            key: domain,
            label: getWorkspaceTaskDomainLabel(domain),
            count: counts.get(domain) ?? 0,
            active: props.block.settings.domains.includes(domain),
        })),
        {
            key: "unassigned" as const,
            label: "Unassigned",
            count: unassigned,
            active: props.block.settings.includeUnassigned,
        },
    ];
});

const quadrantFilters = computed(() => {
    const counts = new Map<WorkspaceTaskQuadrant, number>();

    for (const quadrant of WORKSPACE_TASK_QUADRANTS) {
        counts.set(quadrant, 0);
    }

    for (const item of openTasks.value) {
        const key = getWorkspaceTaskQuadrant(item.task);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return WORKSPACE_TASK_QUADRANTS.map((quadrant) => ({
        key: quadrant,
        label: getWorkspaceTaskQuadrantLabel(quadrant),
        count: counts.get(quadrant) ?? 0,
        active: props.block.settings.quadrants.includes(quadrant),
    }));
});

const primarySummaryCards = computed(() => {
    const currentSummary = summary.value;

    return [
        {
            key: "overdue",
            label: "Overdue",
            value: currentSummary?.overdue.length ?? 0,
            supportingLabel: "tasks",
            className: "border-error/30 bg-error/5",
            valueClassName: "text-error",
        },
        {
            key: "upcoming",
            label: "Upcoming",
            value: currentSummary?.upcoming.length ?? 0,
            supportingLabel: "next 7 days",
            className: "border-info/30 bg-info/5",
            valueClassName: "text-info",
        },
        {
            key: "high-priority",
            label: "High Priority",
            value: currentSummary?.highPriority.length ?? 0,
            supportingLabel: "tasks",
            className: "border-warning/30 bg-warning/5",
            valueClassName: "text-warning",
        },
        {
            key: "workload",
            label: "Estimated Workload",
            value: formatMinutes(currentSummary?.totalEstimateMinutes ?? 0),
            supportingLabel: `${currentSummary?.totalOpenTasks ?? 0} open task${
                (currentSummary?.totalOpenTasks ?? 0) === 1 ? "" : "s"
            }`,
            className: "border-primary/30 bg-primary/5",
            valueClassName: "text-primary",
        },
    ];
});

const secondarySummaryStats = computed(() => [
    {
        key: "open",
        label: "Open Tasks",
        value: String(summary.value?.totalOpenTasks ?? 0),
    },
    {
        key: "urgency",
        label: "Avg Urgency",
        value: String(summary.value?.averageUrgency ?? 0),
    },
    {
        key: "importance",
        label: "Avg Importance",
        value: String(summary.value?.averageImportance ?? 0),
    },
    {
        key: "quadrants",
        label: "Visible Quadrants",
        value: String(visibleQuadrants.value.length),
    },
]);

const visibleQuadrants = computed(() => {
    const currentSummary = summary.value;

    if (!currentSummary) {
        return [];
    }

    return props.block.settings.quadrants.map(
        (quadrant) => currentSummary.quadrants[quadrant],
    );
});

function updateSettings(
    mutator: (settings: WorkspaceTimeOrchestratorBlock["settings"]) => void,
) {
    mutateTypedBlock(
        props.tabId,
        props.block.id,
        "time-orchestrator",
        (entry) => {
            const nextSettings = createWorkspaceTimeOrchestratorSettings(
                entry.settings,
            );
            mutator(nextSettings);
            entry.settings =
                createWorkspaceTimeOrchestratorSettings(nextSettings);
        },
    );
}

function toggleDomain(domain: WorkspaceTaskDomain) {
    updateSettings((settings) => {
        settings.domains = settings.domains.includes(domain)
            ? settings.domains.filter((entry) => entry !== domain)
            : [...settings.domains, domain];
    });
}

function toggleUnassigned() {
    updateSettings((settings) => {
        settings.includeUnassigned = !settings.includeUnassigned;
    });
}

function toggleQuadrant(quadrant: WorkspaceTaskQuadrant) {
    updateSettings((settings) => {
        settings.quadrants = settings.quadrants.includes(quadrant)
            ? settings.quadrants.filter((entry) => entry !== quadrant)
            : [...settings.quadrants, quadrant];
    });
}

function resetFilters() {
    updateSettings((settings) => {
        settings.domains = [...WORKSPACE_TASK_DOMAINS];
        settings.includeUnassigned = true;
        settings.quadrants = [...WORKSPACE_TASK_QUADRANTS];
    });
}

function toggleTaskCompletion(item: WorkspaceCollectedTask) {
    mutateCollectedTask(item, (task) => {
        task.completed = !task.completed;
    });
}

function formatMinutes(minutes: number) {
    const roundedMinutes = Math.max(0, Math.round(minutes));

    if (roundedMinutes < 60) {
        return `${roundedMinutes} min`;
    }

    const hours = Math.floor(roundedMinutes / 60);
    const remainder = roundedMinutes % 60;

    if (remainder === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${remainder}m`;
}

function getTaskActionLabel(item: WorkspaceCollectedTask) {
    const taskLabel = item.task.text || "Untitled task";

    return item.task.completed
        ? `Reopen ${taskLabel}`
        : `Complete ${taskLabel}`;
}

function handleMutateTask(
    item: WorkspaceCollectedTask,
    mutator: (task: WorkspaceCollectedTask["task"]) => void,
) {
    mutateCollectedTask(item, mutator);
}
</script>

<template>
    <div class="space-y-6">
        <div
            class="rounded-3xl border border-muted/20 bg-elevated/10 p-5 backdrop-blur-sm"
        >
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="space-y-2">
                    <div class="flex items-center gap-2 text-primary">
                        <UIcon name="i-lucide-calendar-clock" class="size-5" />
                        <p
                            class="text-[10px] font-bold uppercase tracking-[0.2em]"
                        >
                            Time Orchestrator
                        </p>
                    </div>
                    <h3
                        class="text-lg font-bold tracking-tight text-highlighted"
                    >
                        Focus the workload view around what matters now
                    </h3>
                    <p class="max-w-2xl text-sm text-muted">
                        Saved filters keep this block aligned to the domains and
                        urgency quadrants you want leadership to review first.
                    </p>
                </div>

                <div class="flex items-center gap-2">
                    <UButton
                        color="primary"
                        variant="soft"
                        size="sm"
                        icon="i-lucide-plug-2"
                        class="rounded-full px-4"
                        aria-label="Manage connected sources"
                        @click="sourcesModalOpen = true"
                    >
                        Manage Sources
                    </UButton>

                    <UButton
                        color="neutral"
                        variant="soft"
                        size="sm"
                        icon="i-lucide-rotate-ccw"
                        class="rounded-full px-4"
                        aria-label="Reset time orchestrator filters"
                        @click="resetFilters"
                    >
                        Reset Filters
                    </UButton>
                </div>
            </div>

            <div class="mt-6 grid gap-6 lg:grid-cols-2">
                <fieldset class="space-y-3">
                    <legend
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >
                        Domain filters
                    </legend>
                    <div class="flex flex-wrap gap-2">
                        <UButton
                            v-for="domain in domainFilters"
                            :key="domain.key"
                            type="button"
                            size="sm"
                            :color="domain.active ? 'primary' : 'neutral'"
                            :variant="domain.active ? 'soft' : 'outline'"
                            class="rounded-xl"
                            :aria-pressed="domain.active"
                            :aria-label="`${domain.active ? 'Disable' : 'Enable'} ${domain.label} domain filter`"
                            @click="
                                domain.key === 'unassigned'
                                    ? toggleUnassigned()
                                    : toggleDomain(domain.key)
                            "
                        >
                            {{ domain.label }}
                            <span
                                class="ml-2 text-[10px] font-black opacity-60"
                            >
                                {{ domain.count }}
                            </span>
                        </UButton>
                    </div>
                </fieldset>

                <fieldset class="space-y-3">
                    <legend
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >
                        Quadrant filters
                    </legend>
                    <div class="flex flex-wrap gap-2">
                        <UButton
                            v-for="quadrant in quadrantFilters"
                            :key="quadrant.key"
                            type="button"
                            size="sm"
                            :color="quadrant.active ? 'primary' : 'neutral'"
                            :variant="quadrant.active ? 'soft' : 'outline'"
                            class="rounded-xl"
                            :aria-pressed="quadrant.active"
                            :aria-label="`${quadrant.active ? 'Disable' : 'Enable'} ${quadrant.label} quadrant filter`"
                            @click="toggleQuadrant(quadrant.key)"
                        >
                            {{ quadrant.label }}
                            <span
                                class="ml-2 text-[10px] font-black opacity-60"
                            >
                                {{ quadrant.count }}
                            </span>
                        </UButton>
                    </div>
                </fieldset>
            </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div
                v-for="card in primarySummaryCards"
                :key="card.key"
                class="rounded-3xl border p-5"
                :class="card.className"
            >
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    {{ card.label }}
                </p>
                <p
                    class="mt-2 text-2xl sm:text-3xl font-black tracking-tight"
                    :class="card.valueClassName"
                >
                    {{ card.value }}
                </p>
                <p
                    class="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted/40"
                >
                    {{ card.supportingLabel }}
                </p>
            </div>
        </div>

        <div class="rounded-3xl border border-muted/20 bg-default/40 px-5 py-4">
            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div
                    v-for="stat in secondarySummaryStats"
                    :key="stat.key"
                    class="space-y-1"
                >
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >
                        {{ stat.label }}
                    </p>
                    <p
                        class="text-lg font-black tracking-tight text-highlighted"
                    >
                        {{ stat.value }}
                    </p>
                </div>
            </div>
        </div>

        <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <section
                class="rounded-3xl border border-muted/20 bg-default/40 p-5"
            >
                <div class="flex items-center justify-between gap-3">
                    <div>
                        <p
                            class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                        >
                            Suggested next actions
                        </p>
                        <p class="mt-1 text-sm text-muted">
                            Highest-leverage tasks from the current filter set.
                        </p>
                    </div>
                    <UBadge
                        color="neutral"
                        variant="soft"
                        size="sm"
                        class="rounded-2xl"
                    >
                        {{ summary?.suggestedNextActions.length ?? 0 }} visible
                    </UBadge>
                </div>

                <ul class="mt-4 space-y-3">
                    <li
                        v-for="item in summary?.suggestedNextActions ?? []"
                        :key="`${block.id}-${item.task.id}`"
                        class="rounded-2xl border border-muted/20 bg-elevated/10 p-4"
                    >
                        <div
                            class="flex flex-wrap items-start justify-between gap-3"
                        >
                            <div class="min-w-0 flex-1 space-y-2">
                                <p
                                    class="font-bold leading-tight text-highlighted"
                                >
                                    {{ item.task.text || "Untitled task" }}
                                </p>

                                <div class="flex flex-wrap items-center gap-2">
                                    <UBadge
                                        color="neutral"
                                        variant="soft"
                                        size="sm"
                                        class="rounded-2xl"
                                    >
                                        {{ item.sourceNodeTitle }}
                                    </UBadge>
                                    <UBadge
                                        color="primary"
                                        variant="soft"
                                        size="sm"
                                        class="rounded-2xl"
                                    >
                                        {{ item.task.estimateMinutes }} min
                                    </UBadge>
                                </div>

                                <p
                                    class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted/40"
                                >
                                    {{ formatRelativeTaskMeta(item) }}
                                </p>
                            </div>

                            <UButton
                                size="xs"
                                :color="
                                    item.task.completed ? 'neutral' : 'primary'
                                "
                                variant="soft"
                                class="rounded-lg"
                                :aria-label="getTaskActionLabel(item)"
                                @click="toggleTaskCompletion(item)"
                            >
                                {{
                                    item.task.completed ? "Reopen" : "Complete"
                                }}
                            </UButton>
                        </div>
                    </li>
                </ul>

                <div
                    v-if="(summary?.suggestedNextActions.length ?? 0) === 0"
                    class="mt-4 rounded-2xl border border-dashed border-muted/20 bg-elevated/5 py-10 text-center"
                >
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >
                        No matching next actions
                    </p>
                    <p class="mt-2 text-sm text-muted">
                        Adjust the filters above to widen the view.
                    </p>
                </div>
            </section>

            <div class="space-y-6">
                <section
                    class="rounded-3xl border border-muted/20 bg-default/40 p-5"
                >
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <p
                                class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                            >
                                Domain load
                            </p>
                            <p class="mt-1 text-sm text-muted">
                                Open work grouped by team domain.
                            </p>
                        </div>
                        <UBadge
                            color="neutral"
                            variant="soft"
                            size="sm"
                            class="rounded-2xl"
                        >
                            {{ summary?.domainBreakdown.length ?? 0 }} domains
                        </UBadge>
                    </div>

                    <div class="mt-4 space-y-3">
                        <div
                            v-for="domain in summary?.domainBreakdown ?? []"
                            :key="domain.label"
                            class="rounded-2xl border border-muted/20 bg-elevated/5 p-4"
                        >
                            <div
                                class="flex items-center justify-between gap-3"
                            >
                                <p class="font-bold text-highlighted">
                                    {{ domain.label }}
                                </p>
                                <UBadge
                                    color="neutral"
                                    variant="soft"
                                    size="sm"
                                    class="rounded-lg"
                                >
                                    {{ formatMinutes(domain.estimateMinutes) }}
                                </UBadge>
                            </div>
                            <p class="mt-1 text-xs text-muted">
                                {{ domain.count }} open task{{
                                    domain.count === 1 ? "" : "s"
                                }}
                            </p>
                        </div>

                        <div
                            v-if="(summary?.domainBreakdown.length ?? 0) === 0"
                            class="rounded-2xl border border-dashed border-muted/20 bg-elevated/5 py-8 text-center"
                        >
                            <p class="text-sm text-muted">
                                No domain data for the active filters.
                            </p>
                        </div>
                    </div>
                </section>

                <section
                    class="rounded-3xl border border-muted/20 bg-default/40 p-5"
                >
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <p
                                class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                            >
                                Deadlines
                            </p>
                            <p class="mt-1 text-sm text-muted">
                                Tasks that need immediate or near-term
                                attention.
                            </p>
                        </div>
                    </div>

                    <div class="mt-4 space-y-5">
                        <div>
                            <p
                                class="text-[10px] font-bold uppercase tracking-widest text-error/60"
                            >
                                Overdue
                            </p>
                            <ul class="mt-2 space-y-2">
                                <li
                                    v-for="item in summary?.overdue ?? []"
                                    :key="`overdue-${item.task.id}`"
                                    class="rounded-2xl border border-error/15 bg-error/5 px-3 py-2"
                                >
                                    <p
                                        class="text-sm font-bold text-highlighted"
                                    >
                                        {{ item.task.text || "Untitled task" }}
                                    </p>
                                    <p class="mt-1 text-xs text-muted">
                                        {{ item.sourceNodeTitle }} ·
                                        {{ formatRelativeTaskMeta(item) }}
                                    </p>
                                </li>
                            </ul>
                            <p
                                v-if="(summary?.overdue.length ?? 0) === 0"
                                class="mt-2 text-xs text-muted"
                            >
                                Nothing overdue.
                            </p>
                        </div>

                        <div class="border-t border-muted/10 pt-5">
                            <p
                                class="text-[10px] font-bold uppercase tracking-widest text-primary/60"
                            >
                                Upcoming
                            </p>
                            <ul class="mt-2 space-y-2">
                                <li
                                    v-for="item in summary?.upcoming ?? []"
                                    :key="`upcoming-${item.task.id}`"
                                    class="rounded-2xl border border-primary/15 bg-primary/5 px-3 py-2"
                                >
                                    <p
                                        class="text-sm font-bold text-highlighted"
                                    >
                                        {{ item.task.text || "Untitled task" }}
                                    </p>
                                    <p class="mt-1 text-xs text-muted">
                                        {{ item.sourceNodeTitle }} ·
                                        {{ formatRelativeTaskMeta(item) }}
                                    </p>
                                </li>
                            </ul>
                            <p
                                v-if="(summary?.upcoming.length ?? 0) === 0"
                                class="mt-2 text-xs text-muted"
                            >
                                No tasks due in the next seven days.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>

        <div
            class="grid gap-4"
            :class="
                visibleQuadrants.length > 1
                    ? 'xl:grid-cols-2 2xl:grid-cols-4'
                    : ''
            "
        >
            <section
                v-for="quadrant in visibleQuadrants"
                :key="quadrant.key"
                class="rounded-3xl border border-muted/20 bg-default/40 p-5"
            >
                <div class="flex items-center justify-between gap-3">
                    <div>
                        <p class="text-sm font-bold text-highlighted">
                            {{ quadrant.label }}
                        </p>
                        <p
                            class="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                        >
                            {{ formatMinutes(quadrant.estimateMinutes) }}
                        </p>
                    </div>
                    <UBadge
                        color="neutral"
                        variant="soft"
                        size="sm"
                        class="rounded-lg"
                    >
                        {{ quadrant.count }}
                    </UBadge>
                </div>

                <ul class="mt-4 space-y-2">
                    <li
                        v-for="item in quadrant.tasks.slice(0, 4)"
                        :key="`${quadrant.key}-${item.task.id}`"
                        class="rounded-2xl border border-muted/20 bg-elevated/5 px-3 py-2"
                    >
                        <p class="text-xs font-semibold text-toned">
                            {{ item.task.text || "Untitled task" }}
                        </p>
                        <p
                            class="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted/40"
                        >
                            {{ formatRelativeTaskMeta(item) }}
                        </p>
                    </li>
                </ul>

                <p
                    v-if="quadrant.tasks.length === 0"
                    class="mt-4 text-xs text-muted"
                >
                    No tasks in this quadrant.
                </p>
            </section>
        </div>

        <WorkspaceOrchestratorSourcesModal
            v-if="currentNode"
            :open="sourcesModalOpen"
            :orchestrator-node="currentNode"
            :all-nodes="allNodes"
            @update:open="sourcesModalOpen = $event"
            @connect="connectSource"
            @disconnect="disconnectSource"
            @mutate-task="handleMutateTask"
            @remove-task="removeCollectedTask"
            @add-task="addTaskToSource"
            @navigate-to-source="navigateToSource"
        />
    </div>
</template>
