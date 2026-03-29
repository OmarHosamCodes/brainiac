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

const { currentNode, mutateBlock, getTimeOrchestratorSummaryForBlock, formatRelativeTaskMeta } =
  useWorkspaceNodeEditorContext();

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

  return props.block.settings.quadrants.map((quadrant) => currentSummary.quadrants[quadrant]);
});

function updateSettings(mutator: (settings: WorkspaceTimeOrchestratorBlock["settings"]) => void) {
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
  <div class="space-y-6">
    <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-sm font-bold text-highlighted">Persisted block filters</p>
          <p class="mt-1 text-xs text-muted">
            Domain and quadrant selections are saved on this orchestrator block.
          </p>
        </div>

        <UButton
          color="neutral"
          variant="soft"
          size="sm"
          icon="i-lucide-rotate-ccw"
          class="rounded-full"
          @click="resetFilters"
        >
          Reset
        </UButton>
      </div>

      <div class="mt-6 space-y-6">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Domains</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <UButton
              v-for="domain in domainFilters"
              :key="domain.key"
              size="sm"
              :color="domain.active ? 'primary' : 'neutral'"
              :variant="domain.active ? 'soft' : 'outline'"
              class="rounded-xl"
              @click="domain.key === 'unassigned' ? toggleUnassigned() : toggleDomain(domain.key)"
            >
              {{ domain.label }}
              <span class="ml-2 text-[10px] font-black opacity-60">{{ domain.count }}</span>
            </UButton>
          </div>
        </div>

        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Quadrants</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <UButton
              v-for="quadrant in quadrantFilters"
              :key="quadrant.key"
              size="sm"
              :color="quadrant.active ? 'primary' : 'neutral'"
              :variant="quadrant.active ? 'soft' : 'outline'"
              class="rounded-xl"
              @click="toggleQuadrant(quadrant.key)"
            >
              {{ quadrant.label }}
              <span class="ml-2 text-[10px] font-black opacity-60">{{ quadrant.count }}</span>
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="card in summaryCards"
        :key="card.key"
        class="rounded-3xl border p-5"
        :class="card.className"
      >
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
          {{ card.label }}
        </p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
          {{ card.value }}
        </p>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-3xl border border-muted/20 bg-elevated/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Open tasks</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
          {{ summary?.totalOpenTasks ?? 0 }}
        </p>
      </div>
      <div class="rounded-3xl border border-muted/20 bg-elevated/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Avg urgency</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
          {{ summary?.averageUrgency ?? 0 }}
        </p>
      </div>
      <div class="rounded-3xl border border-muted/20 bg-elevated/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Avg importance</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
          {{ summary?.averageImportance ?? 0 }}
        </p>
      </div>
      <div class="rounded-3xl border border-muted/20 bg-elevated/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
          Visible quadrants
        </p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
          {{ visibleQuadrants.length }}
        </p>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div class="rounded-3xl border border-muted/20 bg-default/40 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
          Suggested next actions
        </p>
        <div class="mt-4 space-y-3">
          <div
            v-for="item in summary?.suggestedNextActions ?? []"
            :key="`${block.id}-${item.task.id}`"
            class="rounded-2xl border border-muted/20 bg-elevated/10 p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="font-bold text-highlighted leading-tight">
                {{ item.task.text || "Untitled task" }}
              </p>
              <UBadge color="neutral" variant="soft" size="sm" class="rounded-lg">
                {{ item.task.estimateMinutes }} min
              </UBadge>
            </div>
            <p class="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted/40">
              {{ formatRelativeTaskMeta(item) }}
            </p>
          </div>

          <p v-if="(summary?.suggestedNextActions.length ?? 0) === 0" class="text-sm text-muted">
            No open tasks match these filters.
          </p>
        </div>
      </div>

      <div class="space-y-6">
        <div class="rounded-3xl border border-muted/20 bg-default/40 p-5">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Domain load</p>
          <div class="mt-4 space-y-3">
            <div
              v-for="domain in summary?.domainBreakdown ?? []"
              :key="domain.label"
              class="rounded-2xl border border-muted/20 bg-elevated/5 p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <p class="font-bold text-highlighted">{{ domain.label }}</p>
                <UBadge color="neutral" variant="soft" size="sm" class="rounded-lg"
                  >{{ domain.estimateMinutes }} min</UBadge
                >
              </div>
              <p class="mt-1 text-xs text-muted">
                {{ domain.count }} open task{{ domain.count === 1 ? "" : "s" }}
              </p>
            </div>
            <p v-if="(summary?.domainBreakdown.length ?? 0) === 0" class="text-sm text-muted">
              No domain data for the active filters.
            </p>
          </div>
        </div>

        <div class="rounded-3xl border border-muted/20 bg-default/40 p-5">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Deadlines</p>
          <div class="mt-4 space-y-4">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-error/60">Overdue</p>
              <div class="mt-2 space-y-2">
                <p
                  v-for="item in summary?.overdue ?? []"
                  :key="`overdue-${item.task.id}`"
                  class="text-xs text-toned"
                >
                  <span class="font-bold">{{ item.task.text || "Untitled task" }}</span> ·
                  {{ formatRelativeTaskMeta(item) }}
                </p>
                <p v-if="(summary?.overdue.length ?? 0) === 0" class="text-xs text-muted">
                  Nothing overdue.
                </p>
              </div>
            </div>

            <div class="border-t border-muted/10 pt-4">
              <p class="text-[10px] font-bold uppercase tracking-widest text-primary/60">Upcoming</p>
              <div class="mt-2 space-y-2">
                <p
                  v-for="item in summary?.upcoming ?? []"
                  :key="`upcoming-${item.task.id}`"
                  class="text-xs text-toned"
                >
                  <span class="font-bold">{{ item.task.text || "Untitled task" }}</span> ·
                  {{ formatRelativeTaskMeta(item) }}
                </p>
                <p v-if="(summary?.upcoming.length ?? 0) === 0" class="text-xs text-muted">
                  No tasks due in the next seven days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="grid gap-4"
      :class="visibleQuadrants.length > 1 ? 'xl:grid-cols-2 2xl:grid-cols-4' : ''"
    >
      <div
        v-for="quadrant in visibleQuadrants"
        :key="quadrant.key"
        class="rounded-3xl border border-muted/20 bg-default/40 p-5"
      >
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-bold text-highlighted">{{ quadrant.label }}</p>
          <UBadge color="neutral" variant="soft" size="sm" class="rounded-lg">{{
            quadrant.count
          }}</UBadge>
        </div>
        <p class="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
          {{ quadrant.estimateMinutes }} minutes
        </p>
        <div class="mt-4 space-y-2">
          <p
            v-for="item in quadrant.tasks.slice(0, 4)"
            :key="`${quadrant.key}-${item.task.id}`"
            class="text-xs text-toned font-medium"
          >
            {{ item.task.text || "Untitled task" }}
          </p>
          <p v-if="quadrant.tasks.length === 0" class="text-xs text-muted">No tasks.</p>
        </div>
      </div>
    </div>
  </div>
</template>
