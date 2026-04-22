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

const deleteEntryMutation = useMutation(orpc.agencyOps.timeEntries.deleteMine.mutationOptions());
const startTimerMutation = useMutation(orpc.agencyOps.timer.start.mutationOptions());

type EntryRow = NonNullable<typeof entriesQuery.data.value>["items"][number];

type GroupedEntry = {
  key: string;
  projectId: string;
  projectName: string;
  description: string;
  tags: EntryRow["tags"];
  totalSeconds: number;
  entries: Array<{
    id: string;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
  }>;
};

const entries = computed(() => entriesQuery.data.value?.items ?? []);
const totalEntries = computed(() => entriesQuery.data.value?.total ?? 0);

const groupedEntries = computed<GroupedEntry[]>(() => {
  const map = new Map<string, GroupedEntry>();

  for (const entry of entries.value) {
    const tagKey = [...entry.tags]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((t) => t.id)
      .join(",");
    const key = `${entry.projectId}||${entry.description ?? ""}||${tagKey}`;

    const existing = map.get(key);

    if (existing) {
      existing.totalSeconds += entry.durationSeconds;
      existing.entries.push({
        id: entry.id,
        startedAt: entry.startedAt,
        endedAt: entry.endedAt,
        durationSeconds: entry.durationSeconds,
      });
    } else {
      map.set(key, {
        key,
        projectId: entry.projectId,
        projectName: entry.projectName,
        description: entry.description ?? "",
        tags: entry.tags,
        totalSeconds: entry.durationSeconds,
        entries: [
          {
            id: entry.id,
            startedAt: entry.startedAt,
            endedAt: entry.endedAt,
            durationSeconds: entry.durationSeconds,
          },
        ],
      });
    }
  }

  return [...map.values()];
});
const maxPage = computed(() => {
  if (props.block.pageSize <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(totalEntries.value / props.block.pageSize));
});
const weekSummary = computed(() => entriesQuery.data.value?.weekSummary ?? null);

const todaySeconds = computed(() => {
  const daily = weekSummary.value?.daily;
  if (!daily) return 0;
  const todayDate = new Date().toISOString().slice(0, 10);
  return daily.find((d) => d.date === todayDate)?.totalSeconds ?? 0;
});

watch(maxPage, (nextMaxPage) => {
  if (page.value > nextMaxPage) {
    page.value = nextMaxPage;
  }
});

watch(effectiveTeamId, () => {
  page.value = 1;
});

const logRefreshing = computed(
  () => teamsQuery.isFetching.value || entriesQuery.isFetching.value,
);

const logQueryError = computed(() => entriesQuery.error.value ?? null);

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

function formatDateTime(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Invalid date";
  }

  return dateTimeFormatter.format(parsed);
}

async function deleteEntry(entryId: string) {
  const teamId = effectiveTeamId.value;

  if (!teamId) {
    return;
  }

  try {
    await deleteEntryMutation.mutateAsync({ teamId, entryId });
    await entriesQuery.refetch();
  } catch (error) {
    toast.add({
      title: "Unable to delete entry",
      description: getErrorMessage(error, "Please try again."),
      color: "error",
    });
  }
}

async function deleteGroupEntries(entryIds: string[]) {
  const teamId = effectiveTeamId.value;

  if (!teamId) {
    return;
  }

  try {
    await Promise.all(entryIds.map((entryId) => deleteEntryMutation.mutateAsync({ teamId, entryId })));
    await entriesQuery.refetch();
  } catch (error) {
    toast.add({
      title: "Unable to delete entries",
      description: getErrorMessage(error, "Please try again."),
      color: "error",
    });
  }
}

async function restartEntry(entry: { projectId: string; description: string }) {
  const teamId = effectiveTeamId.value;

  if (!teamId) {
    return;
  }

  try {
    await startTimerMutation.mutateAsync({
      teamId,
      projectId: entry.projectId,
      description: entry.description || undefined,
    });

    toast.add({
      title: "Timer started",
      description: `Tracking ${entry.description || "time"}.`,
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Unable to start timer",
      description: getErrorMessage(error, "Please try again."),
      color: "error",
    });
  }
}

function groupMenuItems(group: GroupedEntry) {
  const allIds = group.entries.map((e) => e.id);

  return [
    [
      {
        label: group.entries.length > 1 ? `Delete all (${group.entries.length})` : "Delete entry",
        icon: "i-lucide-trash-2",
        color: "error" as const,
        onSelect: () => deleteGroupEntries(allIds),
      },
    ],
  ];
}

function goToPreviousPage() {
  page.value = Math.max(1, page.value - 1);
}

function goToNextPage() {
  page.value = Math.min(maxPage.value, page.value + 1);
}

const expandedGroups = ref(new Set<string>());

function toggleGroup(key: string) {
  if (expandedGroups.value.has(key)) {
    expandedGroups.value.delete(key);
  } else {
    expandedGroups.value.add(key);
  }
  // Trigger reactivity
  expandedGroups.value = new Set(expandedGroups.value);
}
</script>

<template>
  <div class="space-y-4">
    <!-- Inline team + page size controls -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-2">
        <UIcon
          v-if="!effectiveTeamId"
          name="i-lucide-alert-circle"
          class="size-3.5 shrink-0 text-warning"
        />
        <USelect
          :model-value="effectiveTeamId"
          :items="teamOptions"
          placeholder="Select a team"
          size="sm"
          :disabled="!authEnabled || teamsQuery.isPending.value"
          @update:model-value="updateTeam($event as string | undefined)"
        />
      </div>

      <UInput
        :model-value="String(block.pageSize)"
        type="number"
        min="5"
        max="100"
        step="1"
        size="sm"
        aria-label="Page size"
        class="w-20 shrink-0"
        @update:model-value="setPageSize($event as string | number | undefined)"
      />

      <UBadge
        v-if="logRefreshing"
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

    <!-- Auth / team error alerts -->
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
      description="Bind this log block to a team before reviewing entries."
    />

    <UAlert
      v-else-if="logQueryError"
      color="error"
      variant="soft"
      icon="i-lucide-alert-triangle"
      title="Unable to load entries"
      :description="getErrorMessage(logQueryError, 'Please refresh and try again.')"
    />

    <!-- Entries list -->
    <section class="space-y-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-highlighted">My time entries</h3>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <p class="text-[10px] uppercase tracking-[0.16em] text-muted">Today</p>
            <p class="font-mono text-sm font-semibold tabular-nums text-highlighted">{{ formatDuration(todaySeconds) }}</p>
          </div>
          <div class="h-6 w-px bg-muted/20" />
          <div class="text-right">
            <p class="text-[10px] uppercase tracking-[0.16em] text-muted">This week</p>
            <p class="font-mono text-sm font-semibold tabular-nums text-primary">{{ formatDuration(weekSummary?.totalSeconds ?? 0) }}</p>
          </div>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div
        v-if="entriesQuery.isPending.value && entries.length === 0"
        class="rounded-2xl border border-dashed border-muted/30 p-4 text-sm text-muted"
      >
        Loading time entries...
      </div>

      <!-- Empty state -->
      <div
        v-else-if="entries.length === 0"
        class="rounded-2xl border border-dashed border-muted/30 p-4 text-sm text-muted"
      >
        No entries found. Run a timer to populate your history.
      </div>

      <!-- Entry rows -->
      <article
        v-for="group in groupedEntries"
        :key="group.key"
        class="rounded-2xl border border-muted/20 bg-default/70 p-3"
      >
        <!-- Group header -->
        <div class="flex items-start gap-3">
          <!-- Chevron toggle for multi-entry groups -->
          <button
            v-if="group.entries.length > 1"
            type="button"
            class="mt-0.5 shrink-0 text-muted transition-transform duration-200"
            :class="expandedGroups.has(group.key) ? 'rotate-90' : ''"
            :aria-label="expandedGroups.has(group.key) ? 'Collapse entries' : 'Expand entries'"
            @click="toggleGroup(group.key)"
          >
            <UIcon name="i-lucide-chevron-right" class="size-3.5" />
          </button>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-highlighted">{{ group.projectName }}</p>
            <p v-if="group.description" class="mt-0.5 truncate text-xs text-muted">
              {{ group.description }}
            </p>
            <!-- Inline time range for single-entry groups -->
            <div v-if="group.entries.length === 1" class="mt-1.5">
              <span class="text-[10px] text-muted">
                {{ formatDateTime(group.entries[0]!.startedAt) }} &ndash;
                {{ formatDateTime(group.entries[0]!.endedAt) }}
              </span>
            </div>

            <!-- Tags popover -->
            <div v-if="group.tags.length > 0" class="mt-1.5">
              <UPopover :content="{ align: 'start' }">
                <UButton
                  icon="i-lucide-tag"
                  size="xs"
                  variant="ghost"
                  color="primary"
                  :label="group.tags.length > 1 ? String(group.tags.length) : undefined"
                  :aria-label="`${group.tags.length} tag${group.tags.length === 1 ? '' : 's'}`"
                />
                <template #content>
                  <div class="flex max-w-56 flex-wrap gap-1 p-2">
                    <UButton
                      v-for="tag in group.tags"
                      :key="tag.id"
                      :label="tag.name"
                      size="xs"
                      variant="soft"
                      color="primary"
                      class="rounded-full"
                      tabindex="-1"
                    />
                  </div>
                </template>
              </UPopover>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex shrink-0 items-center gap-1.5">
            <div class="text-right">
              <UBadge color="primary" variant="soft" class="font-mono tabular-nums">
                {{ formatDuration(group.totalSeconds) }}
              </UBadge>
              <p v-if="group.entries.length > 1" class="mt-0.5 text-[10px] text-muted">
                {{ group.entries.length }} entries
              </p>
            </div>

            <UButton
              icon="i-lucide-play"
              color="neutral"
              variant="ghost"
              size="xs"
              :loading="startTimerMutation.isPending.value"
              :disabled="!effectiveTeamId"
              :aria-label="`Restart timer for ${group.projectName}`"
              @click="restartEntry(group)"
            />

            <UDropdownMenu
              :items="groupMenuItems(group)"
              :content="{ align: 'end' }"
            >
              <UButton
                icon="i-lucide-more-vertical"
                color="neutral"
                variant="ghost"
                size="xs"
                :aria-label="`Options for ${group.projectName} entries`"
              />
            </UDropdownMenu>
          </div>
        </div>

        <!-- Collapsible sub-rows: individual time ranges for multi-entry groups -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out overflow-hidden"
          leave-active-class="transition-all duration-150 ease-in overflow-hidden"
          enter-from-class="max-h-0 opacity-0"
          enter-to-class="max-h-96 opacity-100"
          leave-from-class="max-h-96 opacity-100"
          leave-to-class="max-h-0 opacity-0"
        >
          <div
            v-if="group.entries.length > 1 && expandedGroups.has(group.key)"
            class="mt-2 space-y-1 border-t border-muted/10 pt-2"
          >
            <div
              v-for="entry in group.entries"
              :key="entry.id"
              class="flex items-center justify-between gap-2"
            >
              <span class="text-[10px] text-muted">
                {{ formatDateTime(entry.startedAt) }} &ndash; {{ formatDateTime(entry.endedAt) }}
              </span>
              <div class="flex shrink-0 items-center gap-1.5">
                <span class="font-mono text-[10px] tabular-nums text-muted">
                  {{ formatDuration(entry.durationSeconds) }}
                </span>
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  :aria-label="`Delete entry from ${formatDateTime(entry.startedAt)}`"
                  @click="deleteEntry(entry.id)"
                />
              </div>
            </div>
          </div>
        </Transition>
      </article>

      <!-- Pagination -->
      <div class="flex items-center justify-between gap-2 pt-2">
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-chevron-left"
          :disabled="page <= 1"
          @click="goToPreviousPage"
        >
          Previous
        </UButton>
        <p class="text-xs text-muted">Page {{ page }} / {{ maxPage }}</p>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          trailing-icon="i-lucide-chevron-right"
          :disabled="page >= maxPage"
          @click="goToNextPage"
        >
          Next
        </UButton>
      </div>
    </section>
  </div>
</template>
