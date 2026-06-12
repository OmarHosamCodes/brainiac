<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

import AgencyTaskList from "~/components/agency/AgencyTaskList.vue";
import AgencyTaskThread from "~/components/agency/AgencyTaskThread.vue";

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
  <div class="grid h-[calc(100vh-14rem)] grid-cols-1 gap-4 lg:grid-cols-[minmax(20rem,28rem),1fr]">
    <AgencyTaskList
      :team-id="teamId"
      :projects="projects"
      :selected-task-id="selectedTaskId"
      @select="selectTask"
      @select-project="handleSelectProject"
    />

    <AgencyTaskThread
      v-if="selectedTaskId"
      :team-id="teamId"
      :task-id="selectedTaskId"
      :projects="projects"
      @back="clearTask"
    />

    <div
      v-else
      class="hidden flex-col items-center justify-center rounded-2xl border border-dashed border-default bg-muted/20 lg:flex"
    >
      <UIcon name="i-lucide-briefcase" class="size-10 text-muted" />
      <p class="mt-4 text-sm font-bold text-highlighted">Select a task to view its thread.</p>
      <p class="mt-1 text-xs text-muted">Track time, share files, and talk it through.</p>
    </div>
  </div>
</template>
