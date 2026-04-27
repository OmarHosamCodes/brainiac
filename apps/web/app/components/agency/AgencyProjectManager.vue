<script setup lang="ts">
import { useMutation, useQuery } from "@tanstack/vue-query";

import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
  teamId: string;
}>();

const orpc = useOrpc();
const toast = useToast();

const selectedClientId = ref("");
const newClientName = ref("");
const newProjectName = ref("");
const newTagName = ref("");

const effectiveTeamId = computed(() => props.teamId);

watch(effectiveTeamId, () => {
  selectedClientId.value = "";
});

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

const createClientMutation = useMutation(orpc.agencyOps.clients.create.mutationOptions());
const createProjectMutation = useMutation(orpc.agencyOps.projects.create.mutationOptions());
const createTagMutation = useMutation(orpc.agencyOps.tags.create.mutationOptions());
const deleteTagMutation = useMutation(orpc.agencyOps.tags.delete.mutationOptions());

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
    <!-- Two-column layout: Clients | Projects -->
    <div class="grid gap-6 md:grid-cols-2">
      <!-- Clients panel -->
      <div
        class="rounded-2xl border border-zinc-200/30 bg-zinc-950/40 p-4 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-950/50"
      >
        <h3 class="mb-4 text-sm font-semibold text-zinc-100">Clients</h3>

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
            color="primary"
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
            :class="selectedClientId === client.id ? 'border-emerald-500/50 bg-emerald-500/10' : ''"
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
          <p class="text-xs text-zinc-500">Add your first client to get started</p>
        </div>
      </div>

      <!-- Projects panel -->
      <div
        class="rounded-2xl border border-zinc-200/30 bg-zinc-950/40 p-4 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-950/50"
      >
        <h3 class="mb-4 text-sm font-semibold text-zinc-100">
          Projects
          <span v-if="selectedClient" class="ml-1 text-xs font-normal text-zinc-500">
            for {{ selectedClient.name }}
          </span>
        </h3>

        <!-- Create project form -->
        <div v-if="selectedClientId" class="mb-4 flex gap-2">
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
            color="primary"
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
          <p class="text-xs text-zinc-500">No projects for this client yet</p>
        </div>

        <!-- No client selected -->
        <div
          v-else
          class="rounded-lg border border-dashed border-zinc-400/30 p-4 text-center dark:border-zinc-700/30"
        >
          <p class="text-xs text-zinc-500">Select a client to see projects</p>
        </div>
      </div>
    </div>

    <!-- Tags Section -->
    <div v-if="effectiveTeamId">
      <div class="mb-4 flex items-center gap-3">
        <UIcon name="i-lucide-tags" class="size-5 text-emerald-600 dark:text-emerald-400" />
        <div>
          <h3 class="font-semibold text-zinc-100">Tags</h3>
          <p class="text-xs text-zinc-500">Organize time entries with team-wide tags.</p>
        </div>
      </div>

      <!-- Create tag form -->
      <div
        class="mb-4 rounded-2xl border border-zinc-200/30 bg-zinc-950/40 p-4 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-950/50"
      >
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
            color="primary"
            :loading="createTagMutation.isPending.value"
            :disabled="!newTagName.trim()"
            @click="createTag"
          />
        </div>
      </div>

      <!-- Tags list -->
      <div
        v-if="tags.length > 0"
        class="rounded-2xl border border-zinc-200/30 bg-zinc-950/40 p-4 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-950/50"
      >
        <div class="flex flex-wrap gap-2">
          <div
            v-for="tag in tags"
            :key="tag.id"
            class="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm"
          >
            <span class="text-emerald-100">{{ tag.name }}</span>
            <button
              class="ml-auto text-emerald-500/60 transition-colors hover:text-emerald-400"
              :disabled="deleteTagMutation.isPending.value"
              @click="deleteTag(tag.id)"
            >
              <UIcon name="i-lucide-x" class="size-3.5" />
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
