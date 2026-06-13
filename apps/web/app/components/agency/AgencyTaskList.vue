<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import type { SelectMenuItem } from "@nuxt/ui";

import { getErrorMessage } from "~/utils/get-error-message";
import { withAgencyLiveQueryOptions } from "~/utils/agency-query-options";
import { useAgencyOpsStore } from "~/stores/agency-ops";
import { useAuthSession } from "~/composables/useAuthClient";
import AgencyMiniTimer from "~/components/agency/AgencyMiniTimer.vue";

type Project = {
  id: string;
  clientName: string;
  name: string;
};

type AgencyProjectTask = {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  assigneeUserId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  dueDate: string | null;
};

type TaskStatus = AgencyProjectTask["status"];

const ALL_ASSIGNEES_VALUE = "__all_assignees__";
const ALL_PROJECTS_VALUE = "__all_projects__";
const UNASSIGNED_ASSIGNEE_VALUE = "__unassigned__";

const props = defineProps<{
  teamId: string;
  projects: Project[];
  selectedTaskId: string;
}>();

const emit = defineEmits<{
  select: [taskId: string];
  "select-project": [projectId: string];
}>();

const orpc = useOrpc();
const agencyOps = useAgencyOpsStore();
const authSession = useAuthSession();

const teamId = computed(() => props.teamId);
const currentUserId = computed(() => authSession.value?.data?.user?.id ?? "");
const statusFilter = ref<TaskStatus[]>(["open", "in_progress"]);
const assigneeFilter = ref(ALL_ASSIGNEES_VALUE);
const projectFilter = ref(ALL_PROJECTS_VALUE);
const search = ref("");
const titleDraft = ref("");
const selectedProjectIdForCreate = ref("");

const selectedStatusFilter = computed(() =>
  statusFilter.value.length > 0 ? statusFilter.value : undefined,
);
const selectedAssigneeFilter = computed(() =>
  assigneeFilter.value === ALL_ASSIGNEES_VALUE ? undefined : assigneeFilter.value,
);

watch(
  currentUserId,
  (id) => {
    if (id && assigneeFilter.value === ALL_ASSIGNEES_VALUE) {
      assigneeFilter.value = id;
    }
  },
  { immediate: true },
);

const membersQuery = useQuery(
  computed(() =>
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.taskThreads.members.list.queryOptions({
        input: { teamId: teamId.value },
      }),
      enabled: Boolean(teamId.value),
    }),
  ),
);

const tasksQuery = useQuery(
  computed(() =>
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.projectTasks.list.queryOptions({
        input: {
          teamId: teamId.value,
          statuses: selectedStatusFilter.value,
          assigneeUserId: selectedAssigneeFilter.value,
          search: search.value || undefined,
        },
      }),
      enabled: Boolean(teamId.value),
    }),
  ),
);

const tasksQueryKey = computed(
  () =>
    orpc.agencyOps.projectTasks.list.queryOptions({
      input: {
        teamId: teamId.value,
        statuses: selectedStatusFilter.value,
        assigneeUserId: selectedAssigneeFilter.value,
        search: search.value || undefined,
      },
    }).queryKey,
);

watch(
  tasksQueryKey,
  (next, prev) => {
    if (prev) agencyOps.unregisterProjectTasksQuery(prev);
    if (teamId.value) {
      agencyOps.registerProjectTasksQuery({ queryKey: next, teamId: teamId.value });
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  agencyOps.unregisterProjectTasksQuery(tasksQueryKey.value);
});

const tasks = computed(() => {
  let items = tasksQuery.data.value?.items ?? [];
  if (projectFilter.value !== ALL_PROJECTS_VALUE) {
    items = items.filter((t) => t.projectId === projectFilter.value);
  }
  return items;
});

const members = computed(() => membersQuery.data.value?.items ?? []);
const isTasksLoading = computed(() => tasksQuery.isPending.value);
const isTasksError = computed(() => tasksQuery.isError.value);
const isMembersLoading = computed(() => membersQuery.isPending.value);
const isTaskUpdatePending = computed(() => agencyOps.isTaskMutationPending);

const statusOptions: SelectMenuItem[] = [
  { label: "Open", value: "open" },
  { label: "In progress", value: "in_progress" },
  { label: "Done", value: "done" },
  { label: "Archived", value: "archived" },
];

const assigneeOptions = computed<SelectMenuItem[]>(() => [
  { label: "All assignees", value: ALL_ASSIGNEES_VALUE },
  ...members.value.map((m) => ({
    label: m.userName,
    value: m.userId,
    avatar: m.userAvatar ?? undefined,
  })),
]);

const rowAssigneeOptions = computed<SelectMenuItem[]>(() => [
  { label: "Unassigned", value: UNASSIGNED_ASSIGNEE_VALUE },
  ...members.value.map((m) => ({
    label: m.userName,
    value: m.userId,
    avatar: m.userAvatar ?? undefined,
  })),
]);

const projectOptions = computed<SelectMenuItem[]>(() => [
  { label: "All projects", value: ALL_PROJECTS_VALUE },
  ...props.projects.map((p) => ({
    label: `${p.clientName} · ${p.name}`,
    value: p.id,
  })),
]);

const createProjectOptions = computed<SelectMenuItem[]>(() =>
  props.projects.map((p) => ({
    label: `${p.clientName} · ${p.name}`,
    value: p.id,
  })),
);

function statusDotColor(status: string) {
  switch (status) {
    case "open":
      return "bg-muted";
    case "in_progress":
      return "bg-primary";
    case "done":
      return "bg-success";
    case "archived":
      return "bg-muted";
    default:
      return "bg-muted";
  }
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toDueDateIso(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

function formatDueDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getAssigneeMenuValue(task: AgencyProjectTask) {
  return task.assigneeUserId ?? UNASSIGNED_ASSIGNEE_VALUE;
}

function getAssigneePatchValue(value: string) {
  return value === UNASSIGNED_ASSIGNEE_VALUE ? null : value;
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return date.setHours(23, 59, 59, 999) < Date.now();
}

async function createTask() {
  const title = titleDraft.value.trim();
  const projectId = selectedProjectIdForCreate.value;
  if (!title || !projectId || !teamId.value) return;

  titleDraft.value = "";
  selectedProjectIdForCreate.value = "";

  await agencyOps.createProjectTask({
    teamId: teamId.value,
    projectId,
    title,
  });
}

function selectTask(taskId: string) {
  emit("select", taskId);
}

async function updateTask(
  task: AgencyProjectTask,
  patch: Partial<Pick<AgencyProjectTask, "status" | "assigneeUserId" | "dueDate">>,
) {
  try {
    await agencyOps.updateProjectTask({
      teamId: teamId.value,
      taskId: task.id,
      ...patch,
    });
  } catch {
    // Store surfaces the toast.
  }
}

function getProjectHue(projectId: string) {
  const index = props.projects.findIndex((p) => p.id === projectId);
  if (index === -1) return "bg-neutral-400";
  const hues = [
    "bg-rose-400",
    "bg-amber-400",
    "bg-emerald-400",
    "bg-sky-400",
    "bg-violet-400",
    "bg-fuchsia-400",
  ];
  return hues[index % hues.length];
}
</script>

<template>
  <section class="flex h-full flex-col rounded-2xl border border-default bg-default">
    <header class="border-b border-default px-4 py-3">
      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Search tasks"
          size="sm"
          class="min-w-0 flex-1"
        />
        <USelectMenu
          v-model="statusFilter"
          :items="statusOptions"
          size="sm"
          class="w-36"
          value-key="value"
          multiple
        />
        <USelectMenu
          v-model="assigneeFilter"
          :items="assigneeOptions"
          size="sm"
          class="w-32"
          value-key="value"
        />
        <USelectMenu
          v-model="projectFilter"
          :items="projectOptions"
          size="sm"
          class="w-40"
          value-key="value"
        />
      </div>

      <form class="mt-2 flex gap-2" @submit.prevent="createTask">
        <USelectMenu
          v-model="selectedProjectIdForCreate"
          :items="createProjectOptions"
          placeholder="Project"
          size="sm"
          class="w-40"
          value-key="value"
        />
        <UInput v-model="titleDraft" placeholder="Add a task" size="sm" class="min-w-0 flex-1" />
        <UButton
          type="submit"
          icon="i-lucide-plus"
          color="primary"
          size="sm"
          aria-label="Add task"
          :loading="agencyOps.isTaskMutationPending"
          :disabled="
            !titleDraft.trim() || !selectedProjectIdForCreate || agencyOps.isTaskMutationPending
          "
        />
      </form>
    </header>

    <div v-if="isTasksLoading" class="flex-1 space-y-2 overflow-y-auto p-4">
      <div
        v-for="rowIndex in 5"
        :key="rowIndex"
        class="h-12 animate-pulse rounded-xl bg-elevated/60"
      />
    </div>

    <div
      v-else-if="isTasksError"
      class="flex flex-1 flex-col items-center justify-center p-6 text-center"
      role="alert"
    >
      <UIcon name="i-lucide-alert-triangle" class="size-5 text-error" />
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

    <div
      v-else-if="tasks.length === 0"
      class="flex flex-1 flex-col items-center justify-center p-6 text-center"
    >
      <UIcon name="i-lucide-list-checks" class="size-6 text-muted" />
      <p class="mt-3 text-xs text-muted">No tasks match your filters.</p>
    </div>

    <ul v-else class="flex-1 divide-y divide-default overflow-y-auto" role="listbox" aria-label="Tasks">
      <li
        v-for="task in tasks"
        :key="task.id"
        role="option"
        :aria-selected="task.id === selectedTaskId"
        class="cursor-pointer px-4 py-3 transition-colors hover:bg-elevated/50 focus-visible:bg-elevated/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20 focus-visible:ring-inset"
        :class="task.id === selectedTaskId ? 'bg-primary/5' : ''"
        tabindex="0"
        @click="selectTask(task.id)"
        @keydown.enter.prevent="selectTask(task.id)"
        @keydown.space.prevent="selectTask(task.id)"
      >
        <div class="flex items-start gap-3">
          <span
            class="mt-1.5 size-2 shrink-0 rounded-full"
            :class="[statusDotColor(task.status)]"
            :title="task.status"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-highlighted">{{ task.title }}</p>
            <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span class="inline-flex items-center gap-1">
                <span class="size-1.5 rounded-full" :class="getProjectHue(task.projectId)" />
                {{ projects.find((p) => p.id === task.projectId)?.name ?? "Project" }}
              </span>
              <span v-if="task.assigneeName" class="inline-flex items-center gap-1 truncate">
                ·
                <UAvatar
                  :src="task.assigneeAvatar ?? undefined"
                  :alt="task.assigneeName"
                  :text="task.assigneeName.slice(0, 2)"
                  size="3xs"
                />
                {{ task.assigneeName }}
              </span>
              <span v-if="task.dueDate" :class="isOverdue(task.dueDate) ? 'text-error' : ''">
                · {{ formatDueDate(task.dueDate) }}
              </span>
            </div>
            <div class="mt-2 grid grid-cols-4 gap-1" @click.stop>
              <USelectMenu
                :model-value="task.status"
                :items="statusOptions"
                size="xs"
                value-key="value"
                :disabled="isTaskUpdatePending"
                @update:model-value="
                  updateTask(task, { status: $event as AgencyProjectTask['status'] })
                "
              />
              <USelectMenu
                :model-value="getAssigneeMenuValue(task)"
                :items="rowAssigneeOptions"
                size="xs"
                value-key="value"
                :disabled="isMembersLoading || isTaskUpdatePending"
                @update:model-value="
                  updateTask(task, { assigneeUserId: getAssigneePatchValue($event as string) })
                "
              />
              <UInput
                type="date"
                size="xs"
                :model-value="toDateInputValue(task.dueDate)"
                :disabled="isTaskUpdatePending"
                @update:model-value="updateTask(task, { dueDate: toDueDateIso(String($event)) })"
              />
              <div @click.stop>
                <AgencyMiniTimer
                  :team-id="teamId"
                  :task-id="task.id"
                  :project-id="task.projectId"
                  :task-title="task.title"
                  :project-name="projects.find((p) => p.id === task.projectId)?.name"
                />
              </div>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>
