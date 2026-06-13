<script setup lang="ts">
/**
 * Agency Projects — dense table.
 *
 * Columns: hue dot + project · client · members · in-row budget bar (aspirational
 * stub) · hours this period · status pill.
 *
 * Phase 1 wires: project list, client crumb, hours-this-week from time entries,
 * project hue, status pill, "New project" inline action. Budget bar reads a
 * stub (no rates/budgets backend yet) and renders an honest aspirational state
 * — never a fake percentage.
 */
import { useQuery } from "@tanstack/vue-query";

import { formatDuration } from "~/utils/format-duration";
import { getErrorMessage } from "~/utils/get-error-message";
import { projectHueStyle } from "~/utils/project-palette";
import { withAgencyLiveQueryOptions } from "~/utils/agency-query-options";
import { useAgencyOpsStore } from "~/stores/agency-ops";

const props = defineProps<{
  teamId: string;
}>();

const emit = defineEmits<{
  select: [projectId: string];
}>();

const orpc = useOrpc();
const agencyOps = useAgencyOpsStore();

const teamId = computed(() => props.teamId);

const filterTerm = ref("");
const showArchived = ref(false);

const projectsQuery = useQuery(
  computed(() =>
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.projects.list.queryOptions({ input: { teamId: teamId.value } }),
      enabled: Boolean(teamId.value),
    }),
  ),
);
const clientsQuery = useQuery(
  computed(() =>
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.clients.list.queryOptions({ input: { teamId: teamId.value } }),
      enabled: Boolean(teamId.value),
    }),
  ),
);

// Pull a generous window of recent entries to compute "hours this week" per
// project. Honest: capped at pageSize=100 — large agencies will eventually
// need a server aggregate (Phase 4 stub).
const entriesQuery = useQuery(
  computed(() =>
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.timeEntries.listMine.queryOptions({
        input: {
          teamId: teamId.value,
          page: 1,
          pageSize: 100,
        },
      }),
      enabled: Boolean(teamId.value),
    }),
  ),
);

// Phase 4 stub: budgets.list ships shaped-but-empty so the in-row budget bar
// can be wired today. Once rows arrive, each project's bar fills based on
// hoursLogged/hoursBudget (or cost-based if hours aren't budgeted).
const budgetsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.budgets.list.queryOptions({ input: { teamId: teamId.value } }),
    enabled: Boolean(teamId.value),
  })),
);

// Register queries with the store for optimistic patches.
const projectsQueryKey = computed(
  () => orpc.agencyOps.projects.list.queryOptions({ input: { teamId: teamId.value } }).queryKey,
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
  agencyOps.unregisterProjectsQuery(projectsQueryKey.value);
});

const budgetsByProject = computed(() => {
  const map = new Map<string, NonNullable<typeof budgetsQuery.data.value>["items"][number]>();
  for (const entry of budgetsQuery.data.value?.items ?? []) {
    map.set(entry.projectId, entry);
  }
  return map;
});

function budgetPctFor(projectId: string): number {
  const budget = budgetsByProject.value.get(projectId);
  if (!budget) return 0;
  if (budget.hoursBudget && budget.hoursBudget > 0) {
    return Math.min(100, Math.round((budget.hoursLogged / budget.hoursBudget) * 100));
  }
  if (budget.costBudgetCents && budget.costBudgetCents > 0) {
    return Math.min(100, Math.round((budget.costLoggedCents / budget.costBudgetCents) * 100));
  }
  return 0;
}

function budgetToneFor(projectId: string): string {
  const pct = budgetPctFor(projectId);
  if (pct >= 100) return "bg-error";
  if (pct >= 85) return "bg-warning";
  return "bg-primary";
}

const projects = computed(() => projectsQuery.data.value?.items ?? []);
const clients = computed(() => clientsQuery.data.value?.items ?? []);
const entries = computed(() => entriesQuery.data.value?.items ?? []);

function getWeekStartUtc(): Date {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

const hoursThisWeekByProject = computed(() => {
  const weekStartMs = getWeekStartUtc().getTime();
  const totals = new Map<string, number>();
  for (const entry of entries.value) {
    const startedAtMs = new Date(entry.startedAt).getTime();
    if (startedAtMs < weekStartMs) continue;
    totals.set(entry.projectId, (totals.get(entry.projectId) ?? 0) + entry.durationSeconds);
  }
  return totals;
});

const filteredProjects = computed(() => {
  const term = filterTerm.value.trim().toLowerCase();
  if (!term) return projects.value;
  return projects.value.filter((project) => {
    const haystack = `${project.name} ${project.clientName}`.toLowerCase();
    return haystack.includes(term);
  });
});

const isLoading = computed(() => projectsQuery.isPending.value || clientsQuery.isPending.value);
const isError = computed(() => Boolean(projectsQuery.error.value));

// --- New project inline ------------------------------------------------

const newProjectOpen = ref(false);
const newProjectName = ref("");
const newProjectClientId = ref("");

watch(newProjectOpen, (open) => {
  if (open && !newProjectClientId.value && clients.value[0]) {
    newProjectClientId.value = clients.value[0].id;
  }
});

async function createProject() {
  const name = newProjectName.value.trim();
  if (!name || !newProjectClientId.value || !teamId.value) return;
  const client = clients.value.find((c) => c.id === newProjectClientId.value);
  newProjectName.value = "";
  newProjectOpen.value = false;
  await agencyOps.createProject({
    teamId: teamId.value,
    clientId: newProjectClientId.value,
    clientName: client?.name ?? "",
    name,
  });
}
</script>

<template>
  <div class="agency-projects space-y-4">
    <!-- Filter bar -->
    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="filterTerm"
        icon="i-lucide-search"
        placeholder="Filter projects or clients"
        size="sm"
        class="w-64"
      />
      <UButton
        :label="showArchived ? 'Hide archived' : 'Show archived'"
        color="neutral"
        variant="ghost"
        size="xs"
        @click="showArchived = !showArchived"
      />

      <div class="ml-auto">
        <UPopover v-model:open="newProjectOpen" :content="{ align: 'end' }">
          <UButton
            label="New project"
            icon="i-lucide-plus"
            color="primary"
            size="xs"
            :disabled="!teamId || clients.length === 0"
          />
          <template #content>
            <form class="w-72 space-y-2 p-3" @submit.prevent="createProject">
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                New project
              </p>
              <div>
                <label class="text-[11px] font-bold text-muted">Client</label>
                <USelectMenu
                  v-model="newProjectClientId"
                  :items="clients.map((client) => ({ label: client.name, value: client.id }))"
                  value-key="value"
                  size="sm"
                  placeholder="Client"
                  class="mt-1"
                />
              </div>
              <div>
                <label class="text-[11px] font-bold text-muted">Name</label>
                <UInput
                  v-model="newProjectName"
                  placeholder="Project name"
                  size="sm"
                  class="mt-1"
                />
              </div>
              <UButton
                type="submit"
                label="Create project"
                color="primary"
                size="xs"
                block
                :loading="agencyOps.isProjectMutationPending"
                :disabled="!newProjectName.trim() || !newProjectClientId"
              />
            </form>
          </template>
        </UPopover>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="overflow-hidden rounded-2xl border border-default bg-default">
      <div
        v-for="rowIndex in 6"
        :key="rowIndex"
        class="border-b border-default last:border-b-0 px-4 py-4"
      >
        <div class="h-4 animate-pulse rounded-md bg-elevated/60" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="isError" class="rounded-2xl border border-error/30 bg-error/5 p-6 text-center">
      <UIcon name="i-lucide-alert-triangle" class="mx-auto size-5 text-error" />
      <p class="mt-3 text-sm font-bold text-highlighted">Couldn't load projects.</p>
      <p class="mt-1 text-xs text-muted">
        {{ getErrorMessage(projectsQuery.error.value, "Try refreshing.") }}
      </p>
      <UButton
        label="Retry"
        color="neutral"
        variant="soft"
        size="xs"
        class="mt-3"
        @click="projectsQuery.refetch()"
      />
    </div>

    <!-- Empty: no clients yet -->
    <div
      v-else-if="clients.length === 0"
      class="rounded-2xl border border-dashed border-default bg-muted/20 p-8 text-center"
    >
      <UIcon name="i-lucide-building-2" class="mx-auto size-6 text-muted" />
      <p class="mt-3 text-sm font-bold text-highlighted">No clients yet.</p>
      <p class="mt-1 text-xs text-muted">Add a client first, then their projects show up here.</p>
    </div>

    <!-- Empty: clients exist, no projects -->
    <div
      v-else-if="projects.length === 0"
      class="rounded-2xl border border-dashed border-default bg-muted/20 p-8 text-center"
    >
      <UIcon name="i-lucide-folder-kanban" class="mx-auto size-6 text-muted" />
      <p class="mt-3 text-sm font-bold text-highlighted">No projects yet.</p>
      <p class="mt-1 text-xs text-muted">
        Create your first project to start tracking time and budgets.
      </p>
      <UButton
        label="New project"
        color="primary"
        variant="soft"
        size="xs"
        class="mt-4"
        icon="i-lucide-plus"
        @click="newProjectOpen = true"
      />
    </div>

    <!-- Empty: filter cleared everything -->
    <div
      v-else-if="filteredProjects.length === 0"
      class="rounded-2xl border border-default bg-default p-8 text-center"
    >
      <p class="text-sm font-bold text-highlighted">No projects match.</p>
      <p class="mt-1 text-xs text-muted">Try a different search.</p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto rounded-2xl border border-default bg-default">
      <table class="w-full min-w-[56rem] text-xs">
        <thead class="border-b border-default bg-muted">
          <tr class="text-left text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            <th class="px-4 py-2.5 font-bold">Project</th>
            <th class="px-3 py-2.5 font-bold">Client</th>
            <th class="px-3 py-2.5 font-bold">Members</th>
            <th class="px-3 py-2.5 font-bold">Budget</th>
            <th class="px-3 py-2.5 font-bold text-right">Hours · this week</th>
            <th class="px-4 py-2.5 font-bold text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="project in filteredProjects"
            :key="project.id"
            class="cursor-pointer border-b border-default last:border-b-0 transition-colors hover:bg-elevated/40"
            tabindex="0"
            @click="emit('select', project.id)"
            @keydown.enter.prevent="emit('select', project.id)"
            @keydown.space.prevent="emit('select', project.id)"
          >
            <td class="px-4 py-3">
              <div class="flex min-w-0 items-center gap-2">
                <span
                  class="agency-projects__dot inline-block size-2 shrink-0 rounded-full"
                  aria-hidden="true"
                  :style="projectHueStyle(project.id)"
                />
                <span class="truncate font-bold text-highlighted">{{ project.name }}</span>
              </div>
            </td>
            <td class="px-3 py-3 text-muted">
              <span class="truncate">{{ project.clientName }}</span>
            </td>
            <td class="px-3 py-3 text-muted">
              <!-- Aspirational: members not yet exposed by API. Honest dash. -->
              <span class="text-dimmed">—</span>
            </td>
            <td class="px-3 py-3">
              <!-- Budget bar wired to budgets.list (Phase 4 stub returns
                   shaped-empty data; the bar fills once rows exist). -->
              <div class="flex items-center gap-2">
                <div class="h-1.5 flex-1 rounded-full bg-elevated">
                  <div
                    class="h-full rounded-full transition-[width] duration-200 ease-out"
                    :class="
                      budgetsByProject.get(project.id) ? budgetToneFor(project.id) : 'bg-muted'
                    "
                    :style="{
                      width: budgetsByProject.get(project.id)
                        ? `${budgetPctFor(project.id)}%`
                        : '0%',
                    }"
                  />
                </div>
                <span
                  class="text-[11px]"
                  :class="
                    budgetsByProject.get(project.id)
                      ? 'text-muted font-mono tabular-nums'
                      : 'text-dimmed'
                  "
                >
                  {{
                    budgetsByProject.get(project.id) ? `${budgetPctFor(project.id)}%` : "Not set"
                  }}
                </span>
              </div>
            </td>
            <td class="px-3 py-3 text-right">
              <span
                class="font-mono font-bold tabular-nums"
                :class="
                  (hoursThisWeekByProject.get(project.id) ?? 0) > 0
                    ? 'text-highlighted'
                    : 'text-dimmed'
                "
              >
                {{ formatDuration(hoursThisWeekByProject.get(project.id) ?? 0, "short") }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <span
                class="inline-flex items-center gap-1.5 rounded-full border border-default bg-muted px-2 py-0.5 text-[11px] font-bold text-muted"
              >
                <span class="inline-block size-1.5 rounded-full bg-success" aria-hidden="true" />
                Active
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.agency-projects__dot {
  background-color: var(--project-hue, var(--ui-color-primary-500));
}
:global(.dark) .agency-projects__dot {
  background-color: var(--project-hue-dark, var(--ui-color-primary-400));
}
</style>
