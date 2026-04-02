<script setup lang="ts">
import type { WorkspaceAgencyTimeTrackerBlock } from "@brainiac/workspace";
import { useMutation, useQuery } from "@tanstack/vue-query";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
  block: WorkspaceAgencyTimeTrackerBlock;
  tabId: string;
}>();

const { currentNode, mutateBlock } = useWorkspaceNodeEditorContext();
const orpc = useOrpc();
const toast = useToast();
const authSession = useAuthSession();
const authEnabled = computed(() => Boolean(authSession.value?.data?.user));

const now = ref(Date.now());
let tickerHandle: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  tickerHandle = setInterval(() => {
    now.value = Date.now();
  }, 1_000);
});

onBeforeUnmount(() => {
  if (tickerHandle) {
    clearInterval(tickerHandle);
    tickerHandle = null;
  }
});

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

const sprintsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.sprints.list.queryOptions({
      input: {
        teamId: effectiveTeamId.value,
        statuses: ["active", "planned"],
      },
    }),
    enabled: Boolean(effectiveTeamId.value),
  })),
);

const sprints = computed(() => sprintsQuery.data.value?.items ?? []);
const selectedSprintId = ref("");

watch(
  sprints,
  (nextSprints) => {
    if (selectedSprintId.value && nextSprints.some((sprint) => sprint.id === selectedSprintId.value)) {
      return;
    }

    selectedSprintId.value = nextSprints.find((sprint) => sprint.status === "active")?.id ?? nextSprints[0]?.id ?? "";
  },
  { immediate: true },
);

const sprintItemsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.sprintItems.list.queryOptions({
      input: {
        teamId: effectiveTeamId.value,
        sprintId: selectedSprintId.value,
      },
    }),
    enabled: Boolean(effectiveTeamId.value && selectedSprintId.value),
  })),
);

const activeTimerQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.timer.getActive.queryOptions({
      input: {
        teamId: effectiveTeamId.value || undefined,
      },
    }),
    enabled: Boolean(effectiveTeamId.value),
    refetchInterval: 10_000,
  })),
);

const recentEntriesQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.timeEntries.listMine.queryOptions({
      input: {
        teamId: effectiveTeamId.value,
        page: 1,
        pageSize: 5,
      },
    }),
    enabled: Boolean(effectiveTeamId.value && props.block.showRecentEntries),
  })),
);

const sprintItems = computed(() => sprintItemsQuery.data.value?.items ?? []);
const sprintItemOptions = computed(() =>
  sprintItems.value.map((item) => ({
    label: `${item.title} (${item.status})`,
    value: item.id,
  })),
);

const selectedSprintItemId = ref("");
const timerDescription = ref("");

watch(
  sprintItems,
  (nextItems) => {
    if (
      selectedSprintItemId.value &&
      nextItems.some((item) => item.id === selectedSprintItemId.value)
    ) {
      return;
    }

    selectedSprintItemId.value = nextItems[0]?.id ?? "";
  },
  { immediate: true },
);

const activeTimer = computed(() => activeTimerQuery.data.value?.timer ?? null);
const recentEntries = computed(() => recentEntriesQuery.data.value?.items ?? []);

const startTimerMutation = useMutation(orpc.agencyOps.timer.start.mutationOptions());
const stopTimerMutation = useMutation(orpc.agencyOps.timer.stop.mutationOptions());

const elapsedSeconds = computed(() => {
  if (!activeTimer.value) {
    return 0;
  }

  const startedAt = new Date(activeTimer.value.startedAt).getTime();

  if (Number.isNaN(startedAt)) {
    return 0;
  }

  return Math.max(0, Math.floor((now.value - startedAt) / 1_000));
});

function updateTeam(teamId: string | undefined) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "agency-time-tracker") {
      return;
    }

    block.teamId = teamId || null;
  });
}

function toggleRecentEntries(showRecentEntries: boolean) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "agency-time-tracker") {
      return;
    }

    block.showRecentEntries = showRecentEntries;
  });
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3_600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((seconds % 3_600) / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${hours}:${minutes}:${remainingSeconds}`;
}

async function refreshTrackerData() {
  await Promise.all([activeTimerQuery.refetch(), recentEntriesQuery.refetch()]);
}

async function startTimer() {
  const teamId = effectiveTeamId.value;

  if (!teamId || !selectedSprintItemId.value) {
    return;
  }

  try {
    await startTimerMutation.mutateAsync({
      teamId,
      sprintItemId: selectedSprintItemId.value,
      description: timerDescription.value.trim(),
    });

    await refreshTrackerData();
  } catch (error) {
    toast.add({
      title: "Unable to start timer",
      description: getErrorMessage(error, "Please try again."),
      color: "error",
    });
  }
}

async function stopTimer() {
  if (!effectiveTeamId.value) {
    return;
  }

  try {
    await stopTimerMutation.mutateAsync({
      teamId: effectiveTeamId.value,
      description: timerDescription.value.trim(),
    });

    timerDescription.value = "";
    await refreshTrackerData();
  } catch (error) {
    toast.add({
      title: "Unable to stop timer",
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

      <UFormField label="Sprint" size="sm">
        <USelect
          v-model="selectedSprintId"
          :items="sprints.map((sprint) => ({ label: `${sprint.name} (${sprint.status})`, value: sprint.id }))"
          placeholder="Select sprint"
          size="sm"
          :disabled="!effectiveTeamId"
        />
      </UFormField>

      <UFormField label="Task / step" size="sm">
        <USelect
          v-model="selectedSprintItemId"
          :items="sprintItemOptions"
          placeholder="Select sprint item"
          size="sm"
          :disabled="!selectedSprintId"
        />
      </UFormField>

      <label class="flex items-center gap-3 rounded-2xl border border-muted/20 bg-default/60 px-3 py-2">
        <UCheckbox
          :model-value="block.showRecentEntries"
          @update:model-value="toggleRecentEntries(Boolean($event))"
        />
        <span class="text-sm text-toned">Show recent entries</span>
      </label>
    </div>

    <UAlert
      v-if="!effectiveTeamId"
      color="warning"
      variant="soft"
      icon="i-lucide-users-round"
      title="Team required"
      description="Bind this tracker to a team before starting timers."
    />

    <section class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-muted">Active timer</p>
          <p class="mt-2 text-3xl font-black tracking-tight text-highlighted">
            {{ formatDuration(elapsedSeconds) }}
          </p>
          <p v-if="activeTimer" class="mt-1 text-sm text-muted">
            {{ activeTimer.projectName }} · {{ activeTimer.sprintItemTitle }}
          </p>
          <p v-else class="mt-1 text-sm text-muted">No timer is running.</p>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            color="primary"
            icon="i-lucide-play"
            :loading="startTimerMutation.isPending.value"
            :disabled="Boolean(activeTimer) || !effectiveTeamId || !selectedSprintItemId"
            @click="startTimer"
          >
            Start
          </UButton>
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-square"
            :loading="stopTimerMutation.isPending.value"
            :disabled="!activeTimer"
            @click="stopTimer"
          >
            Stop
          </UButton>
        </div>
      </div>

      <UTextarea
        v-model="timerDescription"
        class="mt-4"
        :rows="2"
        autoresize
        placeholder="What are you working on?"
      />
    </section>

    <section
      v-if="block.showRecentEntries"
      class="space-y-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4"
    >
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-highlighted">Recent entries</h3>
        <UBadge color="neutral" variant="soft">{{ recentEntries.length }} items</UBadge>
      </div>

      <div v-if="recentEntries.length === 0" class="rounded-2xl border border-dashed border-muted/30 p-4 text-sm text-muted">
        Start and stop a timer to capture your first entry.
      </div>

      <article
        v-for="entry in recentEntries"
        :key="entry.id"
        class="rounded-2xl border border-muted/20 bg-default/70 p-3"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-medium text-highlighted">{{ entry.sprintItemTitle }}</p>
          <UBadge color="primary" variant="soft">{{ formatDuration(entry.durationSeconds) }}</UBadge>
        </div>
        <p class="mt-1 text-xs text-muted">{{ entry.projectName }} · {{ entry.clientName }}</p>
        <p v-if="entry.description" class="mt-1 text-xs text-toned">{{ entry.description }}</p>
      </article>
    </section>
  </div>
</template>
