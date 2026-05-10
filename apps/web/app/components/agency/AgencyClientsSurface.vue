<script setup lang="ts">
/**
 * Agency Clients — master/detail.
 *
 * Left rail: list of clients with project count + this-week hours per client.
 * Right pane: selected client detail — rename, project list (with hue dots,
 * inline create), and aspirational sections (contact, archive) that teach the
 * eventual shape without faking data.
 *
 * Why master/detail: agencies live in clients; switching between them is the
 * dominant motion. A two-column layout makes that motion one click instead of
 * a tab round-trip.
 */
import { useQuery } from "@tanstack/vue-query";

import { formatDuration } from "~/utils/format-duration";
import { projectHueStyle } from "~/utils/project-palette";
import { useAgencyOpsStore } from "~/stores/agency-ops";

const props = defineProps<{
  teamId: string;
}>();

const orpc = useOrpc();
const agencyOps = useAgencyOpsStore();

const teamId = computed(() => props.teamId);

const filterTerm = ref("");
const selectedClientId = ref("");
const renameDraft = ref("");
const renameOpen = ref(false);
const newClientOpen = ref(false);
const newClientName = ref("");
const newProjectName = ref("");

const clientsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.clients.list.queryOptions({ input: { teamId: teamId.value } }),
    enabled: Boolean(teamId.value),
  })),
);
const projectsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.projects.list.queryOptions({ input: { teamId: teamId.value } }),
    enabled: Boolean(teamId.value),
  })),
);
const entriesQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.timeEntries.listMine.queryOptions({
      input: { teamId: teamId.value, page: 1, pageSize: 100 },
    }),
    enabled: Boolean(teamId.value),
  })),
);

// Register queries with the store so optimistic patches reach this component.
const clientsQueryKey = computed(
  () => orpc.agencyOps.clients.list.queryOptions({ input: { teamId: teamId.value } }).queryKey,
);
const projectsQueryKey = computed(
  () => orpc.agencyOps.projects.list.queryOptions({ input: { teamId: teamId.value } }).queryKey,
);

watch(
  clientsQueryKey,
  (next, prev) => {
    if (prev) agencyOps.unregisterClientsQuery(prev);
    if (teamId.value) agencyOps.registerClientsQuery({ queryKey: next, teamId: teamId.value });
  },
  { immediate: true },
);

watch(
  projectsQueryKey,
  (next, prev) => {
    if (prev) agencyOps.unregisterProjectsQuery(prev);
    if (teamId.value) agencyOps.registerProjectsQuery({ queryKey: next, teamId: teamId.value });
  },
  { immediate: true },
);

onUnmounted(() => {
  agencyOps.unregisterClientsQuery(clientsQueryKey.value);
  agencyOps.unregisterProjectsQuery(projectsQueryKey.value);
});

const clients = computed(() => clientsQuery.data.value?.items ?? []);
const projects = computed(() => projectsQuery.data.value?.items ?? []);
const entries = computed(() => entriesQuery.data.value?.items ?? []);

function getWeekStartUtc(): Date {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

const weekHoursByClient = computed(() => {
  const weekStartMs = getWeekStartUtc().getTime();
  const totals = new Map<string, number>();
  for (const entry of entries.value) {
    if (new Date(entry.startedAt).getTime() < weekStartMs) continue;
    totals.set(entry.clientId, (totals.get(entry.clientId) ?? 0) + entry.durationSeconds);
  }
  return totals;
});

const projectsByClient = computed(() => {
  const map = new Map<string, typeof projects.value>();
  for (const project of projects.value) {
    const list = map.get(project.clientId) ?? [];
    list.push(project);
    map.set(project.clientId, list);
  }
  return map;
});

const filteredClients = computed(() => {
  const term = filterTerm.value.trim().toLowerCase();
  if (!term) return clients.value;
  return clients.value.filter((client) => client.name.toLowerCase().includes(term));
});

// Auto-select first client when list resolves.
watch(
  filteredClients,
  (next) => {
    if (next.length === 0) {
      selectedClientId.value = "";
      return;
    }
    if (!next.some((client) => client.id === selectedClientId.value)) {
      selectedClientId.value = next[0]!.id;
    }
  },
  { immediate: true },
);

const selectedClient = computed(
  () => clients.value.find((client) => client.id === selectedClientId.value) ?? null,
);
const selectedClientProjects = computed(() =>
  projectsByClient.value.get(selectedClientId.value) ?? [],
);

// --- Mutations (via store for optimistic updates) -----------------------

async function createClient() {
  const name = newClientName.value.trim();
  if (!name || !teamId.value) return;
  newClientName.value = "";
  newClientOpen.value = false;
  await agencyOps.createClient(
    { teamId: teamId.value, name },
    {
      onSuccess: (clientId) => {
        selectedClientId.value = clientId;
      },
    },
  );
}

async function renameClient() {
  if (!selectedClient.value || !teamId.value) return;
  const name = renameDraft.value.trim();
  if (!name || name === selectedClient.value.name) {
    renameOpen.value = false;
    return;
  }
  renameOpen.value = false;
  await agencyOps.updateClient({
    teamId: teamId.value,
    clientId: selectedClient.value.id,
    name,
  });
}

async function createProject() {
  const name = newProjectName.value.trim();
  if (!name || !teamId.value || !selectedClient.value) return;
  newProjectName.value = "";
  await agencyOps.createProject({
    teamId: teamId.value,
    clientId: selectedClient.value.id,
    clientName: selectedClient.value.name,
    name,
  });
}

watch(renameOpen, (open) => {
  if (open && selectedClient.value) {
    renameDraft.value = selectedClient.value.name;
  }
});

const isLoading = computed(
  () => clientsQuery.isPending.value || projectsQuery.isPending.value,
);
</script>

<template>
  <div class="agency-clients">
    <!-- Loading -->
    <div v-if="isLoading" class="grid gap-4 lg:grid-cols-[18rem,1fr]">
      <div class="space-y-2">
        <div v-for="i in 5" :key="i" class="h-12 animate-pulse rounded-2xl bg-elevated/60" />
      </div>
      <div class="h-64 animate-pulse rounded-2xl bg-elevated/60" />
    </div>

    <!-- Empty -->
    <div
      v-else-if="clients.length === 0"
      class="rounded-2xl border border-dashed border-default bg-muted/20 p-10 text-center"
    >
      <UIcon name="i-lucide-building-2" class="mx-auto size-7 text-muted" />
      <p class="mt-4 text-sm font-bold text-highlighted">No clients yet.</p>
      <p class="mt-1 text-xs text-muted">
        Add your first client to start grouping projects and time.
      </p>
      <UPopover v-model:open="newClientOpen" :content="{ align: 'center' }">
        <UButton
          label="Add client"
          color="primary"
          variant="soft"
          size="xs"
          icon="i-lucide-plus"
          class="mt-4"
        />
        <template #content>
          <form class="w-72 space-y-2 p-3" @submit.prevent="createClient">
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              New client
            </p>
            <UInput v-model="newClientName" placeholder="Client name" size="sm" autofocus />
            <UButton
              type="submit"
              label="Create"
              color="primary"
              size="xs"
              block
              :loading="agencyOps.isClientMutationPending"
              :disabled="!newClientName.trim()"
            />
          </form>
        </template>
      </UPopover>
    </div>

    <div v-else class="grid gap-4 lg:grid-cols-[18rem,1fr]">
      <!-- Master: client list -->
      <aside class="space-y-3">
        <div class="flex items-center gap-2">
          <UInput
            v-model="filterTerm"
            icon="i-lucide-search"
            placeholder="Filter clients"
            size="sm"
            class="flex-1"
          />
          <UPopover v-model:open="newClientOpen" :content="{ align: 'end' }">
            <UButton
              icon="i-lucide-plus"
              color="primary"
              size="xs"
              square
              aria-label="New client"
            />
            <template #content>
              <form class="w-72 space-y-2 p-3" @submit.prevent="createClient">
                <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                  New client
                </p>
                <UInput v-model="newClientName" placeholder="Client name" size="sm" autofocus />
                <UButton
                  type="submit"
                  label="Create"
                  color="primary"
                  size="xs"
                  block
                  :loading="agencyOps.isClientMutationPending"
                  :disabled="!newClientName.trim()"
                />
              </form>
            </template>
          </UPopover>
        </div>

        <ul class="space-y-1">
          <li v-for="client in filteredClients" :key="client.id">
            <button
              type="button"
              class="agency-clients__row group flex w-full items-center justify-between gap-2 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors"
              :class="
                client.id === selectedClientId
                  ? 'border-default bg-elevated'
                  : 'hover:bg-elevated/60'
              "
              @click="selectedClientId = client.id"
            >
              <div class="min-w-0">
                <p class="truncate text-xs font-bold text-highlighted">{{ client.name }}</p>
                <p class="text-[11px] text-muted">
                  {{ projectsByClient.get(client.id)?.length ?? 0 }} projects
                </p>
              </div>
              <span class="font-mono text-[11px] tabular-nums text-muted">
                {{ formatDuration(weekHoursByClient.get(client.id) ?? 0, "short") }}
              </span>
            </button>
          </li>
        </ul>

        <p
          v-if="filteredClients.length === 0"
          class="px-3 py-4 text-center text-xs text-muted"
        >
          No matches.
        </p>
      </aside>

      <!-- Detail -->
      <section v-if="selectedClient" class="space-y-4">
        <div
          class="flex flex-wrap items-baseline justify-between gap-3 rounded-2xl border border-default bg-default p-5"
        >
          <div class="min-w-0">
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Client</p>
            <h2 class="mt-1 truncate text-lg font-bold text-highlighted">
              {{ selectedClient.name }}
            </h2>
            <p class="mt-1 font-mono text-[11px] tabular-nums text-muted">
              {{ formatDuration(weekHoursByClient.get(selectedClient.id) ?? 0, "short") }} this week
              · {{ selectedClientProjects.length }} projects
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UPopover v-model:open="renameOpen" :content="{ align: 'end' }">
              <UButton label="Rename" color="neutral" variant="ghost" size="xs" />
              <template #content>
                <form class="w-72 space-y-2 p-3" @submit.prevent="renameClient">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                    Rename client
                  </p>
                  <UInput v-model="renameDraft" size="sm" autofocus />
                  <UButton
                    type="submit"
                    label="Save"
                    color="primary"
                    size="xs"
                    block
                    :loading="agencyOps.isClientMutationPending"
                    :disabled="!renameDraft.trim()"
                  />
                </form>
              </template>
            </UPopover>
          </div>
        </div>

        <!-- Projects under this client -->
        <div class="rounded-2xl border border-default bg-default">
          <div class="flex items-center justify-between border-b border-default px-4 py-3">
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              Projects
            </p>
          </div>

          <ul v-if="selectedClientProjects.length > 0">
            <li
              v-for="project in selectedClientProjects"
              :key="project.id"
              class="flex items-center gap-3 border-b border-default px-4 py-3 last:border-b-0"
            >
              <span
                class="agency-clients__dot inline-block size-2 shrink-0 rounded-full"
                aria-hidden="true"
                :style="projectHueStyle(project.id)"
              />
              <span class="flex-1 truncate text-xs font-bold text-highlighted">
                {{ project.name }}
              </span>
              <span class="text-[11px] text-dimmed">Active</span>
            </li>
          </ul>

          <div v-else class="px-4 py-6 text-center">
            <p class="text-xs text-muted">No projects yet for this client.</p>
          </div>

          <form
            class="flex items-center gap-2 border-t border-default px-4 py-3"
            @submit.prevent="createProject"
          >
            <UInput
              v-model="newProjectName"
              placeholder="Add a project"
              size="sm"
              class="flex-1"
            />
            <UButton
              type="submit"
              label="Add"
              color="primary"
              size="xs"
              :loading="agencyOps.isProjectMutationPending"
              :disabled="!newProjectName.trim()"
            />
          </form>
        </div>

        <!-- Aspirational: contact + archive -->
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl border border-dashed border-default bg-muted/20 p-4">
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              Primary contact
            </p>
            <p class="mt-2 text-xs text-muted">
              Phase 2 wires a single contact per client. For now, keep contact details in your
              CRM.
            </p>
          </div>
          <div class="rounded-2xl border border-dashed border-default bg-muted/20 p-4">
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              Archive
            </p>
            <p class="mt-2 text-xs text-muted">
              Archiving hides finished clients without losing their history. Coming next.
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.agency-clients__dot {
  background-color: var(--project-hue, var(--ui-color-primary-500));
}
:global(.dark) .agency-clients__dot {
  background-color: var(--project-hue-dark, var(--ui-color-primary-400));
}
</style>
