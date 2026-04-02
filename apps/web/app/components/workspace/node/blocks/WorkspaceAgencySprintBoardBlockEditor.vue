<script setup lang="ts">
import type { WorkspaceAgencySprintBoardBlock } from "@brainiac/workspace";
import { useMutation, useQuery } from "@tanstack/vue-query";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
  block: WorkspaceAgencySprintBoardBlock;
  tabId: string;
}>();

const { currentNode, mutateBlock } = useWorkspaceNodeEditorContext();
const orpc = useOrpc();
const toast = useToast();
const authSession = useAuthSession();
const authEnabled = computed(() => Boolean(authSession.value?.data?.user));

const statusLabelMap = {
  todo: "To do",
  doing: "Doing",
  done: "Done",
} as const;

const sprintBoardColumns = [
  { key: "todo", label: statusLabelMap.todo },
  { key: "doing", label: statusLabelMap.doing },
  { key: "done", label: statusLabelMap.done },
] as const;

const teamsQuery = useQuery(
  computed(() => ({
    ...orpc.team.list.queryOptions(),
    enabled: authEnabled.value,
  })),
);
const teams = computed(() => teamsQuery.data.value?.items ?? []);
const teamIds = computed(() => new Set(teams.value.map((team) => team.id)));
const preferredTeamId = computed(() => props.block.teamId ?? currentNode.value?.teamId ?? "");
const effectiveTeamId = computed(() => {
  if (!preferredTeamId.value) {
    return teams.value[0]?.id ?? "";
  }

  return teamIds.value.has(preferredTeamId.value) ? preferredTeamId.value : "";
});

const projectsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.projects.list.queryOptions({
      input: {
        teamId: effectiveTeamId.value,
        statuses: ["planning", "active", "paused"],
      },
    }),
    enabled: Boolean(effectiveTeamId.value),
  })),
);

const sprintsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.sprints.list.queryOptions({
      input: {
        teamId: effectiveTeamId.value,
      },
    }),
    enabled: Boolean(effectiveTeamId.value),
  })),
);

const projects = computed(() => projectsQuery.data.value?.items ?? []);
const sprints = computed(() => sprintsQuery.data.value?.items ?? []);

const activeSprintId = computed({
  get: () =>
    props.block.activeSprintId ??
    sprints.value.find((sprint) => sprint.status === "active")?.id ??
    sprints.value[0]?.id ??
    "",
  set: (value: string) => {
    mutateBlock(props.tabId, props.block.id, (block) => {
      if (block.type !== "agency-sprint-board") {
        return;
      }

      block.activeSprintId = value || null;
    });
  },
});

const sprintItemsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.sprintItems.list.queryOptions({
      input: {
        teamId: effectiveTeamId.value,
        sprintId: activeSprintId.value,
      },
    }),
    enabled: Boolean(effectiveTeamId.value && activeSprintId.value),
  })),
);

const sprintItems = computed(() => sprintItemsQuery.data.value?.items ?? []);

const selectedProjectIdForSprint = ref("");
const sprintDraft = reactive({
  name: "",
  startDate: "",
  endDate: "",
});

const sprintItemDraft = reactive({
  title: "",
  description: "",
  estimateMinutes: "60",
  type: "task" as "task" | "step",
});

watch(
  projects,
  (nextProjects) => {
    if (
      selectedProjectIdForSprint.value &&
      nextProjects.some((project) => project.id === selectedProjectIdForSprint.value)
    ) {
      return;
    }

    selectedProjectIdForSprint.value =
      sprints.value.find((sprint) => sprint.id === activeSprintId.value)?.projectId ??
      nextProjects[0]?.id ??
      "";
  },
  { immediate: true },
);

const createSprintMutation = useMutation(orpc.agencyOps.sprints.create.mutationOptions());
const createSprintItemMutation = useMutation(orpc.agencyOps.sprintItems.create.mutationOptions());
const updateSprintItemMutation = useMutation(orpc.agencyOps.sprintItems.update.mutationOptions());

const sprintOptions = computed(() =>
  sprints.value.map((sprint) => ({
    label: `${sprint.name} (${sprint.status})`,
    value: sprint.id,
  })),
);

const projectOptions = computed(() =>
  projects.value.map((project) => ({
    label: `${project.name} · ${project.clientName}`,
    value: project.id,
  })),
);

const groupedItems = computed(() => {
  const filtered = props.block.showCompletedItems
    ? sprintItems.value
    : sprintItems.value.filter((item) => item.status !== "done");

  return {
    todo: filtered.filter((item) => item.status === "todo"),
    doing: filtered.filter((item) => item.status === "doing"),
    done: filtered.filter((item) => item.status === "done"),
  };
});

function updateTeam(teamId: string | undefined) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "agency-sprint-board") {
      return;
    }

    block.teamId = teamId || null;
  });
}

function toggleShowCompleted(showCompleted: boolean) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "agency-sprint-board") {
      return;
    }

    block.showCompletedItems = showCompleted;
  });
}

function toIso(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function toInteger(value: string, fallback = 0) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.round(numeric));
}

async function refreshBoardData() {
  await Promise.all([sprintsQuery.refetch(), sprintItemsQuery.refetch()]);
}

async function createSprint() {
  const teamId = effectiveTeamId.value;
  const projectId = selectedProjectIdForSprint.value;
  const name = sprintDraft.name.trim();

  if (!teamId || !projectId || !name) {
    return;
  }

  try {
    const created = await createSprintMutation.mutateAsync({
      teamId,
      projectId,
      name,
      startDate: toIso(sprintDraft.startDate),
      endDate: toIso(sprintDraft.endDate),
    });

    sprintDraft.name = "";
    sprintDraft.startDate = "";
    sprintDraft.endDate = "";
    activeSprintId.value = created.id;
    await refreshBoardData();
  } catch (error) {
    toast.add({
      title: "Unable to create sprint",
      description: getErrorMessage(error, "Please try again."),
      color: "error",
    });
  }
}

async function createSprintItem() {
  const teamId = effectiveTeamId.value;
  const sprintId = activeSprintId.value;
  const sprint = sprints.value.find((entry) => entry.id === sprintId);
  const title = sprintItemDraft.title.trim();

  if (!teamId || !sprint || !title) {
    return;
  }

  try {
    await createSprintItemMutation.mutateAsync({
      teamId,
      sprintId,
      projectId: sprint.projectId,
      type: sprintItemDraft.type,
      title,
      description: sprintItemDraft.description.trim(),
      estimateMinutes: toInteger(sprintItemDraft.estimateMinutes, 60),
    });

    sprintItemDraft.title = "";
    sprintItemDraft.description = "";
    sprintItemDraft.estimateMinutes = "60";
    await sprintItemsQuery.refetch();
  } catch (error) {
    toast.add({
      title: "Unable to create sprint item",
      description: getErrorMessage(error, "Please try again."),
      color: "error",
    });
  }
}

async function moveItem(itemId: string, status: "todo" | "doing" | "done") {
  const teamId = effectiveTeamId.value;

  if (!teamId) {
    return;
  }

  try {
    await updateSprintItemMutation.mutateAsync({
      teamId,
      sprintItemId: itemId,
      status,
    });

    await sprintItemsQuery.refetch();
  } catch (error) {
    toast.add({
      title: "Unable to move sprint item",
      description: getErrorMessage(error, "Please try again."),
      color: "error",
    });
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="grid gap-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4 md:grid-cols-2 xl:grid-cols-4">
      <UFormField label="Team binding" size="sm">
        <USelect
          :model-value="effectiveTeamId"
          :items="teams.map((team) => ({ label: `${team.name} (${team.role})`, value: team.id }))"
          placeholder="Select a team"
          size="sm"
          @update:model-value="updateTeam($event as string | undefined)"
        />
      </UFormField>

      <UFormField label="Active sprint" size="sm">
        <USelect
          :model-value="activeSprintId"
          :items="sprintOptions"
          placeholder="Choose sprint"
          size="sm"
          :disabled="!effectiveTeamId"
          @update:model-value="activeSprintId = (($event as string | undefined) ?? '')"
        />
      </UFormField>

      <label class="flex items-center gap-3 rounded-2xl border border-muted/20 bg-default/60 px-3 py-2">
        <UCheckbox
          :model-value="block.showCompletedItems"
          @update:model-value="toggleShowCompleted(Boolean($event))"
        />
        <span class="text-sm text-toned">Show completed</span>
      </label>

      <div class="rounded-2xl border border-muted/20 bg-default/60 px-3 py-2 text-xs text-muted">
        Tasks and subtasks on this board are first-class sprint items, not block-embedded JSON.
      </div>
    </div>

    <UAlert
      v-if="!effectiveTeamId"
      color="warning"
      variant="soft"
      icon="i-lucide-users-round"
      title="Team required"
      description="Bind this block to a team before creating sprints and tasks."
    />

    <div class="grid gap-6 xl:grid-cols-2">
      <section class="space-y-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4">
        <h3 class="text-sm font-semibold text-highlighted">Create sprint</h3>

        <USelect
          v-model="selectedProjectIdForSprint"
          :items="projectOptions"
          placeholder="Project"
          :disabled="!effectiveTeamId"
        />
        <UInput v-model="sprintDraft.name" placeholder="Sprint name" :disabled="!effectiveTeamId" />

        <div class="grid gap-2 sm:grid-cols-2">
          <UInput v-model="sprintDraft.startDate" type="date" :disabled="!effectiveTeamId" />
          <UInput v-model="sprintDraft.endDate" type="date" :disabled="!effectiveTeamId" />
        </div>

        <UButton
          color="primary"
          icon="i-lucide-flag"
          :loading="createSprintMutation.isPending.value"
          :disabled="!effectiveTeamId || !selectedProjectIdForSprint || !sprintDraft.name.trim()"
          @click="createSprint"
        >
          Create sprint
        </UButton>
      </section>

      <section class="space-y-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4">
        <h3 class="text-sm font-semibold text-highlighted">Add sprint item</h3>

        <div class="grid gap-2 sm:grid-cols-[140px_1fr]">
          <USelect
            v-model="sprintItemDraft.type"
            :items="[
              { label: 'Task', value: 'task' },
              { label: 'Step', value: 'step' },
            ]"
            :disabled="!activeSprintId"
          />
          <UInput
            v-model="sprintItemDraft.title"
            placeholder="Task title"
            :disabled="!activeSprintId"
          />
        </div>

        <UTextarea
          v-model="sprintItemDraft.description"
          :rows="2"
          autoresize
          placeholder="Optional delivery details"
          :disabled="!activeSprintId"
        />

        <div class="flex items-center gap-2">
          <UInput
            v-model="sprintItemDraft.estimateMinutes"
            type="number"
            min="0"
            step="5"
            placeholder="Estimate minutes"
            :disabled="!activeSprintId"
          />
          <UButton
            color="primary"
            icon="i-lucide-plus"
            :loading="createSprintItemMutation.isPending.value"
            :disabled="!activeSprintId || !sprintItemDraft.title.trim()"
            @click="createSprintItem"
          >
            Add item
          </UButton>
        </div>
      </section>
    </div>

    <div class="grid gap-4 xl:grid-cols-3">
      <section
        v-for="column in sprintBoardColumns"
        :key="column.key"
        class="space-y-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-highlighted">{{ column.label }}</h3>
          <UBadge color="neutral" variant="soft">{{ groupedItems[column.key].length }}</UBadge>
        </div>

        <article
          v-for="item in groupedItems[column.key]"
          :key="item.id"
          class="rounded-2xl border border-muted/20 bg-default/70 p-3"
        >
          <p class="text-sm font-medium text-highlighted">{{ item.title }}</p>
          <p class="mt-1 text-xs text-muted">
            {{ item.projectName }} · {{ Math.round(item.estimateMinutes / 60) }}h estimate
          </p>
          <p v-if="item.description" class="mt-1 text-xs text-toned">{{ item.description }}</p>

          <div class="mt-3 flex items-center gap-2">
            <UButton
              v-if="item.status !== 'todo'"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="moveItem(item.id, item.status === 'done' ? 'doing' : 'todo')"
            >
              Move left
            </UButton>
            <UButton
              v-if="item.status !== 'done'"
              color="primary"
              variant="soft"
              size="xs"
              @click="moveItem(item.id, item.status === 'todo' ? 'doing' : 'done')"
            >
              Move right
            </UButton>
          </div>
        </article>
      </section>
    </div>
  </div>
</template>
