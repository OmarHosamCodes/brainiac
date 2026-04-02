<script setup lang="ts">
import type { WorkspaceAgencyProjectManagerBlock } from "@brainiac/workspace";
import { useMutation, useQuery } from "@tanstack/vue-query";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
  block: WorkspaceAgencyProjectManagerBlock;
  tabId: string;
}>();

const { currentNode, mutateBlock } = useWorkspaceNodeEditorContext();
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
const preferredTeamId = computed(() => props.block.teamId ?? currentNode.value?.teamId ?? "");

const effectiveTeamId = computed(() => {
  if (!preferredTeamId.value) {
    return teams.value[0]?.id ?? "";
  }

  return teamIds.value.has(preferredTeamId.value) ? preferredTeamId.value : "";
});

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
        ...(props.block.selectedClientId ? { clientId: props.block.selectedClientId } : {}),
      },
    }),
    enabled: Boolean(effectiveTeamId.value),
  })),
);

const clients = computed(() => clientsQuery.data.value?.items ?? []);
const projects = computed(() => projectsQuery.data.value?.items ?? []);

const createClientMutation = useMutation(orpc.agencyOps.clients.create.mutationOptions());
const createProjectMutation = useMutation(orpc.agencyOps.projects.create.mutationOptions());
const updateClientMutation = useMutation(orpc.agencyOps.clients.update.mutationOptions());
const updateProjectMutation = useMutation(orpc.agencyOps.projects.update.mutationOptions());

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
    if (projectDraft.clientId && nextClients.some((client) => client.id === projectDraft.clientId)) {
      return;
    }

    projectDraft.clientId = nextClients[0]?.id ?? "";
  },
  { immediate: true },
);

function updateBlock(
  mutator: (block: WorkspaceAgencyProjectManagerBlock) => void,
) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "agency-project-manager") {
      return;
    }

    mutator(block);
  });
}

function setTeamId(value: string | undefined) {
  updateBlock((block) => {
    block.teamId = value || null;
  });
}

function setShowArchivedClients(value: boolean) {
  updateBlock((block) => {
    block.showArchivedClients = value;
  });
}

function setShowArchivedProjects(value: boolean) {
  updateBlock((block) => {
    block.showArchivedProjects = value;
  });
}

function setSelectedClient(clientId: string | null) {
  updateBlock((block) => {
    block.selectedClientId = clientId;
  });
}

function toInteger(value: string, fallback = 0) {
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
  const clientId = projectDraft.clientId || props.block.selectedClientId || clients.value[0]?.id;

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
    <div class="grid gap-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4 md:grid-cols-2 xl:grid-cols-4">
      <UFormField label="Team binding" size="sm">
        <USelect
          :model-value="effectiveTeamId"
          :items="teamOptions"
          placeholder="Select a team"
          size="sm"
          class="w-full"
          @update:model-value="setTeamId($event as string | undefined)"
        />
      </UFormField>

      <label class="flex items-center gap-3 rounded-2xl border border-muted/20 bg-default/60 px-3 py-2">
        <UCheckbox
          :model-value="block.showArchivedClients"
          @update:model-value="setShowArchivedClients(Boolean($event))"
        />
        <span class="text-sm text-toned">Show archived clients</span>
      </label>

      <label class="flex items-center gap-3 rounded-2xl border border-muted/20 bg-default/60 px-3 py-2">
        <UCheckbox
          :model-value="block.showArchivedProjects"
          @update:model-value="setShowArchivedProjects(Boolean($event))"
        />
        <span class="text-sm text-toned">Show archived projects</span>
      </label>

      <div class="rounded-2xl border border-muted/20 bg-default/60 px-3 py-2 text-xs text-muted">
        Team data survives block deletion because clients and projects are stored in shared tables.
      </div>
    </div>

    <UAlert
      v-if="!effectiveTeamId"
      color="warning"
      variant="soft"
      icon="i-lucide-users-round"
      title="Connect this block to a team"
      description="Create or join a team first, then bind this block to start managing agency clients and projects."
    />

    <div class="grid gap-6 xl:grid-cols-2">
      <section class="space-y-4 rounded-3xl border border-muted/20 bg-elevated/10 p-4">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-highlighted">Clients</h3>
          <UBadge color="neutral" variant="soft">{{ clients.length }} total</UBadge>
        </div>

        <div class="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <UInput
            v-model="clientDraft.name"
            placeholder="Client name"
            :disabled="!effectiveTeamId"
          />
          <UInput
            v-model="clientDraft.brandColor"
            type="color"
            class="w-full sm:w-20"
            :disabled="!effectiveTeamId"
          />
          <UButton
            color="primary"
            icon="i-lucide-plus"
            :loading="createClientMutation.isPending.value"
            :disabled="!effectiveTeamId || !clientDraft.name.trim()"
            @click="createClient"
          >
            Add
          </UButton>
        </div>

        <div class="space-y-2">
          <button
            v-for="client in clients"
            :key="client.id"
            type="button"
            class="flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left transition"
            :class="
              block.selectedClientId === client.id
                ? 'border-primary/40 bg-primary/10'
                : 'border-muted/20 bg-default/60 hover:border-primary/30 hover:bg-primary/5'
            "
            @click="setSelectedClient(client.id)"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-highlighted">{{ client.name }}</p>
              <p class="text-xs text-muted">{{ client.brandColor }}</p>
            </div>

            <div class="flex items-center gap-2">
              <UBadge :color="client.status === 'active' ? 'success' : 'neutral'" variant="soft" size="sm">
                {{ client.status }}
              </UBadge>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                @click.stop="toggleClientStatus(client.id, client.status !== 'archived')"
              >
                {{ client.status === "archived" ? "Activate" : "Archive" }}
              </UButton>
            </div>
          </button>
        </div>
      </section>

      <section class="space-y-4 rounded-3xl border border-muted/20 bg-elevated/10 p-4">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-highlighted">Projects</h3>
          <UBadge color="neutral" variant="soft">{{ projects.length }} listed</UBadge>
        </div>

        <div class="grid gap-2">
          <USelect
            v-model="projectDraft.clientId"
            :items="clients.map((client) => ({ label: client.name, value: client.id }))"
            placeholder="Client"
            :disabled="!effectiveTeamId"
          />
          <UInput
            v-model="projectDraft.name"
            placeholder="Project name"
            :disabled="!effectiveTeamId"
          />
          <UTextarea
            v-model="projectDraft.description"
            :rows="2"
            autoresize
            placeholder="Scope and expected outcome"
            :disabled="!effectiveTeamId"
          />
          <div class="flex items-center gap-2">
            <UInput
              v-model="projectDraft.budgetHours"
              type="number"
              min="0"
              step="1"
              placeholder="Hours"
              :disabled="!effectiveTeamId"
            />
            <UButton
              color="primary"
              icon="i-lucide-plus"
              :loading="createProjectMutation.isPending.value"
              :disabled="!effectiveTeamId || !projectDraft.name.trim() || !projectDraft.clientId"
              @click="createProject"
            >
              Add project
            </UButton>
          </div>
        </div>

        <div class="space-y-2">
          <article
            v-for="project in projects"
            :key="project.id"
            class="rounded-2xl border border-muted/20 bg-default/60 p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-highlighted">{{ project.name }}</p>
                <p class="text-xs text-muted">{{ project.clientName }} · {{ formatBudget(project.budgetMinutes) }}</p>
              </div>

              <div class="flex items-center gap-2">
                <UBadge color="neutral" variant="soft" size="sm">{{ project.status }}</UBadge>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="toggleProjectArchive(project.id, !project.archivedAt)"
                >
                  {{ project.archivedAt ? "Restore" : "Archive" }}
                </UButton>
              </div>
            </div>

            <p v-if="project.description" class="mt-2 text-xs text-toned">{{ project.description }}</p>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
