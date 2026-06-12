<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

import AgencyTaskList from "~/components/agency/AgencyTaskList.vue";
import AgencyTaskThread from "~/components/agency/AgencyTaskThread.vue";
import AgencyTimeEntriesLog from "~/components/agency/AgencyTimeEntriesLog.vue";
import AgencyTimeTracker from "~/components/agency/AgencyTimeTracker.vue";

const props = defineProps<{
  teamId: string;
}>();

const emit = defineEmits<{
  "select-project": [projectId: string];
}>();

const orpc = useOrpc();
const teamId = computed(() => props.teamId);

const projectsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.projects.list.queryOptions({
      input: { teamId: teamId.value },
    }),
    enabled: Boolean(teamId.value),
  })),
);

const projects = computed(() => projectsQuery.data.value?.items ?? []);

const selectedTaskId = ref("");

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
  <div class="flex h-[calc(100vh-14rem)] min-h-0 flex-col gap-4 lg:flex-row">
    <div
      class="h-full min-h-0 min-w-0 lg:w-[28rem] lg:max-w-[28rem] lg:flex-none"
      :class="selectedTaskId ? 'hidden lg:block' : ''"
    >
      <AgencyTaskList
        :team-id="teamId"
        :projects="projects"
        :selected-task-id="selectedTaskId"
        @select="selectTask"
        @select-project="handleSelectProject"
      />
    </div>

    <div v-if="selectedTaskId" class="h-full min-h-0 min-w-0 flex-1">
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
      class="hidden h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-default bg-default p-4 lg:flex"
    >
      <AgencyTimeTracker :team-id="teamId" />
      <AgencyTimeEntriesLog :team-id="teamId" class="mt-6" />
    </div>
  </div>
</template>
