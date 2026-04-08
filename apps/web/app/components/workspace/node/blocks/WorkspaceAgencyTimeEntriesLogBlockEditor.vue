<script setup lang="ts">
import type { WorkspaceAgencyTimeEntriesLogBlock } from "@brainiac/workspace";
import { useMutation, useQuery } from "@tanstack/vue-query";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
  block: WorkspaceAgencyTimeEntriesLogBlock;
  tabId: string;
}>();

const { currentNode, mutateTypedBlock } = useWorkspaceNodeEditorContext();
const orpc = useOrpc();
const toast = useToast();
const authSession = useAuthSession();
const authEnabled = computed(() => Boolean(authSession.value?.data?.user));

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

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
const teamOptions = computed(() =>
  teams.value.map((team) => ({ label: `${team.name} (${team.role})`, value: team.id })),
);

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

    selectedSprintId.value =
      nextSprints.find((sprint) => sprint.status === "active")?.id ??
      nextSprints[0]?.id ??
      "";
  },
  { immediate: true },
);

const sprintOptions = computed(() =>
  sprints.value.map((sprint) => ({
    label: `${sprint.name} (${sprint.status})`,
    value: sprint.id,
  })),
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
    if (selectedSprintItemId.value && nextItems.some((item) => item.id === selectedSprintItemId.value)) {
      return;
    }

    selectedSprintItemId.value = nextItems[0]?.id ?? "";
  },
  { immediate: true },
);

const sprintItemOptions = computed(() =>
  sprintItems.value.map((item) => ({ label: item.title, value: item.id })),
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
const weekSummary = computed(() => entriesQuery.data.value?.weekSummary ?? null);

watch(maxPage, (nextMaxPage) => {
  if (page.value > nextMaxPage) {
    page.value = nextMaxPage;
  }
});

watch(effectiveTeamId, () => {
  page.value = 1;
});

const manualDraft = reactive({
  startAt: "",
  endAt: "",
  description: "",
});

const manualEntryValidation = computed(() => {
  if (!manualDraft.startAt || !manualDraft.endAt) {
    return {
      valid: true,
      message: null,
      durationMinutes: null,
    };
  }

  const start = new Date(manualDraft.startAt);
  const end = new Date(manualDraft.endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {
      valid: false,
      message: "Enter valid start and end timestamps.",
      durationMinutes: null,
    };
  }

  if (end <= start) {
    return {
      valid: false,
      message: "End time must be later than start time.",
      durationMinutes: null,
    };
  }

  return {
    valid: true,
    message: null,
    durationMinutes: Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000)),
  };
});

const manualDurationLabel = computed(() => {
  const durationMinutes = manualEntryValidation.value.durationMinutes;

  if (!durationMinutes) {
    return null;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
});

const logBusy = computed(
  () => createManualMutation.isPending.value || deleteEntryMutation.isPending.value,
);
const logRefreshing = computed(
  () =>
    teamsQuery.isFetching.value ||
    entriesQuery.isFetching.value ||
    sprintsQuery.isFetching.value ||
    sprintItemsQuery.isFetching.value,
);
const logQueryError = computed(
  () =>
    entriesQuery.error.value ||
    sprintsQuery.error.value ||
    sprintItemsQuery.error.value ||
    null,
);

const logStatus = computed(() => {
  if (!authEnabled.value) {
    return {
      label: "Sign in required",
      tone: "neutral" as const,
      description: "Connect your account to load teams and time entry history.",
    };
  }

  if (selectedTeamIsUnavailable.value) {
    return {
      label: "Team unavailable",
      tone: "warning" as const,
      description: "This log is linked to a team you can no longer access.",
    };
  }

  if (!effectiveTeamId.value) {
    return {
      label: "Team required",
      tone: "warning" as const,
      description: "Bind this log block to a team before adding or reviewing entries.",
    };
  }

  if (logBusy.value) {
    return {
      label: "Saving entry updates",
      tone: "primary" as const,
      description: "Manual entries and deletions are being synced now.",
    };
  }

  if (manualEntryValidation.value.message) {
    return {
      label: "Fix time range",
      tone: "warning" as const,
      description: manualEntryValidation.value.message,
    };
  }

  if (!selectedSprintId.value || !selectedSprintItemId.value) {
    return {
      label: "Pick a sprint item",
      tone: "warning" as const,
      description: "Choose a sprint and task before logging manual time.",
    };
  }

  if (logRefreshing.value && entries.value.length === 0) {
    return {
      label: "Loading entries",
      tone: "neutral" as const,
      description: "Current entry history and weekly totals are syncing.",
    };
  }

  if (totalEntries.value === 0) {
    return {
      label: "No entries yet",
      tone: "primary" as const,
      description: "Log your first sprint item entry to start building history.",
    };
  }

  return {
    label: "Entries ready",
    tone: "success" as const,
    description: "Time history is ready for review and cleanup.",
  };
});

const summaryCards = computed(() => [
  {
    key: "status",
    label: "Log State",
    value: logStatus.value.label,
    supporting: logStatus.value.description,
    accentClass:
      logStatus.value.tone === "success"
        ? "text-success"
        : logStatus.value.tone === "warning"
          ? "text-warning"
          : logStatus.value.tone === "primary"
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
    key: "week",
    label: "This Week",
    value: formatDuration(weekSummary.value?.totalSeconds ?? 0),
    supporting: weekSummary.value ? "Total tracked this week" : "No weekly totals yet",
    accentClass: "text-primary",
  },
  {
    key: "entries",
    label: "Total Entries",
    value: String(totalEntries.value),
    supporting: `Page ${page.value} of ${maxPage.value}`,
    accentClass: "text-highlighted",
  },
]);

function mutateTimeEntriesLogBlock(mutator: (block: WorkspaceAgencyTimeEntriesLogBlock) => void) {
  mutateTypedBlock(props.tabId, props.block.id, "agency-time-entries-log", mutator);
}

function updateTeam(teamId: string | undefined) {
  page.value = 1;

  mutateTimeEntriesLogBlock((block) => {
    block.teamId = teamId || null;
  });
}

function setPageSize(value: string | number | undefined) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return;
  }

  mutateTimeEntriesLogBlock((block) => {
    block.pageSize = Math.min(100, Math.max(5, Math.round(numeric)));
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
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3_600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((safeSeconds % 3_600) / 60)
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

function formatDateTime(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Invalid date";
  }

  return dateTimeFormatter.format(parsed);
}

async function createManualEntry() {
  const teamId = effectiveTeamId.value;
  const startAt = toIsoString(manualDraft.startAt);
  const endAt = toIsoString(manualDraft.endAt);

  if (!teamId || !selectedSprintItemId.value || !startAt || !endAt || !manualEntryValidation.value.valid) {
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

    toast.add({
      title: "Time entry logged",
      description: "The manual entry is now part of your sprint history.",
      color: "success",
    });
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
          <h3 class="text-sm font-semibold text-highlighted">Log setup</h3>
          <p class="mt-1 text-sm text-muted">
            Set team context, page size, and sprint scope before logging or cleaning up entries.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UBadge :color="logStatus.tone" variant="soft" class="rounded-full">
            {{ logStatus.label }}
          </UBadge>
          <UBadge
            v-if="logBusy || logRefreshing"
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

        <UFormField label="Page size" size="sm">
          <UInput
            :model-value="String(block.pageSize)"
            type="number"
            min="5"
            max="100"
            step="1"
            aria-label="Page size"
            @update:model-value="setPageSize($event as string | number | undefined)"
          />
        </UFormField>

        <UFormField label="Sprint" size="sm">
          <USelect
            v-model="selectedSprintId"
            :items="sprintOptions"
            placeholder="Select sprint"
            :disabled="!effectiveTeamId || sprintsQuery.isPending.value"
          />
        </UFormField>

        <UFormField label="Task / step" size="sm">
          <USelect
            v-model="selectedSprintItemId"
            :items="sprintItemOptions"
            placeholder="Select sprint item"
            :disabled="!selectedSprintId || sprintItemsQuery.isPending.value"
          />
        </UFormField>
      </div>
    </div>

    <UAlert
      v-if="!authEnabled"
      color="warning"
      variant="soft"
      icon="i-lucide-lock"
      title="Sign in required"
      description="Connect your account to load team time-tracking data."
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
      description="This log is linked to a team you can no longer access."
    />

    <UAlert
      v-else-if="!effectiveTeamId"
      color="warning"
      variant="soft"
      icon="i-lucide-users-round"
      title="Team required"
      description="Bind this log block to a team before adding or reviewing entries."
    />

    <UAlert
      v-else-if="logQueryError"
      color="error"
      variant="soft"
      icon="i-lucide-alert-triangle"
      title="Unable to load entry data"
      :description="getErrorMessage(logQueryError, 'Please refresh and try again.')"
    />

    <section class="space-y-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <h3 class="text-sm font-semibold text-highlighted">Manual time entry</h3>
        <UBadge v-if="manualDurationLabel" color="neutral" variant="soft" class="rounded-full">
          Duration: {{ manualDurationLabel }}
        </UBadge>
      </div>

      <div class="grid gap-2 md:grid-cols-2">
        <UInput
          v-model="manualDraft.startAt"
          type="datetime-local"
          aria-label="Manual entry start time"
          :disabled="!selectedSprintItemId"
        />
        <UInput
          v-model="manualDraft.endAt"
          type="datetime-local"
          aria-label="Manual entry end time"
          :disabled="!selectedSprintItemId"
        />
      </div>

      <UAlert
        v-if="manualEntryValidation.message"
        color="warning"
        variant="soft"
        icon="i-lucide-clock-alert"
        title="Invalid time range"
        :description="manualEntryValidation.message"
      />

      <UTextarea
        v-model="manualDraft.description"
        :rows="2"
        autoresize
        placeholder="Optional notes"
        aria-label="Manual entry notes"
      />

      <UButton
        color="primary"
        icon="i-lucide-plus"
        :loading="createManualMutation.isPending.value"
        :disabled="
          !selectedSprintItemId ||
          !manualDraft.startAt ||
          !manualDraft.endAt ||
          !manualEntryValidation.valid
        "
        aria-label="Log manual entry"
        @click="createManualEntry"
      >
        Log manual entry
      </UButton>
    </section>

    <section class="space-y-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-highlighted">My time entries</h3>
        <div class="flex flex-wrap items-center gap-2">
          <UBadge color="neutral" variant="soft" class="rounded-full">{{ totalEntries }} total</UBadge>
          <UBadge color="primary" variant="soft" class="rounded-full">Page {{ page }} / {{ maxPage }}</UBadge>
        </div>
      </div>

      <div
        v-if="weekSummary"
        class="grid gap-2 rounded-2xl border border-muted/20 bg-default/60 p-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div>
          <p class="text-xs uppercase tracking-[0.16em] text-muted">Week total</p>
          <p class="mt-1 text-lg font-bold text-highlighted">{{ formatDuration(weekSummary.totalSeconds) }}</p>
        </div>

        <div
          v-for="day in weekSummary.daily"
          :key="day.date"
          class="rounded-xl border border-muted/20 bg-default/70 px-2 py-2"
        >
          <p class="text-[11px] text-muted">{{ formatDayLabel(day.date) }}</p>
          <p class="text-sm font-semibold text-highlighted">{{ formatDuration(day.totalSeconds) }}</p>
        </div>
      </div>

      <div
        v-if="entriesQuery.isPending.value && entries.length === 0"
        class="rounded-2xl border border-dashed border-muted/30 p-4 text-sm text-muted"
      >
        Loading time entries...
      </div>

      <div
        v-else-if="entries.length === 0"
        class="rounded-2xl border border-dashed border-muted/30 p-4 text-sm text-muted"
      >
        No entries found for this page. Log a manual entry or run a timer to populate this history.
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
              :disabled="deleteEntryMutation.isPending.value"
              :aria-label="`Delete ${entry.sprintItemTitle || 'time'} entry`"
              @click="deleteEntry(entry.id)"
            />
          </div>
        </div>

        <p class="mt-1 text-xs text-muted">
          {{ formatDateTime(entry.startedAt) }} - {{ formatDateTime(entry.endedAt) }}
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
