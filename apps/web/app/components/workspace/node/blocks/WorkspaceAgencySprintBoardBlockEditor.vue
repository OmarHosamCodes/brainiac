<script setup lang="ts">
import type { WorkspaceAgencySprintBoardBlock } from "@brainiac/workspace";
import { useMutation, useQuery } from "@tanstack/vue-query";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
  block: WorkspaceAgencySprintBoardBlock;
  tabId: string;
}>();

const { currentNode, mutateTypedBlock } = useWorkspaceNodeEditorContext();
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
const teamsById = computed(() => new Map(teams.value.map((team) => [team.id, team])));
const preferredTeamId = computed(() => props.block.teamId ?? currentNode.value?.teamId ?? "");
const selectedTeamIsUnavailable = computed(
  () => Boolean(preferredTeamId.value) && !teamsById.value.has(preferredTeamId.value),
);

const effectiveTeamId = computed(() => {
  if (!preferredTeamId.value) {
    return teams.value[0]?.id ?? "";
  }

  if (!teamsById.value.has(preferredTeamId.value)) {
    return "";
  }

  return preferredTeamId.value;
});

const selectedTeam = computed(() => teamsById.value.get(effectiveTeamId.value) ?? null);

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

function mutateSprintBoardBlock(mutator: (block: WorkspaceAgencySprintBoardBlock) => void) {
  mutateTypedBlock(props.tabId, props.block.id, "agency-sprint-board", mutator);
}

const activeSprintId = computed({
  get: () =>
    props.block.activeSprintId ??
    sprints.value.find((sprint) => sprint.status === "active")?.id ??
    sprints.value[0]?.id ??
    "",
  set: (value: string) => {
    mutateSprintBoardBlock((block) => {
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
const activeSprint = computed(
  () => sprints.value.find((sprint) => sprint.id === activeSprintId.value) ?? null,
);

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
      activeSprint.value?.projectId ??
      nextProjects[0]?.id ??
      "";
  },
  { immediate: true },
);

const createSprintMutation = useMutation(orpc.agencyOps.sprints.create.mutationOptions());
const createSprintItemMutation = useMutation(orpc.agencyOps.sprintItems.create.mutationOptions());
const updateSprintItemMutation = useMutation(orpc.agencyOps.sprintItems.update.mutationOptions());

const boardBusy = computed(
  () =>
    createSprintMutation.isPending.value ||
    createSprintItemMutation.isPending.value ||
    updateSprintItemMutation.isPending.value,
);

const boardRefreshing = computed(
  () =>
    teamsQuery.isFetching.value ||
    projectsQuery.isFetching.value ||
    sprintsQuery.isFetching.value ||
    sprintItemsQuery.isFetching.value,
);

const boardQueryError = computed(
  () =>
    teamsQuery.error.value ||
    projectsQuery.error.value ||
    sprintsQuery.error.value ||
    sprintItemsQuery.error.value ||
    null,
);

const sprintOptions = computed(() =>
  sprints.value.map((sprint) => ({
    label: `${sprint.name} (${sprint.status})`,
    value: sprint.id,
  })),
);

const teamOptions = computed(() =>
  teams.value.map((team) => ({
    label: `${team.name} (${team.role})`,
    value: team.id,
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

const visibleItemCount = computed(
  () => groupedItems.value.todo.length + groupedItems.value.doing.length + groupedItems.value.done.length,
);
const openItemCount = computed(
  () => sprintItems.value.filter((item) => item.status !== "done").length,
);

const boardStatus = computed(() => {
  if (!authEnabled.value) {
    return {
      label: "Sign in required",
      tone: "neutral" as const,
      description: "Connect your account to load teams, sprints, and delivery work.",
    };
  }

  if (selectedTeamIsUnavailable.value) {
    return {
      label: "Team unavailable",
      tone: "warning" as const,
      description: "This board is linked to a team you can no longer access.",
    };
  }

  if (!effectiveTeamId.value) {
    return {
      label: "Team required",
      tone: "warning" as const,
      description: "Bind this block to a team before creating sprints and tasks.",
    };
  }

  if (boardBusy.value) {
    return {
      label: "Saving changes",
      tone: "primary" as const,
      description: "Sprint updates are being synced to the team workspace.",
    };
  }

  if (boardRefreshing.value && !sprints.value.length) {
    return {
      label: "Loading sprint board",
      tone: "neutral" as const,
      description: "Current projects, sprints, and sprint items are loading.",
    };
  }

  if (sprints.value.length === 0) {
    return {
      label: "Create your first sprint",
      tone: "warning" as const,
      description: "Add a sprint so tasks can be organized across the board.",
    };
  }

  if (visibleItemCount.value === 0) {
    return {
      label: "No sprint items yet",
      tone: "primary" as const,
      description: "Add the first task or step to start moving delivery work.",
    };
  }

  return {
    label: "Board ready",
    tone: "success" as const,
    description: "Delivery tasks are organized and ready for execution.",
  };
});

const summaryCards = computed(() => [
  {
    key: "status",
    label: "Board State",
    value: boardStatus.value.label,
    supporting: boardStatus.value.description,
    accentClass:
      boardStatus.value.tone === "success"
        ? "text-success"
        : boardStatus.value.tone === "warning"
          ? "text-warning"
          : boardStatus.value.tone === "primary"
            ? "text-primary"
            : "text-highlighted",
  },
  {
    key: "team",
    label: "Team Context",
    value: selectedTeam.value?.name || "No team selected",
    supporting: selectedTeam.value ? selectedTeam.value.role : "Bind this block to a team",
    accentClass: "text-highlighted",
  },
  {
    key: "sprint",
    label: "Active Sprint",
    value: activeSprint.value?.name || "No sprint selected",
    supporting: activeSprint.value
      ? `${activeSprint.value.status} status`
      : `${sprints.value.length} sprint${sprints.value.length === 1 ? "" : "s"} available`,
    accentClass: "text-primary",
  },
  {
    key: "workload",
    label: "Visible Work",
    value: String(visibleItemCount.value),
    supporting: `${openItemCount.value} open · ${groupedItems.value.done.length} done`,
    accentClass: "text-highlighted",
  },
]);

function updateTeam(teamId: string | undefined) {
  selectedProjectIdForSprint.value = "";

  mutateSprintBoardBlock((block) => {
    block.teamId = teamId || null;
    block.activeSprintId = null;
  });
}

function updateActiveSprint(value: string | undefined) {
  activeSprintId.value = value || "";
}

function toggleShowCompleted(showCompleted: boolean) {
  mutateSprintBoardBlock((block) => {
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

    toast.add({
      title: "Sprint created",
      description: `${created.name} is now active on this board.`,
      color: "success",
    });
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

    toast.add({
      title: "Sprint item added",
      description: `${title} is now visible on the board.`,
      color: "success",
    });
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
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="card in summaryCards"
        :key="card.key"
        class="rounded-3xl border border-muted/20 bg-elevated/10 p-5"
      >
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">{{ card.label }}</p>
        <p class="mt-2 text-2xl font-black tracking-tight sm:text-3xl" :class="card.accentClass">
          {{ card.value }}
        </p>
        <p class="mt-2 text-sm text-muted">{{ card.supporting }}</p>
      </div>
    </div>

    <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 class="text-sm font-semibold text-highlighted">Board setup</h3>
          <p class="mt-1 text-sm text-muted">
            Bind the team, set the active sprint, and keep completed work visible when you need full context.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UBadge :color="boardStatus.tone" variant="soft" class="rounded-full">
            {{ boardStatus.label }}
          </UBadge>
          <UBadge
            v-if="boardBusy || boardRefreshing"
            color="neutral"
            variant="soft"
            class="rounded-full"
          >
            <span class="inline-flex items-center gap-1.5">
              <UIcon name="i-lucide-loader-2" class="size-3.5 animate-spin" />
              Syncing
            </span>
          </UBadge>
        </div>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <UFormField label="Team binding" size="sm">
          <USelect
            :model-value="effectiveTeamId"
            :items="teamOptions"
            placeholder="Select a team"
            size="sm"
            :disabled="!authEnabled || teamsQuery.isPending.value"
            @update:model-value="updateTeam($event as string | undefined)"
          />
        </UFormField>

        <UFormField label="Active sprint" size="sm">
          <USelect
            :model-value="activeSprintId"
            :items="sprintOptions"
            placeholder="Choose sprint"
            size="sm"
            :disabled="!effectiveTeamId || sprintsQuery.isPending.value"
            @update:model-value="updateActiveSprint($event as string | undefined)"
          />
        </UFormField>

        <label class="flex items-center gap-3 rounded-2xl border border-muted/20 bg-default/60 px-3 py-2">
          <UCheckbox
            :model-value="block.showCompletedItems"
            :disabled="!effectiveTeamId"
            @update:model-value="toggleShowCompleted(Boolean($event))"
          />
          <div>
            <p class="text-sm font-medium text-highlighted">Show completed</p>
            <p class="text-xs text-muted">Keep done items visible for retrospective review.</p>
          </div>
        </label>

        <div class="rounded-2xl border border-muted/20 bg-default/60 px-3 py-2 text-xs text-muted">
          Tasks and subtasks on this board are first-class sprint items, not block-embedded JSON.
        </div>
      </div>
    </div>

    <UAlert
      v-if="!authEnabled"
      color="warning"
      variant="soft"
      icon="i-lucide-lock"
      title="Sign in required"
      description="Connect your account to load team sprint data."
    />

    <UAlert
      v-else-if="teamsQuery.error.value"
      color="error"
      variant="soft"
      icon="i-lucide-alert-triangle"
      title="Unable to load teams"
      :description="getErrorMessage(teamsQuery.error.value, 'Please refresh and try again.')"
    />

    <UAlert
      v-else-if="selectedTeamIsUnavailable"
      color="warning"
      variant="soft"
      icon="i-lucide-users-round"
      title="Team unavailable"
      description="This board is linked to a team you can no longer access."
    />

    <UAlert
      v-else-if="!effectiveTeamId"
      color="warning"
      variant="soft"
      icon="i-lucide-users-round"
      title="Team required"
      description="Bind this block to a team before creating sprints and tasks."
    />

    <UAlert
      v-else-if="boardQueryError"
      color="error"
      variant="soft"
      icon="i-lucide-alert-triangle"
      title="Unable to load sprint board data"
      :description="getErrorMessage(boardQueryError, 'Please refresh and try again.')"
    />

    <div class="grid gap-6 xl:grid-cols-2">
      <section class="space-y-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4">
        <h3 class="text-sm font-semibold text-highlighted">Create sprint</h3>

        <USelect
          v-model="selectedProjectIdForSprint"
          :items="projectOptions"
          placeholder="Project"
          aria-label="Project for new sprint"
          :disabled="!effectiveTeamId || projectsQuery.isPending.value"
        />
        <UInput
          v-model="sprintDraft.name"
          placeholder="Sprint name"
          aria-label="Sprint name"
          :disabled="!effectiveTeamId"
        />

        <div class="grid gap-2 sm:grid-cols-2">
          <UInput
            v-model="sprintDraft.startDate"
            type="date"
            aria-label="Sprint start date"
            :disabled="!effectiveTeamId"
          />
          <UInput
            v-model="sprintDraft.endDate"
            type="date"
            aria-label="Sprint end date"
            :disabled="!effectiveTeamId"
          />
        </div>

        <UButton
          color="primary"
          icon="i-lucide-flag"
          :loading="createSprintMutation.isPending.value"
          :disabled="!effectiveTeamId || !selectedProjectIdForSprint || !sprintDraft.name.trim()"
          aria-label="Create sprint"
          @click="createSprint"
        >
          Create sprint
        </UButton>
      </section>

      <section class="space-y-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4">
        <h3 class="text-sm font-semibold text-highlighted">Add sprint item</h3>

        <UAlert
          v-if="effectiveTeamId && sprints.length === 0"
          color="warning"
          variant="soft"
          icon="i-lucide-flag"
          title="Create a sprint first"
          description="Sprint items can only be added after a sprint is created."
        />

        <div class="grid gap-2 sm:grid-cols-[140px_1fr]">
          <USelect
            v-model="sprintItemDraft.type"
            :items="[
              { label: 'Task', value: 'task' },
              { label: 'Step', value: 'step' },
            ]"
            aria-label="Sprint item type"
            :disabled="!activeSprintId"
          />
          <UInput
            v-model="sprintItemDraft.title"
            placeholder="Task title"
            aria-label="Sprint item title"
            :disabled="!activeSprintId"
          />
        </div>

        <UTextarea
          v-model="sprintItemDraft.description"
          :rows="2"
          autoresize
          placeholder="Optional delivery details"
          aria-label="Sprint item description"
          :disabled="!activeSprintId"
        />

        <div class="flex items-center gap-2">
          <UInput
            v-model="sprintItemDraft.estimateMinutes"
            type="number"
            min="0"
            step="5"
            placeholder="Estimate minutes"
            aria-label="Sprint item estimate in minutes"
            :disabled="!activeSprintId"
          />
          <UButton
            color="primary"
            icon="i-lucide-plus"
            :loading="createSprintItemMutation.isPending.value"
            :disabled="!activeSprintId || !sprintItemDraft.title.trim()"
            aria-label="Add sprint item"
            @click="createSprintItem"
          >
            Add item
          </UButton>
        </div>
      </section>
    </div>

    <div v-if="effectiveTeamId && activeSprintId" class="grid gap-4 xl:grid-cols-3">
      <section
        v-for="column in sprintBoardColumns"
        :key="column.key"
        class="space-y-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-highlighted">{{ column.label }}</h3>
          <UBadge color="neutral" variant="soft">{{ groupedItems[column.key].length }}</UBadge>
        </div>

        <div
          v-if="sprintItemsQuery.isPending.value && sprintItems.length === 0"
          class="rounded-2xl border border-dashed border-muted/30 bg-default/30 p-4 text-sm text-muted"
        >
          Loading sprint items...
        </div>

        <div
          v-else-if="groupedItems[column.key].length === 0"
          class="rounded-2xl border border-dashed border-muted/30 bg-default/30 p-4 text-sm text-muted"
        >
          No {{ column.label.toLowerCase() }} items in this sprint.
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
              :disabled="updateSprintItemMutation.isPending.value"
              :aria-label="`Move ${item.title || 'sprint item'} left`"
              @click="moveItem(item.id, item.status === 'done' ? 'doing' : 'todo')"
            >
              Move left
            </UButton>
            <UButton
              v-if="item.status !== 'done'"
              color="primary"
              variant="soft"
              size="xs"
              :disabled="updateSprintItemMutation.isPending.value"
              :aria-label="`Move ${item.title || 'sprint item'} right`"
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
