<script setup lang="ts">
import type { WorkspaceAgencyProjectManagerBlock } from "@brainiac/workspace";
import { useMutation, useQuery } from "@tanstack/vue-query";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
    block: WorkspaceAgencyProjectManagerBlock;
    tabId: string;
}>();

const { currentNode, mutateTypedBlock } = useWorkspaceNodeEditorContext();
const orpc = useOrpc();
const toast = useToast();
const authSession = useAuthSession();
const authEnabled = computed(() => Boolean(authSession.value?.data?.user));

const teamsQuery = useQuery(
    computed(() => ({
        ...orpc.team.list.queryOptions(),
        enabled: authEnabled.value,
    })),
);

const teams = computed(() => teamsQuery.data.value?.items ?? []);
const teamIds = computed(() => new Set(teams.value.map((team) => team.id)));
const teamsById = computed(
    () => new Map(teams.value.map((team) => [team.id, team])),
);
const preferredTeamId = computed(
    () => props.block.teamId ?? currentNode.value?.teamId ?? "",
);
const selectedTeamIsUnavailable = computed(
    () =>
        Boolean(preferredTeamId.value) &&
        !teamIds.value.has(preferredTeamId.value),
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
    () => teamsById.value.get(effectiveTeamId.value) ?? null,
);

const teamOptions = computed(() =>
    teams.value.map((team) => ({
        label: `${team.name} (${team.role})`,
        value: team.id,
    })),
);

const clientsQuery = useQuery(
    computed(() => ({
        ...orpc.agencyOps.clients.list.queryOptions({
            input: {
                teamId: effectiveTeamId.value,
                includeArchived: props.block.showArchivedClients,
            },
        }),
        enabled: Boolean(effectiveTeamId.value),
    })),
);

const projectsQuery = useQuery(
    computed(() => ({
        ...orpc.agencyOps.projects.list.queryOptions({
            input: {
                teamId: effectiveTeamId.value,
                includeArchived: props.block.showArchivedProjects,
                ...(props.block.selectedClientId
                    ? { clientId: props.block.selectedClientId }
                    : {}),
            },
        }),
        enabled: Boolean(effectiveTeamId.value),
    })),
);

const clients = computed(() => clientsQuery.data.value?.items ?? []);
const projects = computed(() => projectsQuery.data.value?.items ?? []);

const selectedClient = computed(
    () =>
        clients.value.find(
            (client) => client.id === props.block.selectedClientId,
        ) ?? null,
);
const archivedClientCount = computed(
    () => clients.value.filter((client) => client.status === "archived").length,
);
const archivedProjectCount = computed(
    () =>
        projects.value.filter((project) => Boolean(project.archivedAt)).length,
);
const activeProjectCount = computed(
    () => projects.value.filter((project) => !project.archivedAt).length,
);

const createClientMutation = useMutation(
    orpc.agencyOps.clients.create.mutationOptions(),
);
const createProjectMutation = useMutation(
    orpc.agencyOps.projects.create.mutationOptions(),
);
const updateClientMutation = useMutation(
    orpc.agencyOps.clients.update.mutationOptions(),
);
const updateProjectMutation = useMutation(
    orpc.agencyOps.projects.update.mutationOptions(),
);

const managerBusy = computed(
    () =>
        createClientMutation.isPending.value ||
        createProjectMutation.isPending.value ||
        updateClientMutation.isPending.value ||
        updateProjectMutation.isPending.value,
);

const managerRefreshing = computed(
    () =>
        teamsQuery.isFetching.value ||
        clientsQuery.isFetching.value ||
        projectsQuery.isFetching.value,
);

const managerStatus = computed(() => {
    if (!authEnabled.value) {
        return {
            label: "Sign in required",
            tone: "neutral" as const,
            description:
                "Connect your account to load teams, clients, and delivery work.",
        };
    }

    if (selectedTeamIsUnavailable.value) {
        return {
            label: "Team unavailable",
            tone: "warning" as const,
            description:
                "This block is linked to a team you can no longer access.",
        };
    }

    if (!effectiveTeamId.value) {
        return {
            label: "Team required",
            tone: "warning" as const,
            description:
                "Bind this block to a team before managing clients or projects.",
        };
    }

    if (managerBusy.value) {
        return {
            label: "Saving changes",
            tone: "primary" as const,
            description: "Client and project updates are being synced now.",
        };
    }

    if (managerRefreshing.value) {
        return {
            label: "Refreshing",
            tone: "neutral" as const,
            description: "Latest client and project data is loading.",
        };
    }

    if (clients.value.length === 0) {
        return {
            label: "Add your first client",
            tone: "warning" as const,
            description:
                "Start with a client record so projects can be organized under it.",
        };
    }

    if (projects.value.length === 0) {
        return {
            label: "Add your first project",
            tone: "primary" as const,
            description:
                "Create a delivery project to track scope, ownership, and budget.",
        };
    }

    return {
        label: "Portfolio ready",
        tone: "success" as const,
        description:
            "Client accounts and delivery projects are organized and ready to review.",
    };
});

const summaryCards = computed(() => [
    {
        key: "status",
        label: "Manager State",
        value: managerStatus.value.label,
        supporting: managerStatus.value.description,
        accentClass:
            managerStatus.value.tone === "success"
                ? "text-success"
                : managerStatus.value.tone === "warning"
                  ? "text-warning"
                  : managerStatus.value.tone === "primary"
                    ? "text-primary"
                    : "text-highlighted",
    },
    {
        key: "team",
        label: "Team Context",
        value: selectedTeam.value?.name || "No team selected",
        supporting: selectedTeam.value
            ? `${selectedTeam.value.role} access`
            : "Bind this block to a team",
        accentClass: "text-highlighted",
    },
    {
        key: "clients",
        label: "Clients",
        value: String(clients.value.length),
        supporting:
            archivedClientCount.value > 0
                ? `${archivedClientCount.value} archived`
                : "All currently visible clients are active",
        accentClass: "text-primary",
    },
    {
        key: "projects",
        label: "Projects",
        value: String(projects.value.length),
        supporting: `${activeProjectCount.value} active · ${archivedProjectCount.value} archived`,
        accentClass: "text-highlighted",
    },
]);

const clientDraft = reactive({
    name: "",
    brandColor: "#2563eb",
});

const projectDraft = reactive({
    clientId: "",
    name: "",
    description: "",
    budgetHours: "20",
});

watch(
    clients,
    (nextClients) => {
        if (
            projectDraft.clientId &&
            nextClients.some((client) => client.id === projectDraft.clientId)
        ) {
            return;
        }

        projectDraft.clientId = nextClients[0]?.id ?? "";
    },
    { immediate: true },
);

function mutateProjectManagerBlock(
    mutator: (block: WorkspaceAgencyProjectManagerBlock) => void,
) {
    mutateTypedBlock(
        props.tabId,
        props.block.id,
        "agency-project-manager",
        mutator,
    );
}

function setTeamId(value: string | undefined) {
    projectDraft.clientId = "";

    mutateProjectManagerBlock((block) => {
        block.teamId = value || null;
        block.selectedClientId = null;
    });
}

function setShowArchivedClients(value: boolean) {
    mutateProjectManagerBlock((block) => {
        block.showArchivedClients = value;
    });
}

function setShowArchivedProjects(value: boolean) {
    mutateProjectManagerBlock((block) => {
        block.showArchivedProjects = value;
    });
}

function setSelectedClient(clientId: string | null) {
    mutateProjectManagerBlock((block) => {
        block.selectedClientId = clientId;
    });
}

function clearSelectedClient() {
    setSelectedClient(null);
}

function toInteger(value: string | number | undefined, fallback = 0) {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
        return fallback;
    }

    return Math.max(0, Math.round(numeric));
}

async function refreshData() {
    await Promise.all([clientsQuery.refetch(), projectsQuery.refetch()]);
}

async function createClient() {
    const teamId = effectiveTeamId.value;
    const name = clientDraft.name.trim();

    if (!teamId || !name) {
        return;
    }

    try {
        const created = await createClientMutation.mutateAsync({
            teamId,
            name,
            brandColor: clientDraft.brandColor.trim() || "#2563eb",
        });

        clientDraft.name = "";
        setSelectedClient(created.id);
        await refreshData();

        toast.add({
            title: "Client created",
            description: `${created.name} is now available for project planning.`,
            color: "success",
        });
    } catch (error) {
        toast.add({
            title: "Unable to create client",
            description: getErrorMessage(error, "Please try again."),
            color: "error",
        });
    }
}

async function toggleClientStatus(clientId: string, archived: boolean) {
    const teamId = effectiveTeamId.value;

    if (!teamId) {
        return;
    }

    try {
        await updateClientMutation.mutateAsync({
            teamId,
            clientId,
            status: archived ? "archived" : "active",
        });

        await refreshData();
    } catch (error) {
        toast.add({
            title: "Unable to update client",
            description: getErrorMessage(error, "Please try again."),
            color: "error",
        });
    }
}

async function createProject() {
    const teamId = effectiveTeamId.value;
    const name = projectDraft.name.trim();
    const clientId =
        projectDraft.clientId ||
        props.block.selectedClientId ||
        clients.value[0]?.id;

    if (!teamId || !name || !clientId) {
        return;
    }

    try {
        await createProjectMutation.mutateAsync({
            teamId,
            clientId,
            name,
            description: projectDraft.description.trim(),
            budgetMinutes: toInteger(projectDraft.budgetHours, 20) * 60,
        });

        projectDraft.name = "";
        projectDraft.description = "";
        projectDraft.budgetHours = "20";
        await refreshData();

        toast.add({
            title: "Project created",
            description: `${name} was added to your delivery portfolio.`,
            color: "success",
        });
    } catch (error) {
        toast.add({
            title: "Unable to create project",
            description: getErrorMessage(error, "Please try again."),
            color: "error",
        });
    }
}

async function toggleProjectArchive(projectId: string, archived: boolean) {
    const teamId = effectiveTeamId.value;

    if (!teamId) {
        return;
    }

    try {
        await updateProjectMutation.mutateAsync({
            teamId,
            projectId,
            archived,
        });

        await refreshData();
    } catch (error) {
        toast.add({
            title: "Unable to update project",
            description: getErrorMessage(error, "Please try again."),
            color: "error",
        });
    }
}

function formatBudget(minutes: number) {
    return `${Math.round(minutes / 60)}h budget`;
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
                        Client and delivery setup
                    </h3>
                    <p class="mt-1 text-sm text-muted">
                        Bind this block to a team, manage client accounts, then
                        create projects with clear scope and budget context.
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <UBadge
                        :color="managerStatus.tone"
                        variant="soft"
                        class="rounded-full"
                    >
                        {{ managerStatus.label }}
                    </UBadge>

                    <UBadge
                        v-if="managerBusy || managerRefreshing"
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

                    <UBadge
                        v-if="selectedClient"
                        color="primary"
                        variant="soft"
                        class="rounded-full"
                    >
                        {{ selectedClient.name }}
                    </UBadge>
                </div>
            </div>

            <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <UFormField label="Team binding" size="sm">
                    <USelect
                        :model-value="effectiveTeamId"
                        :items="teamOptions"
                        placeholder="Select a team"
                        size="sm"
                        class="w-full"
                        @update:model-value="
                            setTeamId($event as string | undefined)
                        "
                    />
                </UFormField>

                <label
                    class="flex items-center gap-3 rounded-2xl border border-muted/20 bg-default/60 px-3 py-2"
                >
                    <UCheckbox
                        :model-value="block.showArchivedClients"
                        @update:model-value="
                            setShowArchivedClients(Boolean($event))
                        "
                    />
                    <span class="text-sm text-toned"
                        >Show archived clients</span
                    >
                </label>

                <label
                    class="flex items-center gap-3 rounded-2xl border border-muted/20 bg-default/60 px-3 py-2"
                >
                    <UCheckbox
                        :model-value="block.showArchivedProjects"
                        @update:model-value="
                            setShowArchivedProjects(Boolean($event))
                        "
                    />
                    <span class="text-sm text-toned"
                        >Show archived projects</span
                    >
                </label>

                <div
                    class="rounded-2xl border border-muted/20 bg-default/60 px-3 py-2 text-xs text-muted"
                >
                    Team data survives block deletion because clients and
                    projects are stored in shared tables.
                </div>
            </div>
        </div>

        <UAlert
            v-if="!authEnabled"
            color="warning"
            variant="soft"
            icon="i-lucide-log-in"
            title="Sign in to manage delivery work"
            description="Authentication is required before this block can load teams, clients, and projects."
        />

        <UAlert
            v-else-if="!effectiveTeamId"
            color="warning"
            variant="soft"
            icon="i-lucide-users-round"
            :title="
                selectedTeamIsUnavailable
                    ? 'Team access unavailable'
                    : 'Connect this block to a team'
            "
            :description="
                selectedTeamIsUnavailable
                    ? 'Your current team binding is no longer available. Select a team you still belong to before managing clients and projects.'
                    : 'Create or join a team first, then bind this block to start managing agency clients and projects.'
            "
        />

        <div v-else class="grid gap-6 xl:grid-cols-2">
            <section
                class="space-y-4 rounded-3xl border border-muted/20 bg-elevated/10 p-4"
            >
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 class="text-sm font-semibold text-highlighted">
                            Clients
                        </h3>
                        <p class="mt-1 text-sm text-muted">
                            Keep account relationships visible so delivery
                            planning stays anchored to the right customer.
                        </p>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        <UBadge color="neutral" variant="soft"
                            >{{ clients.length }} total</UBadge
                        >
                        <UButton
                            v-if="selectedClient"
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            class="rounded-full"
                            aria-label="Clear selected client filter"
                            @click="clearSelectedClient"
                        >
                            Clear client filter
                        </UButton>
                    </div>
                </div>

                <div class="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                    <UInput
                        v-model="clientDraft.name"
                        placeholder="Client name"
                        :disabled="!effectiveTeamId"
                        aria-label="New client name"
                    />
                    <UInput
                        v-model="clientDraft.brandColor"
                        type="color"
                        class="w-full sm:w-20"
                        :disabled="!effectiveTeamId"
                        aria-label="Client brand color"
                    />
                    <UButton
                        color="primary"
                        icon="i-lucide-plus"
                        :loading="createClientMutation.isPending.value"
                        :disabled="!effectiveTeamId || !clientDraft.name.trim()"
                        aria-label="Create client"
                        @click="createClient"
                    >
                        Add client
                    </UButton>
                </div>

                <div
                    v-if="clients.length === 0"
                    class="rounded-3xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center"
                >
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40"
                    >
                        No clients yet
                    </p>
                    <p class="mt-2 text-sm text-muted">
                        Add the first client to start structuring your delivery
                        portfolio.
                    </p>
                </div>

                <div v-else class="space-y-2">
                    <button
                        v-for="client in clients"
                        :key="client.id"
                        type="button"
                        class="flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition"
                        :class="
                            block.selectedClientId === client.id
                                ? 'border-primary/40 bg-primary/10'
                                : 'border-muted/20 bg-default/60 hover:border-primary/30 hover:bg-primary/5'
                        "
                        :aria-pressed="block.selectedClientId === client.id"
                        @click="setSelectedClient(client.id)"
                    >
                        <div class="min-w-0">
                            <p
                                class="truncate text-sm font-medium text-highlighted"
                            >
                                {{ client.name }}
                            </p>
                            <p class="text-xs text-muted">
                                {{ client.brandColor }}
                            </p>
                        </div>

                        <div class="flex items-center gap-2">
                            <UBadge
                                :color="
                                    client.status === 'active'
                                        ? 'success'
                                        : 'neutral'
                                "
                                variant="soft"
                                size="sm"
                            >
                                {{ client.status }}
                            </UBadge>
                            <UButton
                                color="neutral"
                                variant="ghost"
                                size="xs"
                                class="rounded-full"
                                :aria-label="
                                    client.status === 'archived'
                                        ? `Activate ${client.name}`
                                        : `Archive ${client.name}`
                                "
                                @click.stop="
                                    toggleClientStatus(
                                        client.id,
                                        client.status !== 'archived',
                                    )
                                "
                            >
                                {{
                                    client.status === "archived"
                                        ? "Activate"
                                        : "Archive"
                                }}
                            </UButton>
                        </div>
                    </button>
                </div>
            </section>

            <section
                class="space-y-4 rounded-3xl border border-muted/20 bg-elevated/10 p-4"
            >
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 class="text-sm font-semibold text-highlighted">
                            Projects
                        </h3>
                        <p class="mt-1 text-sm text-muted">
                            Capture scope and budget at the moment work is
                            created so delivery reviews stay crisp.
                        </p>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        <UBadge color="neutral" variant="soft"
                            >{{ projects.length }} listed</UBadge
                        >
                        <UBadge
                            v-if="selectedClient"
                            color="primary"
                            variant="soft"
                        >
                            Filtered to {{ selectedClient.name }}
                        </UBadge>
                    </div>
                </div>

                <div class="grid gap-2">
                    <USelect
                        v-model="projectDraft.clientId"
                        :items="
                            clients.map((client) => ({
                                label: client.name,
                                value: client.id,
                            }))
                        "
                        placeholder="Client"
                        :disabled="!effectiveTeamId || clients.length === 0"
                        aria-label="Client for new project"
                    />
                    <UInput
                        v-model="projectDraft.name"
                        placeholder="Project name"
                        :disabled="!effectiveTeamId"
                        aria-label="Project name"
                    />
                    <UTextarea
                        v-model="projectDraft.description"
                        :rows="2"
                        autoresize
                        placeholder="Scope and expected outcome"
                        :disabled="!effectiveTeamId"
                        aria-label="Project scope and expected outcome"
                    />
                    <div class="flex items-center gap-2">
                        <UInput
                            v-model="projectDraft.budgetHours"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Hours"
                            :disabled="!effectiveTeamId"
                            aria-label="Project budget hours"
                        />
                        <UButton
                            color="primary"
                            icon="i-lucide-plus"
                            :loading="createProjectMutation.isPending.value"
                            :disabled="
                                !effectiveTeamId ||
                                !projectDraft.name.trim() ||
                                !projectDraft.clientId
                            "
                            aria-label="Create project"
                            @click="createProject"
                        >
                            Add project
                        </UButton>
                    </div>
                </div>

                <div
                    v-if="projects.length === 0"
                    class="rounded-3xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center"
                >
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40"
                    >
                        No projects yet
                    </p>
                    <p class="mt-2 text-sm text-muted">
                        Create the first project to track delivery scope,
                        budget, and account alignment.
                    </p>
                </div>

                <div v-else class="space-y-2">
                    <article
                        v-for="project in projects"
                        :key="project.id"
                        class="rounded-2xl border border-muted/20 bg-default/60 p-3"
                    >
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <p
                                    class="truncate text-sm font-semibold text-highlighted"
                                >
                                    {{ project.name }}
                                </p>
                                <p class="text-xs text-muted">
                                    {{ project.clientName }} ·
                                    {{ formatBudget(project.budgetMinutes) }}
                                </p>
                            </div>

                            <div class="flex items-center gap-2">
                                <UBadge
                                    color="neutral"
                                    variant="soft"
                                    size="sm"
                                >
                                    {{ project.status }}
                                </UBadge>
                                <UButton
                                    color="neutral"
                                    variant="ghost"
                                    size="xs"
                                    class="rounded-full"
                                    :aria-label="
                                        project.archivedAt
                                            ? `Restore ${project.name}`
                                            : `Archive ${project.name}`
                                    "
                                    @click="
                                        toggleProjectArchive(
                                            project.id,
                                            !project.archivedAt,
                                        )
                                    "
                                >
                                    {{
                                        project.archivedAt
                                            ? "Restore"
                                            : "Archive"
                                    }}
                                </UButton>
                            </div>
                        </div>

                        <p
                            v-if="project.description"
                            class="mt-2 text-xs text-toned"
                        >
                            {{ project.description }}
                        </p>
                    </article>
                </div>
            </section>
        </div>
    </div>
</template>
