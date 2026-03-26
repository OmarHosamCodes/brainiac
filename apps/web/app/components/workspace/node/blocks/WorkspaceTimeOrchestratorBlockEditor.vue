<script setup lang="ts">
import {
  WORKSPACE_TASK_DOMAINS,
  WORKSPACE_TASK_QUADRANTS,
  collectWorkspaceNodeTasks,
  createWorkspaceTimeOrchestratorSettings,
  getWorkspaceTaskDomainLabel,
  getWorkspaceTaskQuadrant,
  getWorkspaceTaskQuadrantLabel,
  type WorkspaceTaskDomain,
  type WorkspaceTaskQuadrant,
  type WorkspaceTimeOrchestratorBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceTimeOrchestratorBlock;
  tabId: string;
}>();

const {
  currentNode,
  mutateBlock,
  getTimeOrchestratorSummaryForBlock,
  formatRelativeTaskMeta,
} = useWorkspaceNodeEditorContext();

const summary = computed(() => getTimeOrchestratorSummaryForBlock(props.block));

const openTasks = computed(() =>
  currentNode.value
    ? collectWorkspaceNodeTasks(currentNode.value).filter(({ task }) => !task.completed)
    : [],
);

const domainFilters = computed(() => {
  const counts = new Map<WorkspaceTaskDomain, number>();

  for (const domain of WORKSPACE_TASK_DOMAINS) {
    counts.set(domain, 0);
  }

  let unassigned = 0;

  for (const item of openTasks.value) {
    if (item.task.domain) {
      counts.set(item.task.domain, (counts.get(item.task.domain) ?? 0) + 1);
      continue;
    }

    unassigned += 1;
  }

  return [
    ...WORKSPACE_TASK_DOMAINS.map((domain) => ({
      key: domain,
      label: getWorkspaceTaskDomainLabel(domain),
      count: counts.get(domain) ?? 0,
      active: props.block.settings.domains.includes(domain),
    })),
    {
      key: "unassigned" as const,
      label: "Unassigned",
      count: unassigned,
      active: props.block.settings.includeUnassigned,
    },
  ];
});

const quadrantFilters = computed(() => {
  const counts = new Map<WorkspaceTaskQuadrant, number>();

  for (const quadrant of WORKSPACE_TASK_QUADRANTS) {
    counts.set(quadrant, 0);
  }

  for (const item of openTasks.value) {
    const key = getWorkspaceTaskQuadrant(item.task);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return WORKSPACE_TASK_QUADRANTS.map((quadrant) => ({
    key: quadrant,
    label: getWorkspaceTaskQuadrantLabel(quadrant),
    count: counts.get(quadrant) ?? 0,
    active: props.block.settings.quadrants.includes(quadrant),
  }));
});

const summaryCards = computed(() => {
  const currentSummary = summary.value;

  return [
    {
      key: "overdue",
      label: "Overdue",
      value: currentSummary?.overdue.length ?? 0,
      className: "border-error/30 bg-error/5",
    },
    {
      key: "upcoming",
      label: "Upcoming",
      value: currentSummary?.upcoming.length ?? 0,
      className: "border-info/30 bg-info/5",
    },
    {
      key: "high-priority",
      label: "High priority",
      value: currentSummary?.highPriority.length ?? 0,
      className: "border-warning/30 bg-warning/5",
    },
    {
      key: "load",
      label: "Open minutes",
      value: currentSummary?.totalEstimateMinutes ?? 0,
      className: "border-primary/30 bg-primary/5",
    },
  ];
});

const visibleQuadrants = computed(() => {
  const currentSummary = summary.value;

  if (!currentSummary) {
    return [];
  }

  return props.block.settings.quadrants.map(
    (quadrant) => currentSummary.quadrants[quadrant],
  );
});

function updateSettings(
  mutator: (settings: WorkspaceTimeOrchestratorBlock["settings"]) => void,
) {
  mutateBlock(props.tabId, props.block.id, (entry) => {
    if (entry.type !== "time-orchestrator") {
      return;
    }

    const nextSettings = createWorkspaceTimeOrchestratorSettings(entry.settings);
    mutator(nextSettings);
    entry.settings = createWorkspaceTimeOrchestratorSettings(nextSettings);
  });
}

function toggleDomain(domain: WorkspaceTaskDomain) {
  updateSettings((settings) => {
    settings.domains = settings.domains.includes(domain)
      ? settings.domains.filter((entry) => entry !== domain)
      : [...settings.domains, domain];
  });
}

function toggleUnassigned() {
  updateSettings((settings) => {
    settings.includeUnassigned = !settings.includeUnassigned;
  });
}

function toggleQuadrant(quadrant: WorkspaceTaskQuadrant) {
  updateSettings((settings) => {
    settings.quadrants = settings.quadrants.includes(quadrant)
      ? settings.quadrants.filter((entry) => entry !== quadrant)
      : [...settings.quadrants, quadrant];
  });
}

function resetFilters() {
  updateSettings((settings) => {
    settings.domains = [...WORKSPACE_TASK_DOMAINS];
    settings.includeUnassigned = true;
    settings.quadrants = [...WORKSPACE_TASK_QUADRANTS];
  });
}
</script>

<template>
  <div class="space-y-5">
    <div class="rounded-2xl border border-muted/60 bg-elevated/20 p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-sm font-medium text-highlighted">Persisted block filters</p>
          <p class="mt-1 text-sm text-muted">
            Domain and quadrant selections are saved on this orchestrator block.
          </p>
        </div>

        <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-rotate-ccw" @click="resetFilters">
          Reset
        </UButton>
      </div>

      <div class="mt-4 space-y-4">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted">Domains</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <UButton
              v-for="domain in domainFilters"
              :key="domain.key"
              size="sm"
              :color="domain.active ? 'primary' : 'neutral'"
              :variant="domain.active ? 'soft' : 'outline'"
              @click="domain.key === 'unassigned' ? toggleUnassigned() : toggleDomain(domain.key)"
            >
              {{ domain.label }}
              <span class="ml-2 text-xs opacity-70">{{ domain.count }}</span>
            </UButton>
          </div>
        </div>

        <div>
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted">Quadrants</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <UButton
              v-for="quadrant in quadrantFilters"
              :key="quadrant.key"
              size="sm"
              :color="quadrant.active ? 'primary' : 'neutral'"
              :variant="quadrant.active ? 'soft' : 'outline'"
              @click="toggleQuadrant(quadrant.key)"
            >
              {{ quadrant.label }}
              <span class="ml-2 text-xs opacity-70">{{ quadrant.count }}</span>
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="card in summaryCards"
        :key="card.key"
        class="rounded-2xl border p-4"
        :class="card.className"
      >
        <p class="text-xs uppercase tracking-[0.2em] text-muted">{{ card.label }}</p>
        <p class="mt-2 text-2xl font-semibold text-highlighted">{{ card.value }}</p>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-muted/60 bg-elevated/30 p-4">
        <p class="text-xs uppercase tracking-[0.2em] text-muted">Open tasks</p>
        <p class="mt-2 text-2xl font-semibold text-highlighted">
          {{ summary?.totalOpenTasks ?? 0 }}
        </p>
      </div>
      <div class="rounded-2xl border border-muted/60 bg-elevated/30 p-4">
        <p class="text-xs uppercase tracking-[0.2em] text-muted">Avg urgency</p>
        <p class="mt-2 text-2xl font-semibold text-highlighted">
          {{ summary?.averageUrgency ?? 0 }}
        </p>
      </div>
      <div class="rounded-2xl border border-muted/60 bg-elevated/30 p-4">
        <p class="text-xs uppercase tracking-[0.2em] text-muted">Avg importance</p>
        <p class="mt-2 text-2xl font-semibold text-highlighted">
          {{ summary?.averageImportance ?? 0 }}
        </p>
      </div>
      <div class="rounded-2xl border border-muted/60 bg-elevated/30 p-4">
        <p class="text-xs uppercase tracking-[0.2em] text-muted">Visible quadrants</p>
        <p class="mt-2 text-2xl font-semibold text-highlighted">
          {{ visibleQuadrants.length }}
        </p>
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div class="rounded-2xl border border-muted/60 bg-default p-4">
        <p class="text-sm font-medium text-highlighted">Suggested next actions</p>
        <div class="mt-3 space-y-3">
          <div
            v-for="item in summary?.suggestedNextActions ?? []"
            :key="`${block.id}-${item.task.id}`"
            class="rounded-2xl border border-muted/60 bg-elevated/30 p-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="font-medium text-highlighted">{{ item.task.text || "Untitled task" }}</p>
              <UBadge color="neutral" variant="soft">
                {{ item.task.estimateMinutes }} min
              </UBadge>
            </div>
            <p class="mt-1 text-sm text-muted">{{ formatRelativeTaskMeta(item) }}</p>
          </div>

          <p v-if="(summary?.suggestedNextActions.length ?? 0) === 0" class="text-sm text-muted">
            No open tasks match these filters.
          </p>
        </div>
      </div>

      <div class="space-y-4">
        <div class="rounded-2xl border border-muted/60 bg-default p-4">
          <p class="text-sm font-medium text-highlighted">Domain load</p>
          <div class="mt-3 space-y-3">
            <div
              v-for="domain in summary?.domainBreakdown ?? []"
              :key="domain.label"
              class="rounded-2xl border border-muted/60 bg-elevated/20 p-3"
            >
              <div class="flex items-center justify-between gap-3">
                <p class="font-medium text-highlighted">{{ domain.label }}</p>
                <UBadge color="neutral" variant="soft">{{ domain.estimateMinutes }} min</UBadge>
              </div>
              <p class="mt-1 text-sm text-muted">{{ domain.count }} open task{{ domain.count === 1 ? '' : 's' }}</p>
            </div>
            <p v-if="(summary?.domainBreakdown.length ?? 0) === 0" class="text-sm text-muted">
              No domain data for the active filters.
            </p>
          </div>
        </div>

        <div class="rounded-2xl border border-muted/60 bg-default p-4">
          <p class="text-sm font-medium text-highlighted">Deadlines</p>
          <div class="mt-3 space-y-3">
            <div>
              <p class="text-xs font-medium uppercase tracking-[0.15em] text-muted">Overdue</p>
              <div class="mt-2 space-y-2">
                <p
                  v-for="item in summary?.overdue ?? []"
                  :key="`overdue-${item.task.id}`"
                  class="text-sm text-toned"
                >
                  {{ item.task.text || "Untitled task" }} · {{ formatRelativeTaskMeta(item) }}
                </p>
                <p v-if="(summary?.overdue.length ?? 0) === 0" class="text-sm text-muted">
                  Nothing overdue.
                </p>
              </div>
            </div>

            <div class="border-t border-muted/60 pt-3">
              <p class="text-xs font-medium uppercase tracking-[0.15em] text-muted">Upcoming</p>
              <div class="mt-2 space-y-2">
                <p
                  v-for="item in summary?.upcoming ?? []"
                  :key="`upcoming-${item.task.id}`"
                  class="text-sm text-toned"
                >
                  {{ item.task.text || "Untitled task" }} · {{ formatRelativeTaskMeta(item) }}
                </p>
                <p v-if="(summary?.upcoming.length ?? 0) === 0" class="text-sm text-muted">
                  No tasks due in the next seven days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-4" :class="visibleQuadrants.length > 1 ? 'xl:grid-cols-2 2xl:grid-cols-4' : ''">
      <div
        v-for="quadrant in visibleQuadrants"
        :key="quadrant.key"
        class="rounded-2xl border border-muted/60 bg-default p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-medium text-highlighted">{{ quadrant.label }}</p>
          <UBadge color="neutral" variant="soft">{{ quadrant.count }}</UBadge>
        </div>
        <p class="mt-1 text-xs uppercase tracking-[0.15em] text-muted">
          {{ quadrant.estimateMinutes }} minutes
        </p>
        <div class="mt-3 space-y-2">
          <p
            v-for="item in quadrant.tasks.slice(0, 4)"
            :key="`${quadrant.key}-${item.task.id}`"
            class="text-sm text-toned"
          >
            {{ item.task.text || "Untitled task" }}
          </p>
          <p v-if="quadrant.tasks.length === 0" class="text-sm text-muted">No tasks.</p>
        </div>
      </div>
    </div>
  </div>
</template>
