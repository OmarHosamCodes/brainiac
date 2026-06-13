<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

import { getErrorMessage } from "~/utils/get-error-message";
import { withAgencyLiveQueryOptions } from "~/utils/agency-query-options";
import { useAgencyOpsStore } from "~/stores/agency-ops";

const props = defineProps<{
  teamId: string;
  projectId: string;
  projectName: string;
}>();

const orpc = useOrpc();
const agencyOps = useAgencyOpsStore();

const teamId = computed(() => props.teamId);
const projectId = computed(() => props.projectId);

const titleDraft = ref("");

const tasksQuery = useQuery(
  computed(() =>
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.projectTasks.list.queryOptions({
        input: { teamId: teamId.value, projectId: projectId.value },
      }),
      enabled: Boolean(teamId.value) && Boolean(projectId.value),
    }),
  ),
);

const tasksQueryKey = computed(
  () =>
    orpc.agencyOps.projectTasks.list.queryOptions({
      input: { teamId: teamId.value, projectId: projectId.value },
    }).queryKey,
);

watch(
  tasksQueryKey,
  (next, prev) => {
    if (prev) agencyOps.unregisterProjectTasksQuery(prev);
    if (teamId.value && projectId.value) {
      agencyOps.registerProjectTasksQuery({
        queryKey: next,
        teamId: teamId.value,
        projectId: projectId.value,
      });
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  agencyOps.unregisterProjectTasksQuery(tasksQueryKey.value);
});

const tasks = computed(() => tasksQuery.data.value?.items ?? []);
const isLoading = computed(() => tasksQuery.isPending.value);
const isError = computed(() => Boolean(tasksQuery.error.value));

async function createTask() {
  const title = titleDraft.value.trim();
  if (!title || !teamId.value || !projectId.value) return;
  titleDraft.value = "";
  await agencyOps.createProjectTask({
    teamId: teamId.value,
    projectId: projectId.value,
    title,
  });
}

async function deleteTask(task: { id: string; title: string }) {
  if (!teamId.value) return;
  await agencyOps.deleteProjectTask({
    teamId: teamId.value,
    taskId: task.id,
    taskTitle: task.title,
  });
}

function formatTaskDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
</script>

<template>
  <section class="rounded-2xl border border-default bg-default">
    <header
      class="flex flex-wrap items-center justify-between gap-3 border-b border-default px-4 py-3"
    >
      <div class="min-w-0">
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Tasks</p>
        <p class="mt-1 truncate text-xs text-muted">
          {{ projectName }}
        </p>
      </div>

      <form
        class="flex min-w-0 flex-1 items-center justify-end gap-2 sm:max-w-md"
        @submit.prevent="createTask"
      >
        <UInput
          v-model="titleDraft"
          icon="i-lucide-list-plus"
          placeholder="Add a task"
          size="sm"
          class="min-w-0 flex-1"
        />
        <UButton
          type="submit"
          icon="i-lucide-plus"
          color="primary"
          size="sm"
          aria-label="Add task"
          :loading="agencyOps.isTaskMutationPending"
          :disabled="!titleDraft.trim() || agencyOps.isTaskMutationPending"
        />
      </form>
    </header>

    <div v-if="isLoading" class="divide-y divide-default">
      <div v-for="rowIndex in 4" :key="rowIndex" class="px-4 py-3">
        <div class="h-4 animate-pulse rounded-md bg-elevated/60" />
      </div>
    </div>

    <div v-else-if="isError" class="px-4 py-8 text-center">
      <UIcon name="i-lucide-alert-triangle" class="mx-auto size-5 text-error" />
      <p class="mt-3 text-sm font-bold text-highlighted">Couldn't load tasks.</p>
      <p class="mt-1 text-xs text-muted">
        {{ getErrorMessage(tasksQuery.error.value, "Try refreshing.") }}
      </p>
      <UButton
        label="Retry"
        color="neutral"
        variant="soft"
        size="xs"
        class="mt-3"
        @click="tasksQuery.refetch()"
      />
    </div>

    <div v-else-if="tasks.length === 0" class="px-4 py-8 text-center">
      <UIcon name="i-lucide-list-checks" class="mx-auto size-5 text-muted" />
      <p class="mt-3 text-xs text-muted">No tasks yet.</p>
    </div>

    <ul v-else class="divide-y divide-default">
      <li
        v-for="task in tasks"
        :key="task.id"
        class="grid grid-cols-[1fr,5rem,2.25rem] items-center gap-3 px-4 py-2.5 text-xs"
      >
        <span class="min-w-0 truncate font-bold text-highlighted">{{ task.title }}</span>
        <span class="font-mono tabular-nums text-muted">{{ formatTaskDate(task.createdAt) }}</span>
        <UTooltip text="Delete task">
          <UButton
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Delete task"
            :loading="agencyOps.deletingTaskIds.includes(task.id)"
            :disabled="agencyOps.deletingTaskIds.includes(task.id)"
            @click="deleteTask(task)"
          />
        </UTooltip>
      </li>
    </ul>
  </section>
</template>
