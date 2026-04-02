<script setup lang="ts">
import type { WorkspaceAgencyTimeEntriesLogBlock } from "@brainiac/workspace";
import { useMutation, useQuery } from "@tanstack/vue-query";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
  block: WorkspaceAgencyTimeEntriesLogBlock;
  tabId: string;
}>();

const { currentNode, mutateBlock } = useWorkspaceNodeEditorContext();
const orpc = useOrpc();
const toast = useToast();
const authSession = useAuthSession();
const authEnabled = computed(() => Boolean(authSession.value?.data?.user));

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

const page = ref(1);

const entriesQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.timeEntries.listMine.queryOptions({
      input: {
        teamId: effectiveTeamId.value,
        page: page.value,
        pageSize: props.block.pageSize,
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

const sprintItems = computed(() => sprintItemsQuery.data.value?.items ?? []);
const selectedSprintItemId = ref("");

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

const createManualMutation = useMutation(orpc.agencyOps.timeEntries.createManual.mutationOptions());
const deleteEntryMutation = useMutation(orpc.agencyOps.timeEntries.deleteMine.mutationOptions());

const entries = computed(() => entriesQuery.data.value?.items ?? []);
const totalEntries = computed(() => entriesQuery.data.value?.total ?? 0);
const maxPage = computed(() => {
  if (props.block.pageSize <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(totalEntries.value / props.block.pageSize));
});

const manualDraft = reactive({
  startAt: "",
  endAt: "",
  description: "",
});

function updateTeam(teamId: string | undefined) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "agency-time-entries-log") {
      return;
    }

    block.teamId = teamId || null;
  });
}

function setPageSize(value: string | number | undefined) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return;
  }

  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "agency-time-entries-log") {
      return;
    }

    block.pageSize = Math.min(100, Math.max(1, Math.round(numeric)));
  });

  page.value = 1;
}

function toIsoString(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3_600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((seconds % 3_600) / 60)
    .toString()
    .padStart(2, "0");

  return `${hours}:${minutes}`;
}

function formatDayLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

async function createManualEntry() {
  const teamId = effectiveTeamId.value;
  const startAt = toIsoString(manualDraft.startAt);
  const endAt = toIsoString(manualDraft.endAt);

  if (!teamId || !selectedSprintItemId.value || !startAt || !endAt) {
    return;
  }

  try {
    await createManualMutation.mutateAsync({
      teamId,
      sprintItemId: selectedSprintItemId.value,
      startAt,
      endAt,
      description: manualDraft.description.trim(),
    });

    manualDraft.startAt = "";
    manualDraft.endAt = "";
    manualDraft.description = "";
    page.value = 1;
    await entriesQuery.refetch();
  } catch (error) {
    toast.add({
      title: "Unable to create manual entry",
      description: getErrorMessage(error, "Please check the entered times and try again."),
      color: "error",
    });
  }
}

async function deleteEntry(entryId: string) {
  const teamId = effectiveTeamId.value;

  if (!teamId) {
    return;
  }

  try {
    await deleteEntryMutation.mutateAsync({
      teamId,
      entryId,
    });

    await entriesQuery.refetch();
  } catch (error) {
    toast.add({
      title: "Unable to delete entry",
      description: getErrorMessage(error, "Please try again."),
      color: "error",
    });
  }
}

function goToPreviousPage() {
  page.value = Math.max(1, page.value - 1);
}

function goToNextPage() {
  page.value = Math.min(maxPage.value, page.value + 1);
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

      <UFormField label="Page size" size="sm">
        <UInput
          :model-value="String(block.pageSize)"
          type="number"
          min="1"
          max="100"
          step="1"
          @update:model-value="setPageSize($event as string | number | undefined)"
        />
      </UFormField>

      <UFormField label="Sprint" size="sm">
        <USelect
          v-model="selectedSprintId"
          :items="sprints.map((sprint) => ({ label: `${sprint.name} (${sprint.status})`, value: sprint.id }))"
          placeholder="Select sprint"
          :disabled="!effectiveTeamId"
        />
      </UFormField>

      <UFormField label="Task / step" size="sm">
        <USelect
          v-model="selectedSprintItemId"
          :items="sprintItems.map((item) => ({ label: item.title, value: item.id }))"
          placeholder="Select sprint item"
          :disabled="!selectedSprintId"
        />
      </UFormField>
    </div>

    <UAlert
      v-if="!effectiveTeamId"
      color="warning"
      variant="soft"
      icon="i-lucide-users-round"
      title="Team required"
      description="Bind this log block to a team before adding or reviewing entries."
    />

    <section class="space-y-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4">
      <h3 class="text-sm font-semibold text-highlighted">Manual time entry</h3>

      <div class="grid gap-2 md:grid-cols-2">
        <UInput v-model="manualDraft.startAt" type="datetime-local" :disabled="!selectedSprintItemId" />
        <UInput v-model="manualDraft.endAt" type="datetime-local" :disabled="!selectedSprintItemId" />
      </div>

      <UTextarea
        v-model="manualDraft.description"
        :rows="2"
        autoresize
        placeholder="Optional notes"
      />

      <UButton
        color="primary"
        icon="i-lucide-plus"
        :loading="createManualMutation.isPending.value"
        :disabled="!selectedSprintItemId || !manualDraft.startAt || !manualDraft.endAt"
        @click="createManualEntry"
      >
        Log manual entry
      </UButton>
    </section>

    <section class="space-y-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-highlighted">My time entries</h3>
        <UBadge color="neutral" variant="soft">{{ totalEntries }} total</UBadge>
      </div>

      <div
        v-if="entriesQuery.data.value?.weekSummary"
        class="grid gap-2 rounded-2xl border border-muted/20 bg-default/60 p-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div>
          <p class="text-xs uppercase tracking-[0.16em] text-muted">Week total</p>
          <p class="mt-1 text-lg font-bold text-highlighted">
            {{ formatDuration(entriesQuery.data.value.weekSummary.totalSeconds) }}
          </p>
        </div>

        <div
          v-for="day in entriesQuery.data.value.weekSummary.daily"
          :key="day.date"
          class="rounded-xl border border-muted/20 bg-default/70 px-2 py-2"
        >
          <p class="text-[11px] text-muted">{{ formatDayLabel(day.date) }}</p>
          <p class="text-sm font-semibold text-highlighted">{{ formatDuration(day.totalSeconds) }}</p>
        </div>
      </div>

      <div v-if="entries.length === 0" class="rounded-2xl border border-dashed border-muted/30 p-4 text-sm text-muted">
        No entries found for this page.
      </div>

      <article
        v-for="entry in entries"
        :key="entry.id"
        class="rounded-2xl border border-muted/20 bg-default/70 p-3"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm font-medium text-highlighted">{{ entry.sprintItemTitle }}</p>
            <p class="text-xs text-muted">{{ entry.projectName }} · {{ entry.clientName }}</p>
          </div>

          <div class="flex items-center gap-2">
            <UBadge color="primary" variant="soft">{{ formatDuration(entry.durationSeconds) }}</UBadge>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-trash-2"
              @click="deleteEntry(entry.id)"
            />
          </div>
        </div>

        <p class="mt-1 text-xs text-muted">
          {{ new Date(entry.startedAt).toLocaleString() }} - {{ new Date(entry.endedAt).toLocaleString() }}
        </p>
        <p v-if="entry.description" class="mt-1 text-xs text-toned">{{ entry.description }}</p>
      </article>

      <div class="flex items-center justify-between gap-2 pt-2">
        <UButton color="neutral" variant="ghost" size="sm" :disabled="page <= 1" @click="goToPreviousPage">
          Previous
        </UButton>
        <p class="text-xs text-muted">Page {{ page }} / {{ maxPage }}</p>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          :disabled="page >= maxPage"
          @click="goToNextPage"
        >
          Next
        </UButton>
      </div>
    </section>
  </div>
</template>
