<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";

import { useAgencyTimeTrackingStore } from "~/stores/agency-time-tracking";
import { formatDuration } from "~/utils/format-duration";
import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
  teamId: string;
}>();

const orpc = useOrpc();
const agencyTimeTrackingStore = useAgencyTimeTrackingStore();
const { deletingEntryIds, isTimerMutationPending } = storeToRefs(agencyTimeTrackingStore);

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const effectiveTeamId = computed(() => props.teamId);

const page = ref(1);
const pageSize = ref(20);

const entriesQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.timeEntries.listMine.queryOptions({
      input: {
        teamId: effectiveTeamId.value,
        page: page.value,
        pageSize: pageSize.value,
      },
    }),
    enabled: Boolean(effectiveTeamId.value),
  })),
);
const projectsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.projects.list.queryOptions({
      input: {
        teamId: effectiveTeamId.value,
      },
    }),
    enabled: Boolean(effectiveTeamId.value),
  })),
);
const entriesQueryKey = computed(
  () =>
    orpc.agencyOps.timeEntries.listMine.queryOptions({
      input: {
        teamId: effectiveTeamId.value,
        page: page.value,
        pageSize: pageSize.value,
      },
    }).queryKey,
);
const projects = computed(() => projectsQuery.data.value?.items ?? []);

type EntryRow = NonNullable<typeof entriesQuery.data.value>["items"][number];

type GroupedEntry = {
  key: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string;
  projectName: string;
  clientName: string;
  description: string;
  linkUrl: string | null;
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
    const taskKey = entry.taskId ?? `project-only:${entry.projectId}`;
    const key = `${taskKey}||${entry.description ?? ""}||${entry.linkUrl ?? ""}||${tagKey}`;

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
        taskId: entry.taskId ?? null,
        taskTitle: entry.taskTitle ?? "Project-only entry",
        projectName: entry.projectName,
        clientName: entry.clientName,
        description: entry.description ?? "",
        linkUrl: entry.linkUrl ?? null,
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
  if (pageSize.value <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(totalEntries.value / pageSize.value));
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

watch(
  () => ({
    teamId: effectiveTeamId.value,
    page: page.value,
    queryKey: entriesQueryKey.value,
  }),
  (next, previous) => {
    if (previous?.teamId) {
      agencyTimeTrackingStore.unregisterLogQuery(previous.queryKey);
    }

    if (!next.teamId) {
      return;
    }

    agencyTimeTrackingStore.registerLogQuery({
      teamId: next.teamId,
      page: next.page,
      queryKey: next.queryKey,
    });
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  agencyTimeTrackingStore.unregisterLogQuery(entriesQueryKey.value);
});

const logRefreshing = computed(
  () => entriesQuery.isFetching.value || projectsQuery.isFetching.value,
);

const logQueryError = computed(() => entriesQuery.error.value ?? projectsQuery.error.value ?? null);

function setPageSize(value: string | number | undefined) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return;
  }

  pageSize.value = Math.min(100, Math.max(5, Math.round(numeric)));
  page.value = 1;
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
  const entry = entries.value.find((item) => item.id === entryId);

  if (!teamId || !entry) {
    return;
  }

  await agencyTimeTrackingStore.deleteEntries({
    teamId,
    entries: [entry],
  });
}

async function deleteGroupEntries(entryIds: string[]) {
  const teamId = effectiveTeamId.value;
  const selectedEntries = entries.value.filter((entry) => entryIds.includes(entry.id));

  if (!teamId || selectedEntries.length === 0) {
    return;
  }

  await agencyTimeTrackingStore.deleteEntries({
    teamId,
    entries: selectedEntries,
  });
}

async function restartEntry(group: GroupedEntry) {
  const teamId = effectiveTeamId.value;
  const project = projects.value.find((projectEntry) => projectEntry.id === group.projectId);

  if (!teamId || !project || !group.taskId) {
    return;
  }

  await agencyTimeTrackingStore.restartEntry({
    teamId,
    project,
    task: { id: group.taskId, title: group.taskTitle },
    description: group.description,
    linkUrl: group.linkUrl,
    tags: group.tags,
  });
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
  expandedGroups.value = new Set(expandedGroups.value);
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <UInput
        :model-value="String(pageSize)"
        type="number"
        min="5"
        max="100"
        step="1"
        size="sm"
        aria-label="Page size"
        class="w-20 shrink-0"
        @update:model-value="setPageSize($event as string | number | undefined)"
      />

      <UBadge v-if="logRefreshing" color="neutral" variant="soft" class="rounded-full">
        <span class="inline-flex items-center gap-1.5">
          <UIcon name="i-lucide-loader-2" class="size-3.5 animate-spin" />
          Syncing
        </span>
      </UBadge>
    </div>

    <UAlert
      v-if="logQueryError"
      color="error"
      variant="soft"
      icon="i-lucide-alert-triangle"
      title="Unable to load entries"
      :description="getErrorMessage(logQueryError, 'Please refresh and try again.')"
    />

    <section class="space-y-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-highlighted">My time entries</h3>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <p class="text-[10px] uppercase tracking-[0.16em] text-muted">Today</p>
            <p class="font-mono text-sm font-semibold tabular-nums text-highlighted">
              {{ formatDuration(todaySeconds, "short") }}
            </p>
          </div>
          <div class="h-6 w-px bg-muted/20" />
          <div class="text-right">
            <p class="text-[10px] uppercase tracking-[0.16em] text-muted">This week</p>
            <p class="font-mono text-sm font-semibold tabular-nums text-primary">
              {{ formatDuration(weekSummary?.totalSeconds ?? 0, "short") }}
            </p>
          </div>
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
        No entries found. Run a timer to populate your history.
      </div>

      <article
        v-for="group in groupedEntries"
        :key="group.key"
        class="rounded-2xl border border-muted/20 bg-default/70 p-3"
      >
        <div class="flex items-start gap-3">
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
            <p class="truncate text-sm font-medium text-highlighted">{{ group.taskTitle }}</p>
            <p class="mt-0.5 truncate text-xs text-muted">
              {{ group.clientName }} · {{ group.projectName }}
            </p>
            <p v-if="group.description" class="mt-0.5 truncate text-xs text-muted">
              {{ group.description }}
            </p>
            <div v-if="group.entries.length === 1" class="mt-1.5">
              <span class="text-[10px] text-muted">
                {{ formatDateTime(group.entries[0]!.startedAt) }} &ndash;
                {{ formatDateTime(group.entries[0]!.endedAt) }}
              </span>
            </div>

            <div
              v-if="group.tags.length > 0 || group.linkUrl"
              class="mt-1.5 flex items-center gap-1"
            >
              <UPopover v-if="group.tags.length > 0" :content="{ align: 'start' }">
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

              <UPopover v-if="group.linkUrl" :content="{ align: 'start' }">
                <UButton
                  icon="i-lucide-link"
                  size="xs"
                  variant="ghost"
                  color="primary"
                  aria-label="View linked URL"
                />
                <template #content>
                  <div class="w-72 space-y-2 p-2">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-lucide-link" class="size-3.5 shrink-0 text-muted" />
                      <p class="truncate text-xs text-muted">{{ group.linkUrl }}</p>
                    </div>
                    <div class="flex justify-end">
                      <UButton
                        label="Open link"
                        size="xs"
                        variant="ghost"
                        color="primary"
                        trailing-icon="i-lucide-external-link"
                        :to="group.linkUrl"
                        target="_blank"
                        rel="noreferrer"
                      />
                    </div>
                  </div>
                </template>
              </UPopover>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-1.5">
            <div class="text-right">
              <UBadge color="primary" variant="soft" class="font-mono tabular-nums">
                {{ formatDuration(group.totalSeconds, "short") }}
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
              :loading="isTimerMutationPending"
              :disabled="!effectiveTeamId || !group.taskId"
              :aria-label="`Restart timer for ${group.taskTitle}`"
              @click="restartEntry(group)"
            />

            <UDropdownMenu :items="groupMenuItems(group)" :content="{ align: 'end' }">
              <UButton
                icon="i-lucide-more-vertical"
                color="neutral"
                variant="ghost"
                size="xs"
                :aria-label="`Options for ${group.taskTitle} entries`"
              />
            </UDropdownMenu>
          </div>
        </div>

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
                  {{ formatDuration(entry.durationSeconds, "short") }}
                </span>
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  :loading="deletingEntryIds.includes(entry.id)"
                  :aria-label="`Delete entry from ${formatDateTime(entry.startedAt)}`"
                  @click="deleteEntry(entry.id)"
                />
              </div>
            </div>
          </div>
        </Transition>
      </article>

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
