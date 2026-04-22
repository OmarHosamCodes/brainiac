<script setup lang="ts">
import type { WorkspaceAgencyProjectManagerBlock } from "@brainiac/workspace";
import { useMutation, useQuery } from "@tanstack/vue-query";
import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
    block: WorkspaceAgencyProjectManagerBlock;
    tabId: string;
}>();

const { mutateTypedBlock } = useWorkspaceNodeEditorContext();
const orpc = useOrpc();
const toast = useToast();
const authSession = useAuthSession();
const authEnabled = computed(() => Boolean(authSession.value?.data?.user));

const selectedClientId = ref("");
const newClientName = ref("");
const newProjectName = ref("");
const newTagName = ref("");

// Teams query
const teamsQuery = useQuery(
    computed(() => ({
        ...orpc.team.list.queryOptions(),
        enabled: authEnabled.value,
    })),
);

const teams = computed(() => teamsQuery.data.value?.items ?? []);
const effectiveTeamId = computed(() =>
    props.block.teamId || teams.value[0]?.id || "",
);

// Clients query
const clientsQuery = useQuery(
    computed(() => ({
        ...orpc.agencyOps.clients.list.queryOptions({
            input: {
                teamId: effectiveTeamId.value,
            },
        }),
        enabled: Boolean(effectiveTeamId.value),
    })),
);

const clients = computed(() => clientsQuery.data.value?.items ?? []);

// Projects query
const projectsQuery = useQuery(
    computed(() => ({
        ...orpc.agencyOps.projects.list.queryOptions({
            input: {
                teamId: effectiveTeamId.value,
                clientId: selectedClientId.value || undefined,
            },
        }),
        enabled: Boolean(effectiveTeamId.value),
    })),
);

const projects = computed(() => projectsQuery.data.value?.items ?? []);
const selectedClient = computed(
    () => clients.value.find((c) => c.id === selectedClientId.value) ?? null,
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
const createClientMutation = useMutation(
    orpc.agencyOps.clients.create.mutationOptions(),
);

const createProjectMutation = useMutation(
    orpc.agencyOps.projects.create.mutationOptions(),
);

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
        "agency-project-manager",
        (entry) => {
            entry.teamId = teamId || null;
        },
    );
}

async function createClient() {
    const name = newClientName.value.trim();

    if (!name || !effectiveTeamId.value) {
        return;
    }

    try {
        await createClientMutation.mutateAsync({
            teamId: effectiveTeamId.value,
            name,
        });

        newClientName.value = "";
        await clientsQuery.refetch();

        toast.add({
            title: "Client created",
            description: name,
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

async function createProject() {
    const name = newProjectName.value.trim();

    if (!name || !selectedClientId.value || !effectiveTeamId.value) {
        return;
    }

    try {
        await createProjectMutation.mutateAsync({
            teamId: effectiveTeamId.value,
            clientId: selectedClientId.value,
            name,
        });

        newProjectName.value = "";
        await projectsQuery.refetch();

        toast.add({
            title: "Project created",
            description: name,
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
    <div class="space-y-6">
        <!-- Team selector -->
        <div class="rounded-2xl border border-zinc-200/30 bg-zinc-950/40 backdrop-blur-sm p-4 dark:border-zinc-800/50 dark:bg-zinc-950/50">
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

        <!-- Two-column layout: Clients | Projects -->
        <div class="grid gap-6 md:grid-cols-2">
            <!-- Clients panel -->
            <div class="rounded-2xl border border-zinc-200/30 bg-zinc-950/40 backdrop-blur-sm p-4 dark:border-zinc-800/50 dark:bg-zinc-950/50">
                <h3 class="text-sm font-semibold text-zinc-100 mb-4">
                    Clients
                </h3>

                <!-- Create client form -->
                <div class="mb-4 flex gap-2">
                    <UInput
                        v-model="newClientName"
                        placeholder="Client name"
                        size="sm"
                        :disabled="!effectiveTeamId || createClientMutation.isPending.value"
                        @keyup.enter="createClient"
                    />
                    <UButton
                        label="Add"
                        size="sm"
                        color="emerald"
                        :loading="createClientMutation.isPending.value"
                        :disabled="!newClientName.trim() || !effectiveTeamId"
                        @click="createClient"
                    />
                </div>

                <!-- Clients list -->
                <div v-if="clients.length > 0" class="space-y-2">
                    <button
                        v-for="client in clients"
                        :key="client.id"
                        class="w-full rounded-lg border border-zinc-200/20 bg-zinc-900/50 px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-800/50 dark:border-zinc-800/50 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/70"
                        :class="
                            selectedClientId === client.id
                                ? 'border-emerald-500/50 bg-emerald-500/10'
                                : ''
                        "
                        @click="selectedClientId = client.id"
                    >
                        <p class="font-medium text-zinc-100">
                            {{ client.name }}
                        </p>
                    </button>
                </div>

                <!-- Empty state -->
                <div
                    v-else
                    class="rounded-lg border border-dashed border-zinc-400/30 p-4 text-center dark:border-zinc-700/30"
                >
                    <p class="text-xs text-zinc-500">
                        Add your first client to get started
                    </p>
                </div>
            </div>

            <!-- Projects panel -->
            <div class="rounded-2xl border border-zinc-200/30 bg-zinc-950/40 backdrop-blur-sm p-4 dark:border-zinc-800/50 dark:bg-zinc-950/50">
                <h3 class="text-sm font-semibold text-zinc-100 mb-4">
                    Projects
                    <span
                        v-if="selectedClient"
                        class="ml-1 text-xs font-normal text-zinc-500"
                    >
                        for {{ selectedClient.name }}
                    </span>
                </h3>

                <!-- Create project form -->
                <div
                    v-if="selectedClientId"
                    class="mb-4 flex gap-2"
                >
                    <UInput
                        v-model="newProjectName"
                        placeholder="Project name"
                        size="sm"
                        :disabled="createProjectMutation.isPending.value"
                        @keyup.enter="createProject"
                    />
                    <UButton
                        label="Add"
                        size="sm"
                        color="emerald"
                        :loading="createProjectMutation.isPending.value"
                        :disabled="!newProjectName.trim()"
                        @click="createProject"
                    />
                </div>

                <!-- Projects list -->
                <div v-if="selectedClientId && projects.length > 0" class="space-y-2">
                    <div
                        v-for="project in projects"
                        :key="project.id"
                        class="rounded-lg border border-zinc-200/20 bg-zinc-900/50 px-3 py-2 text-sm dark:border-zinc-800/50 dark:bg-zinc-900/30"
                    >
                        <p class="font-medium text-zinc-100">
                            {{ project.name }}
                        </p>
                    </div>
                </div>

                <!-- Empty state -->
                <div
                    v-else-if="selectedClientId"
                    class="rounded-lg border border-dashed border-zinc-400/30 p-4 text-center dark:border-zinc-700/30"
                >
                    <p class="text-xs text-zinc-500">
                        No projects for this client yet
                    </p>
                </div>

                <!-- No client selected -->
                <div
                    v-else
                    class="rounded-lg border border-dashed border-zinc-400/30 p-4 text-center dark:border-zinc-700/30"
                >
                    <p class="text-xs text-zinc-500">
                        Select a client to see projects
                    </p>
                </div>
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
