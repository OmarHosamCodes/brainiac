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
      <UCard>
        <h3 class="mb-4 text-sm font-semibold text-highlighted">Clients</h3>

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
            class="w-full rounded-lg border border-default bg-elevated/50 px-3 py-2 text-left text-sm transition-colors hover:bg-elevated"
            :class="selectedClientId === client.id ? 'border-primary/50 bg-primary/10' : ''"
            @click="selectedClientId = client.id"
          >
            <p class="font-medium text-highlighted">
              {{ client.name }}
            </p>
          </button>
        </div>

        <!-- Empty state -->
        <div
          v-else
          class="rounded-lg border border-dashed border-muted/30 p-4 text-center"
        >
          <p class="text-xs text-muted">Add your first client to get started</p>
        </div>
      </UCard>

      <!-- Projects panel -->
      <UCard>
        <h3 class="mb-4 text-sm font-semibold text-highlighted">
          Projects
          <span v-if="selectedClient" class="ml-1 text-xs font-normal text-muted">
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
            class="rounded-lg border border-default bg-elevated/50 px-3 py-2 text-sm"
          >
            <p class="font-medium text-highlighted">
              {{ project.name }}
            </p>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-else-if="selectedClientId"
          class="rounded-lg border border-dashed border-muted/30 p-4 text-center"
        >
          <p class="text-xs text-muted">No projects for this client yet</p>
        </div>

        <!-- No client selected -->
        <div
          v-else
          class="rounded-lg border border-dashed border-muted/30 p-4 text-center"
        >
          <p class="text-xs text-muted">Select a client to see projects</p>
        </div>
      </UCard>
    </div>

    <!-- Tags Section -->
    <div v-if="effectiveTeamId">
      <div class="mb-4 flex items-center gap-3">
        <UIcon name="i-lucide-tags" class="size-5 text-primary" />
        <div>
          <h3 class="font-semibold text-highlighted">Tags</h3>
          <p class="text-xs text-muted">Organize time entries with team-wide tags.</p>
        </div>
      </div>

      <!-- Create tag form -->
      <UCard class="mb-4">
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
      </UCard>

      <!-- Tags list -->
      <UCard v-if="tags.length > 0">
        <div class="flex flex-wrap gap-2">
          <div
            v-for="tag in tags"
            :key="tag.id"
            class="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm"
          >
            <span class="text-highlighted">{{ tag.name }}</span>
            <button
              class="ml-auto text-primary/60 transition-colors hover:text-primary"
              :disabled="deleteTagMutation.isPending.value"
              @click="deleteTag(tag.id)"
            >
              <UIcon name="i-lucide-x" class="size-3.5" />
            </button>
          </div>
        </div>
      </UCard>

      <!-- Empty state -->
      <div
        v-else
        class="rounded-2xl border border-dashed border-muted/30 p-4 text-center"
      >
        <p class="text-xs text-muted">
          No tags yet — add your first tag to start categorizing time entries
        </p>
      </div>
    </div>
  </div>
</template>
