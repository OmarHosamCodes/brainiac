<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

import AgencyTaskList from "~/components/agency/AgencyTaskList.vue";
import AgencyTaskThread from "~/components/agency/AgencyTaskThread.vue";
import AgencyTimeEntriesLog from "~/components/agency/AgencyTimeEntriesLog.vue";
import AgencyTimeTracker from "~/components/agency/AgencyTimeTracker.vue";
import { getErrorMessage } from "~/utils/get-error-message";
import { withAgencyLiveQueryOptions } from "~/utils/agency-query-options";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyPanelClass,
} from "~/utils/agency-ui";

const props = defineProps<{
  teamId: string;
}>();

const emit = defineEmits<{
  "select-project": [projectId: string];
}>();

const orpc = useOrpc();
const teamId = computed(() => props.teamId);

const projectsQuery = useQuery(
  computed(() =>
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.projects.list.queryOptions({
        input: { teamId: teamId.value },
      }),
      enabled: Boolean(teamId.value),
    }),
  ),
);

const projects = computed(() => projectsQuery.data.value?.items ?? []);
const isProjectsLoading = computed(() => projectsQuery.isPending.value);
const isProjectsError = computed(() => Boolean(projectsQuery.error.value));

const selectedTaskId = ref("");
const mobilePane = ref<"tasks" | "time">("tasks");

function selectTask(taskId: string) {
  selectedTaskId.value = taskId;
}

function clearTask() {
  selectedTaskId.value = "";
}

function handleSelectProject(projectId: string) {
  emit("select-project", projectId);
}
</script>

<template>
  <div v-if="isProjectsLoading" class="space-y-3">
    <div class="h-12 animate-pulse rounded-2xl bg-elevated/60" />
    <div class="h-96 animate-pulse rounded-2xl bg-elevated/60" />
  </div>

  <div v-else-if="isProjectsError" :class="agencyErrorPanelClass" role="alert">
    <UIcon name="i-lucide-alert-triangle" class="mx-auto size-5 text-error" />
    <p class="mt-3 text-sm font-bold text-highlighted">Couldn't load work data.</p>
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

  <div
    v-else-if="projects.length === 0"
    :class="agencyEmptyPanelClass"
  >
    <UIcon name="i-lucide-briefcase" class="mx-auto size-7 text-muted" />
    <p class="mt-4 text-sm font-bold text-highlighted">No projects yet.</p>
    <p class="mt-1 text-xs text-muted">Add a client and project to start tracking work and time.</p>
  </div>

  <div v-else class="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
    <!-- Mobile pane switcher -->
    <div
      v-if="!selectedTaskId"
      class="inline-flex rounded-full border border-default bg-elevated p-1 lg:hidden"
      role="tablist"
      aria-label="Work panes"
    >
      <button
        type="button"
        role="tab"
        :aria-selected="mobilePane === 'tasks'"
        class="rounded-full px-3 py-1 text-[11px] font-bold transition-colors"
        :class="mobilePane === 'tasks' ? 'bg-default text-highlighted' : 'text-muted'"
        @click="mobilePane = 'tasks'"
      >
        Tasks
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="mobilePane === 'time'"
        class="rounded-full px-3 py-1 text-[11px] font-bold transition-colors"
        :class="mobilePane === 'time' ? 'bg-default text-highlighted' : 'text-muted'"
        @click="mobilePane = 'time'"
      >
        Time
      </button>
    </div>

    <div
      class="min-h-0 min-w-0 lg:h-full lg:w-[28rem] lg:max-w-[28rem] lg:flex-none"
      :class="[
        selectedTaskId ? 'hidden lg:block' : '',
        !selectedTaskId && mobilePane !== 'tasks' ? 'hidden lg:block' : '',
      ]"
    >
      <AgencyTaskList
        :team-id="teamId"
        :projects="projects"
        :selected-task-id="selectedTaskId"
        @select="selectTask"
        @select-project="handleSelectProject"
      />
    </div>

    <div v-if="selectedTaskId" class="min-h-0 min-w-0 flex-1 lg:h-full">
      <AgencyTaskThread
        :key="selectedTaskId"
        :team-id="teamId"
        :task-id="selectedTaskId"
        :projects="projects"
        @back="clearTask"
      />
    </div>

    <div
      v-else
      :class="[
        agencyPanelClass,
        'flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4',
        mobilePane !== 'time' ? 'hidden lg:flex' : 'flex',
      ]"
    >
      <AgencyTimeTracker :team-id="teamId" />
      <AgencyTimeEntriesLog :team-id="teamId" class="mt-6" />
    </div>
  </div>
</template>
