<script setup lang="ts">
import type { SelectMenuItem } from "@nuxt/ui";

type Project = {
  id: string;
  clientName: string;
  name: string;
};

type TaskStatus = "open" | "in_progress" | "done" | "archived";

type AgencyTask = {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  assigneeName?: string | null;
  dueDate?: string | null;
};

type TaskChooserItem = SelectMenuItem & {
  kind?: "task" | "client" | "project";
  value?: string;
  searchText?: string;
  projectName?: string;
  clientName?: string;
  status?: TaskStatus;
  assigneeName?: string | null;
  dueDate?: string | null;
};

const props = withDefaults(
  defineProps<{
    modelValue: string;
    projects: Project[];
    tasks: AgencyTask[];
    disabled?: boolean;
    loading?: boolean;
    placeholder?: string;
    searchPlaceholder?: string;
    size?: "xs" | "sm" | "md";
  }>(),
  {
    disabled: false,
    loading: false,
    placeholder: "Task",
    searchPlaceholder: "Search tasks, projects, or clients",
    size: "sm",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const searchTerm = ref("");

const selectedTaskId = computed({
  get: () => props.modelValue,
  set: (value: string | null | undefined) => {
    emit("update:modelValue", value ?? "");
  },
});

const projectsById = computed(
  () => new Map(props.projects.map((project) => [project.id, project])),
);

const selectedTask = computed(
  () => props.tasks.find((task) => task.id === props.modelValue) ?? null,
);
const selectedProject = computed(() =>
  selectedTask.value ? (projectsById.value.get(selectedTask.value.projectId) ?? null) : null,
);
const selectedLabel = computed(() => {
  if (!selectedTask.value) return "";
  const project = selectedProject.value;
  if (!project) return selectedTask.value.title;
  return `${selectedTask.value.title} · ${project.name}`;
});

const filteredTasks = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();

  if (!query) {
    return props.tasks;
  }

  return props.tasks.filter((task) => {
    const project = projectsById.value.get(task.projectId);
    const searchableText = [
      task.title,
      task.status,
      task.assigneeName ?? "",
      project?.name ?? "",
      project?.clientName ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(query);
  });
});

const taskItems = computed<TaskChooserItem[]>(() => {
  const tasksByProject = new Map<string, AgencyTask[]>();

  for (const task of filteredTasks.value) {
    const existing = tasksByProject.get(task.projectId) ?? [];
    existing.push(task);
    tasksByProject.set(task.projectId, existing);
  }

  const sortedProjects = props.projects
    .filter((project) => tasksByProject.has(project.id))
    .sort((left, right) => {
      const clientSort = left.clientName.localeCompare(right.clientName);
      return clientSort || left.name.localeCompare(right.name);
    });
  const items: TaskChooserItem[] = [];
  let currentClientName = "";

  for (const project of sortedProjects) {
    if (project.clientName !== currentClientName) {
      currentClientName = project.clientName;
      items.push({
        type: "label",
        kind: "client",
        label: project.clientName,
        ui: {
          label:
            "px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted first:pt-1",
        },
      });
    }

    items.push({
      type: "label",
      kind: "project",
      label: project.name,
      ui: {
        label: "px-3 py-1 text-[11px] font-semibold text-highlighted",
      },
    });

    for (const task of [...(tasksByProject.get(project.id) ?? [])].sort((left, right) =>
      left.title.localeCompare(right.title),
    )) {
      items.push({
        kind: "task",
        label: task.title,
        value: task.id,
        searchText: `${task.title} ${project.name} ${project.clientName} ${task.assigneeName ?? ""}`,
        projectName: project.name,
        clientName: project.clientName,
        status: task.status,
        assigneeName: task.assigneeName,
        dueDate: task.dueDate,
        ui: {
          item: "mx-1 rounded-lg py-2 ps-6 pe-2",
          itemLabel: "w-full min-w-0",
        },
      });
    }
  }

  return items;
});

function isTaskItem(item: SelectMenuItem): item is TaskChooserItem {
  return (item as TaskChooserItem).kind === "task";
}

function statusLabel(status: TaskStatus | undefined) {
  switch (status) {
    case "in_progress":
      return "In progress";
    case "done":
      return "Done";
    case "archived":
      return "Archived";
    case "open":
    default:
      return "Open";
  }
}

function statusDotClass(status: TaskStatus | undefined) {
  switch (status) {
    case "in_progress":
      return "bg-primary";
    case "done":
      return "bg-success";
    case "archived":
      return "bg-muted";
    case "open":
    default:
      return "bg-muted";
  }
}

function formatDueDate(iso: string | null | undefined) {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
</script>

<template>
  <USelectMenu
    v-model="selectedTaskId"
    v-model:search-term="searchTerm"
    :items="taskItems"
    :placeholder="placeholder"
    :search-input="{
      icon: 'i-lucide-search',
      placeholder: searchPlaceholder,
    }"
    :content="{ align: 'start', sideOffset: 6 }"
    :size="size"
    :disabled="disabled"
    :loading="loading"
    ignore-filter
    value-key="value"
    label-key="label"
    icon="i-lucide-list-checks"
    :ui="{
      content:
        'w-[34rem] min-w-[20rem] max-w-[calc(100vw-2rem)] max-h-96 overflow-hidden rounded-2xl',
      viewport: 'max-h-80 overflow-y-auto p-1',
      item: 'rounded-lg data-highlighted:not-data-disabled:before:bg-elevated/70',
      itemLabel: 'w-full min-w-0',
      empty: 'p-4 text-xs text-muted',
      input: 'border-b border-default',
      value: 'truncate',
    }"
  >
    <template #default>
      <span v-if="selectedLabel" class="truncate">{{ selectedLabel }}</span>
      <span v-else class="truncate text-dimmed">{{ placeholder }}</span>
    </template>

    <template #item-label="{ item }">
      <div v-if="isTaskItem(item)" class="min-w-0">
        <div class="flex min-w-0 items-center gap-2">
          <span class="size-1.5 shrink-0 rounded-full" :class="statusDotClass(item.status)" />
          <span class="truncate text-sm font-semibold text-highlighted">{{ item.label }}</span>
        </div>
        <div
          class="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted"
        >
          <span>{{ statusLabel(item.status) }}</span>
          <span v-if="item.assigneeName" class="truncate">{{ item.assigneeName }}</span>
          <span v-if="formatDueDate(item.dueDate)">Due {{ formatDueDate(item.dueDate) }}</span>
        </div>
      </div>
      <span v-else>{{ item.label }}</span>
    </template>

    <template #empty>
      {{ searchTerm.trim() ? "No matching active tasks." : "No open or in-progress tasks." }}
    </template>
  </USelectMenu>
</template>
