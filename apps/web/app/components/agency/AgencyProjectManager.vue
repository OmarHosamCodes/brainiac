<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

import { useAgencyOpsStore } from "~/stores/agency-ops";

const props = defineProps<{
  teamId: string;
}>();

const orpc = useOrpc();
const agencyOps = useAgencyOpsStore();

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

// Register queries with the store for optimistic patches.
const clientsQueryKey = computed(
  () =>
    orpc.agencyOps.clients.list.queryOptions({ input: { teamId: effectiveTeamId.value } }).queryKey,
);
const projectsQueryKey = computed(
  () =>
    orpc.agencyOps.projects.list.queryOptions({
      input: { teamId: effectiveTeamId.value, clientId: selectedClientId.value || undefined },
    }).queryKey,
);
const tagsQueryKey = computed(
  () =>
    orpc.agencyOps.tags.list.queryOptions({ input: { teamId: effectiveTeamId.value } }).queryKey,
);

watch(
  clientsQueryKey,
  (next, prev) => {
    if (prev) agencyOps.unregisterClientsQuery(prev);
    if (effectiveTeamId.value)
      agencyOps.registerClientsQuery({ queryKey: next, teamId: effectiveTeamId.value });
  },
  { immediate: true },
);

watch(
  projectsQueryKey,
  (next, prev) => {
    if (prev) agencyOps.unregisterProjectsQuery(prev);
    if (effectiveTeamId.value)
      agencyOps.registerProjectsQuery({
        queryKey: next,
        teamId: effectiveTeamId.value,
        clientId: selectedClientId.value || undefined,
      });
  },
  { immediate: true },
);

watch(
  tagsQueryKey,
  (next, prev) => {
    if (prev) agencyOps.unregisterTagsQuery(prev);
    if (effectiveTeamId.value)
      agencyOps.registerTagsQuery({ queryKey: next, teamId: effectiveTeamId.value });
  },
  { immediate: true },
);

onUnmounted(() => {
  agencyOps.unregisterClientsQuery(clientsQueryKey.value);
  agencyOps.unregisterProjectsQuery(projectsQueryKey.value);
  agencyOps.unregisterTagsQuery(tagsQueryKey.value);
});

async function createClient() {
  const name = newClientName.value.trim();
  if (!name || !effectiveTeamId.value) return;
  newClientName.value = "";
  await agencyOps.createClient(
    { teamId: effectiveTeamId.value, name },
    {
      onSuccess: (clientId) => {
        selectedClientId.value = clientId;
      },
    },
  );
}

async function createProject() {
  const name = newProjectName.value.trim();
  if (!name || !selectedClientId.value || !effectiveTeamId.value) return;
  newProjectName.value = "";
  await agencyOps.createProject({
    teamId: effectiveTeamId.value,
    clientId: selectedClientId.value,
    clientName: selectedClient.value?.name ?? "",
    name,
  });
}

async function createTag() {
  const name = newTagName.value.trim();
  if (!name || !effectiveTeamId.value) return;
  newTagName.value = "";
  await agencyOps.createTag({ teamId: effectiveTeamId.value, name });
}

async function deleteTag(tagId: string) {
  if (!effectiveTeamId.value) return;
  const tag = tags.value.find((t) => t.id === tagId);
  await agencyOps.deleteTag({
    teamId: effectiveTeamId.value,
    tagId,
    tagName: tag?.name ?? "",
  });
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
            :disabled="!effectiveTeamId || agencyOps.isClientMutationPending"
            @keyup.enter="createClient"
          />
          <UButton
            label="Add"
            size="sm"
            color="primary"
            :loading="agencyOps.isClientMutationPending"
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
        <div v-else class="rounded-lg border border-dashed border-muted/30 p-4 text-center">
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
            :disabled="agencyOps.isProjectMutationPending"
            @keyup.enter="createProject"
          />
          <UButton
            label="Add"
            size="sm"
            color="primary"
            :loading="agencyOps.isProjectMutationPending"
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
        <div v-else class="rounded-lg border border-dashed border-muted/30 p-4 text-center">
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
            :disabled="agencyOps.isTagMutationPending"
            @keyup.enter="createTag"
          />
          <UButton
            label="Add"
            size="sm"
            color="primary"
            :loading="agencyOps.isTagMutationPending"
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
              :disabled="agencyOps.deletingTagIds.includes(tag.id)"
              @click="deleteTag(tag.id)"
            >
              <UIcon name="i-lucide-x" class="size-3.5" />
            </button>
          </div>
        </div>
      </UCard>

      <!-- Empty state -->
      <div v-else class="rounded-2xl border border-dashed border-muted/30 p-4 text-center">
        <p class="text-xs text-muted">
          No tags yet — add your first tag to start categorizing time entries
        </p>
      </div>
    </div>
  </div>
</template>
