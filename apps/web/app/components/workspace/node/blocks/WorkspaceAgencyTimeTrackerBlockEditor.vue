<script setup lang="ts">
import type { SelectMenuItem } from "@nuxt/ui";
import type { WorkspaceAgencyTimeTrackerBlock } from "@brainiac/workspace";
import { useQuery } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { useAgencyTimeTrackingStore } from "~/stores/agency-time-tracking";
import { normalizeAgencyLinkUrl } from "~/utils/normalize-agency-link-url";

const props = defineProps<{
    block: WorkspaceAgencyTimeTrackerBlock;
    tabId: string;
}>();

const { currentNode, mutateTypedBlock } = useWorkspaceNodeEditorContext();
const orpc = useOrpc();
const authSession = useAuthSession();
const authEnabled = computed(() => Boolean(authSession.value?.data?.user));
const agencyTimeTrackingStore = useAgencyTimeTrackingStore();
const { draftByTeam, isTimerMutationPending } = storeToRefs(
    agencyTimeTrackingStore,
);

const now = ref(Date.now());
const tagSearch = ref("");
const projectSearchTerm = ref("");

let tickerHandle: ReturnType<typeof setInterval> | null = null;

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
const projectSelectItems = computed<SelectMenuItem[]>(() => {
    const query = projectSearchTerm.value.trim().toLowerCase();
    const filteredProjects = query
        ? projects.value.filter((project) => {
              const searchableText = `${project.name} ${project.clientName}`.toLowerCase();
              return searchableText.includes(query);
          })
        : projects.value;
    const groupedProjects = new Map<string, typeof projects.value>();

    for (const project of filteredProjects) {
        const existingProjects = groupedProjects.get(project.clientName);

        if (existingProjects) {
            existingProjects.push(project);
            continue;
        }

        groupedProjects.set(project.clientName, [project]);
    }

    return [...groupedProjects.entries()]
        .sort(([leftClient], [rightClient]) =>
            leftClient.localeCompare(rightClient),
        )
        .flatMap(([clientName, clientProjects]) => [
            {
                type: "label" as const,
                label: clientName,
            },
            ...[...clientProjects]
                 .sort((leftProject, rightProject) =>
                     leftProject.name.localeCompare(rightProject.name),
                 )
                 .map((project) => ({
                     label: project.name,
                     value: project.id,
                     clientName,
                 })),
         ]);
 });

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
const activeTimerQueryKey = computed(() =>
    orpc.agencyOps.timer.getActive.queryOptions({
        input: {
            teamId: effectiveTeamId.value || undefined,
        },
    }).queryKey,
);
const trackerDraft = computed(() =>
    effectiveTeamId.value ? draftByTeam.value[effectiveTeamId.value] ?? null : null,
);
const timerDescription = computed({
    get: () => trackerDraft.value?.description ?? "",
    set: (value: string) => {
        if (!effectiveTeamId.value) {
            return;
        }

        agencyTimeTrackingStore.setTrackerDescription(effectiveTeamId.value, value);
    },
});
const selectedProjectId = computed({
    get: () => trackerDraft.value?.projectId ?? "",
    set: (value: string) => {
        if (!effectiveTeamId.value) {
            return;
        }

        agencyTimeTrackingStore.setTrackerProjectId(effectiveTeamId.value, value || "");
    },
});
const selectedTagIds = computed({
    get: () => trackerDraft.value?.selectedTagIds ?? [],
    set: (value: string[]) => {
        if (!effectiveTeamId.value) {
            return;
        }

        agencyTimeTrackingStore.setTrackerSelectedTagIds(
            effectiveTeamId.value,
            value ?? [],
        );
    },
});
const timerLinkUrl = computed({
    get: () => trackerDraft.value?.linkUrl ?? "",
    set: (value: string) => {
        if (!effectiveTeamId.value) {
            return;
        }

        agencyTimeTrackingStore.setTrackerLinkUrl(effectiveTeamId.value, value);
    },
});
const selectedProject = computed(
    () =>
        projects.value.find((project) => project.id === selectedProjectId.value) ?? null,
);
const selectedTags = computed(() => {
    const selectedIds = new Set(selectedTagIds.value);

    return tags.value.filter((tag) => selectedIds.has(tag.id));
});
const linkUrlState = computed(() => normalizeAgencyLinkUrl(timerLinkUrl.value));
const hasValidLinkUrl = computed(() => Boolean(linkUrlState.value.normalizedUrl));

watch(
    effectiveTeamId,
    (teamId) => {
        if (!teamId) {
            return;
        }

        agencyTimeTrackingStore.ensureTrackerDraft(teamId);
    },
    { immediate: true },
);

watch(
    activeTimer,
    (timer) => {
        if (!effectiveTeamId.value) {
            return;
        }

        agencyTimeTrackingStore.syncDraftFromActiveTimer(
            effectiveTeamId.value,
            timer,
        );
    },
    { immediate: true },
);

watch(
    () => ({
        teamId: effectiveTeamId.value,
        queryKey: activeTimerQueryKey.value,
    }),
    (next, previous) => {
        if (previous?.teamId) {
            agencyTimeTrackingStore.unregisterActiveTimerQuery(previous.queryKey);
        }

        if (!next.teamId) {
            return;
        }

        agencyTimeTrackingStore.registerActiveTimerQuery({
            teamId: next.teamId,
            queryKey: next.queryKey,
        });
    },
    { immediate: true },
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
        Boolean(effectiveTeamId.value && selectedProject.value && !activeTimer.value),
);
const canStopTimer = computed(
    () =>
        Boolean(
            activeTimer.value &&
                selectedProjectId.value &&
                selectedTagIds.value.length > 0,
        ),
);
const stopValidationHint = computed(() => {
    if (!activeTimer.value || canStopTimer.value) {
        return "";
    }

    const missingRequirements: string[] = [];

    if (!selectedProjectId.value) {
        missingRequirements.push("a project");
    }

    if (selectedTagIds.value.length === 0) {
        missingRequirements.push("at least one tag");
    }

    if (missingRequirements.length === 0) {
        return "";
    }

    return `Select ${missingRequirements.join(" and ")} to stop and save this timer.`;
});

const trackerBusy = computed(() => isTimerMutationPending.value);

const discardMenuItems = computed(() => [
    [
        {
            label: "Discard timer",
            icon: "i-lucide-trash-2",
            color: "error" as const,
            onSelect: () => {
                void discardTimer();
            },
        },
    ],
]);

onBeforeUnmount(() => {
    agencyTimeTrackingStore.unregisterActiveTimerQuery(activeTimerQueryKey.value);
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

function toggleTag(tagId: string) {
    if (!effectiveTeamId.value) {
        return;
    }

    agencyTimeTrackingStore.toggleTrackerTag(effectiveTeamId.value, tagId);
}

async function startTimer() {
    const teamId = effectiveTeamId.value;
    const project = selectedProject.value;

    if (!teamId || !project) {
        return;
    }

    await agencyTimeTrackingStore.startTimer({
        teamId,
        project,
        tagIds: [...selectedTagIds.value],
        selectedTags: [...selectedTags.value],
        description: timerDescription.value,
        linkUrl: timerLinkUrl.value,
    });
}

async function stopTimer() {
    const teamId = effectiveTeamId.value;

    if (!teamId || !activeTimer.value || !canStopTimer.value) {
        return;
    }

    await agencyTimeTrackingStore.stopTimer({
        teamId,
        activeTimer: activeTimer.value,
        tagIds: [...selectedTagIds.value],
        selectedTags: [...selectedTags.value],
        description: timerDescription.value,
        linkUrl: timerLinkUrl.value,
    });
}

async function discardTimer() {
    if (!effectiveTeamId.value) {
        return;
    }

    await agencyTimeTrackingStore.stopTimer({
        teamId: effectiveTeamId.value,
        activeTimer: activeTimer.value,
        tagIds: [...selectedTagIds.value],
        selectedTags: [...selectedTags.value],
        description: timerDescription.value,
        linkUrl: timerLinkUrl.value,
        discard: true,
    });
}
</script>

<template>
    <div class="space-y-2">
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

        <div class="flex flex-wrap items-center gap-2">
            <UInput
                v-model="timerDescription"
                placeholder="What are you working on?"
                size="sm"
                class="min-w-0 flex-1"
                :disabled="trackerBusy || !effectiveTeamId"
            />

            <USelectMenu
                v-model="selectedProjectId"
                v-model:search-term="projectSearchTerm"
                :items="projectSelectItems"
                :placeholder="!effectiveTeamId ? 'Team first' : 'Project'"
                :search-input="{
                    placeholder: 'Search projects or clients',
                }"
                :content="{ align: 'start' }"
                size="sm"
                class="w-40 shrink-0"
                ignore-filter
                value-key="value"
                :ui="{
                    content: 'max-h-72 overflow-hidden',
                    viewport: 'max-h-72 overflow-y-auto',
                }"
                :disabled="
                    !effectiveTeamId ||
                    projectsQuery.isPending.value ||
                    Boolean(activeTimer)
                "
            />

            <div class="shrink-0">
                <UPopover :content="{ align: 'end' }">
                    <UButton
                        icon="i-lucide-tag"
                        size="xs"
                        variant="ghost"
                        :color="selectedTagIds.length > 0 ? 'primary' : 'neutral'"
                        :disabled="trackerBusy || !effectiveTeamId"
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

            <div class="shrink-0">
                <UPopover :content="{ align: 'end' }">
                    <UButton
                        icon="i-lucide-link"
                        size="xs"
                        variant="ghost"
                        :color="hasValidLinkUrl ? 'primary' : 'neutral'"
                        :disabled="trackerBusy || !effectiveTeamId"
                    />

                    <template #content>
                        <div class="w-72 space-y-2 p-2">
                            <UInput
                                v-model="timerLinkUrl"
                                icon="i-lucide-link"
                                placeholder="Paste a task, ticket, or brief URL"
                                size="xs"
                            />

                            <div class="flex items-center justify-between gap-2">
                                <p
                                    v-if="linkUrlState.error"
                                    class="text-[11px] text-error"
                                >
                                    {{ linkUrlState.error }}
                                </p>
                                <p
                                    v-else-if="hasValidLinkUrl"
                                    class="truncate text-[11px] text-muted"
                                >
                                    {{ linkUrlState.normalizedUrl }}
                                </p>
                                <span v-else class="text-[11px] text-muted">
                                    Link this entry to a task or brief.
                                </span>

                                <UButton
                                    label="Clear"
                                    color="neutral"
                                    variant="ghost"
                                    size="xs"
                                    :disabled="!timerLinkUrl"
                                    @click="timerLinkUrl = ''"
                                />
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
                :disabled="activeTimer ? !canStopTimer : !canStartTimer"
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

        <p
            v-if="stopValidationHint"
            class="text-xs text-warning"
        >
            {{ stopValidationHint }}
        </p>
    </div>
</template>
