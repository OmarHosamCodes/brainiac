<script setup lang="ts">
import {
  WORKSPACE_TASK_DOMAINS,
  WORKSPACE_TASK_QUADRANTS,
  buildEisenhowerBattlePlanPromptFromTasks,
  collectWorkspaceNodeTasks,
  createWorkspaceTask,
  createWorkspaceTimeOrchestratorSettings,
  filterCollectedTasksByTimeOrchestratorSettings,
  getEisenhowerMatrixSummaryFromTasks,
  getWorkspaceTaskDomainLabel,
  type WorkspaceCollectedTask,
  type WorkspaceEisenhowerMatrixBlock,
  type WorkspaceTask,
  type WorkspaceTaskDomain,
  type WorkspaceTaskQuadrant,
} from "@brainiac/workspace";

import WorkspaceOrchestratorSourcesModal from "~/components/workspace/node/blocks/WorkspaceOrchestratorSourcesModal.vue";
import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { formatDateTime } from "~/utils/format-date-time";
import { getErrorMessage } from "~/utils/get-error-message";
import { renderSimpleMarkdown } from "~/utils/render-simple-markdown";

const props = defineProps<{
  block: WorkspaceEisenhowerMatrixBlock;
  tabId: string;
}>();

const toast = useToast();
const {
  currentNode,
  allNodes,
  domainOptions,
  mutateTypedBlock,
  mutateCollectedTask,
  connectSource,
  disconnectSource,
  removeCollectedTask,
  addTaskToSource,
  navigateToSource,
  runBlockAgentPrompt,
  getBlockOperationState,
  formatRelativeTaskMeta,
} = useWorkspaceNodeEditorContext();

const sourcesModalOpen = ref(false);

const operationState = computed(() => getBlockOperationState(props.tabId, props.block.id));
const isOrchestratorNode = computed(() => currentNode.value?.nodeType === "orchestrator");
const currentNodeTitle = computed(
  () =>
    currentNode.value?.title.trim() ||
    currentNode.value?.label.trim() ||
    "Current node",
);
const currentTabTitle = computed(() => {
  const tab = currentNode.value?.tabs.find((entry) => entry.id === props.tabId);

  return tab?.title.trim() || "Current tab";
});

const quadrantMeta = {
  do: {
    description: "Urgent + important",
    className: "border-error/25 bg-error/5",
  },
  schedule: {
    description: "Important, not urgent",
    className: "border-primary/25 bg-primary/5",
  },
  delegate: {
    description: "Urgent, lower leverage",
    className: "border-warning/25 bg-warning/5",
  },
  eliminate: {
    description: "Low urgency + importance",
    className: "border-muted/35 bg-elevated/20",
  },
} satisfies Record<
  WorkspaceTaskQuadrant,
  { description: string; className: string }
>;

const scopedCollectedTasks = computed<WorkspaceCollectedTask[]>(() => {
  if (!currentNode.value) {
    return [];
  }

  if (isOrchestratorNode.value) {
    return collectWorkspaceNodeTasks(currentNode.value, allNodes.value);
  }

  return props.block.tasks.map((task) => ({
    sourceNodeId: currentNode.value!.id,
    sourceNodeTitle: currentNodeTitle.value,
    blockId: props.block.id,
    blockTitle: props.block.title.trim() || "Eisenhower matrix",
    blockType: "eisenhower-matrix",
    tabId: props.tabId,
    tabTitle: currentTabTitle.value,
    task,
  }));
});

const filteredCollectedTasks = computed(() =>
  filterCollectedTasksByTimeOrchestratorSettings(
    scopedCollectedTasks.value,
    props.block.settings,
  ),
);

const summary = computed(() =>
  getEisenhowerMatrixSummaryFromTasks(filteredCollectedTasks.value),
);

const openScopedTasks = computed(() =>
  scopedCollectedTasks.value.filter(({ task }) => !task.completed),
);

const visibleQuadrants = computed(() =>
  props.block.settings.quadrants.map((quadrant) => summary.value.quadrants[quadrant]),
);

const taskEditorDescription = computed(() =>
  isOrchestratorNode.value
    ? "Edit tasks across connected sources. Derived content pipeline signals stay partially read-only."
    : "Edit the task list directly and the matrix will re-sort itself instantly.",
);

const matrixStatus = computed(() => {
  if (operationState.value.pending) {
    return {
      label: operationState.value.label || "Running analysis",
      tone: "primary" as const,
      description: "The Orchestrator is generating a battle plan from the current filtered matrix scope.",
    };
  }

  if (filteredCollectedTasks.value.length === 0) {
    return {
      label:
        scopedCollectedTasks.value.length === 0
          ? "No tasks yet"
          : "No tasks match filters",
      tone: "warning" as const,
      description:
        scopedCollectedTasks.value.length === 0
          ? "Add tasks so urgency and importance can map your priorities."
          : "Adjust the domain or quadrant filters to widen the matrix scope.",
    };
  }

  if (summary.value.overdueCount > 0) {
    return {
      label: "Overdue focus needed",
      tone: "warning" as const,
      description: `${summary.value.overdueCount} overdue task${summary.value.overdueCount === 1 ? "" : "s"} need immediate attention.`,
    };
  }

  if (
    props.block.settings.quadrants.includes("do") &&
    summary.value.quadrants.do.taskCount === 0
  ) {
    return {
      label: "No do-now tasks",
      tone: "primary" as const,
      description: "Nothing is currently in the urgent + important quadrant.",
    };
  }

  return {
    label: "Matrix ready",
    tone: "success" as const,
    description: "Priorities are distributed across the current filtered scope and ready for execution.",
  };
});

const domainFilters = computed(() => {
  const counts = new Map<WorkspaceTaskDomain, number>();

  for (const domain of WORKSPACE_TASK_DOMAINS) {
    counts.set(domain, 0);
  }

  let unassigned = 0;

  for (const item of openScopedTasks.value) {
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

  for (const item of openScopedTasks.value) {
    const key = getScopedQuadrant(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return WORKSPACE_TASK_QUADRANTS.map((quadrant) => ({
    key: quadrant,
    label: summary.value.quadrants[quadrant].label,
    count: counts.get(quadrant) ?? 0,
    active: props.block.settings.quadrants.includes(quadrant),
  }));
});

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function clampTenPointScale(value: string | number | null | undefined, fallback = 5) {
  const numeric = Number(value ?? fallback);
  return Math.min(10, Math.max(1, Math.round(Number.isFinite(numeric) ? numeric : fallback)));
}

function clampEstimate(value: string | number | null | undefined, fallback = 30) {
  const numeric = Number(value ?? fallback);
  return Math.min(1440, Math.max(0, Math.round(Number.isFinite(numeric) ? numeric : fallback)));
}

function getInputValue(event: Event) {
  return (event.target as HTMLInputElement | null)?.value ?? "";
}

function toTaskDomain(value: string | null | undefined) {
  return WORKSPACE_TASK_DOMAINS.includes(value as WorkspaceTaskDomain)
    ? (value as WorkspaceTaskDomain)
    : null;
}

function isOverdue(task: WorkspaceTask) {
  return Boolean(task.dueDate) && new Date(`${task.dueDate}T12:00:00`).getTime() < Date.now();
}

function getDomainPillClass(domain: WorkspaceTaskDomain | null | undefined) {
  switch (domain) {
    case "sales":
      return "border-warning/30 bg-warning/10 text-warning";
    case "content":
      return "border-secondary/30 bg-secondary/10 text-secondary";
    case "education":
      return "border-info/30 bg-info/10 text-info";
    case "people":
      return "border-success/30 bg-success/10 text-success";
    case "finance":
      return "border-error/30 bg-error/10 text-error";
    case "strategy":
      return "border-primary/30 bg-primary/10 text-primary";
    case "brand":
      return "border-secondary/30 bg-secondary/10 text-secondary";
    case "orchestrator":
      return "border-primary/30 bg-primary/10 text-primary";
    default:
      return "border-muted/30 bg-elevated/30 text-muted";
  }
}

function getQuadrantClassName(quadrant: WorkspaceTaskQuadrant) {
  return quadrantMeta[quadrant].className;
}

function getQuadrantDescription(quadrant: WorkspaceTaskQuadrant) {
  return quadrantMeta[quadrant].description;
}

function getCollectedTaskKey(item: WorkspaceCollectedTask) {
  return `${item.sourceNodeId}:${item.blockId}:${item.task.id}`;
}

function isDerivedTask(item: WorkspaceCollectedTask) {
  return item.blockType === "content-pipeline";
}

function getScopedQuadrant(item: WorkspaceCollectedTask): WorkspaceTaskQuadrant {
  if (item.task.urgency >= 7 && item.task.importance >= 7) {
    return "do";
  }

  if (item.task.importance >= 7) {
    return "schedule";
  }

  if (item.task.urgency >= 7) {
    return "delegate";
  }

  return "eliminate";
}

function updateSettings(
  mutator: (settings: WorkspaceEisenhowerMatrixBlock["settings"]) => void,
) {
  mutateTypedBlock(
    props.tabId,
    props.block.id,
    "eisenhower-matrix",
    (entry) => {
      const nextSettings = createWorkspaceTimeOrchestratorSettings(entry.settings);
      mutator(nextSettings);
      entry.settings = createWorkspaceTimeOrchestratorSettings(nextSettings);
    },
  );
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

function mutateEisenhowerBlock(
  mutator: (block: WorkspaceEisenhowerMatrixBlock, timestamp: string) => void,
) {
  mutateTypedBlock(
    props.tabId,
    props.block.id,
    "eisenhower-matrix",
    (block, _tab, _node, timestamp) => {
      mutator(block, timestamp);
    },
  );
}

function mutateTaskItem(item: WorkspaceCollectedTask, mutator: (task: WorkspaceTask) => void) {
  mutateCollectedTask(item, mutator);
}

function addTask() {
  mutateEisenhowerBlock((block) => {
    block.tasks.unshift(
      createWorkspaceTask({
        text: "New task",
        domain: "orchestrator",
        urgency: 5,
        importance: 5,
        estimateMinutes: 30,
      }),
    );
  });
}

function removeTaskItem(item: WorkspaceCollectedTask) {
  removeCollectedTask(item);
}

function toggleTaskCompleted(item: WorkspaceCollectedTask, value: boolean | string | undefined) {
  mutateTaskItem(item, (entry) => {
    entry.completed = Boolean(value);
  });
}

function updateTaskText(
  item: WorkspaceCollectedTask,
  value: string | number | undefined,
) {
  mutateTaskItem(item, (entry) => {
    entry.text = String(value ?? "").slice(0, 240);
  });
}

function updateTaskDomain(item: WorkspaceCollectedTask, value: string | undefined) {
  mutateTaskItem(item, (entry) => {
    entry.domain = toTaskDomain(value);
  });
}

function updateTaskUrgency(
  item: WorkspaceCollectedTask,
  value: string | number | null | undefined,
) {
  if (isDerivedTask(item)) {
    return;
  }

  mutateTaskItem(item, (entry) => {
    entry.urgency = clampTenPointScale(value, entry.urgency);
  });
}

function updateTaskImportance(
  item: WorkspaceCollectedTask,
  value: string | number | null | undefined,
) {
  if (isDerivedTask(item)) {
    return;
  }

  mutateTaskItem(item, (entry) => {
    entry.importance = clampTenPointScale(value, entry.importance);
  });
}

function updateTaskEstimate(
  item: WorkspaceCollectedTask,
  value: string | number | null | undefined,
) {
  if (isDerivedTask(item)) {
    return;
  }

  mutateTaskItem(item, (entry) => {
    entry.estimateMinutes = clampEstimate(value, entry.estimateMinutes);
  });
}

function updateTaskDueDate(item: WorkspaceCollectedTask, value: string | undefined) {
  if (isDerivedTask(item)) {
    return;
  }

  mutateTaskItem(item, (entry) => {
    entry.dueDate = value || null;
  });
}

function navigateToTaskSource(item: WorkspaceCollectedTask) {
  navigateToSource(item.sourceNodeId);
}

function handleMutateTask(
  item: WorkspaceCollectedTask,
  mutator: (task: WorkspaceCollectedTask["task"]) => void,
) {
  mutateTaskItem(item, mutator);
}

async function prioritizeWithAi() {
  if (filteredCollectedTasks.value.length === 0 || operationState.value.pending) {
    return;
  }

  try {
    const response = await runBlockAgentPrompt(
      props.tabId,
      props.block.id,
      buildEisenhowerBattlePlanPromptFromTasks(filteredCollectedTasks.value),
    );

    mutateEisenhowerBlock((block, timestamp) => {
      block.latestBattlePlan = response;
      block.battlePlanUpdatedAt = timestamp;
    });

    toast.add({
      title: "Battle plan saved",
      description: "The orchestrator analysis was added to this matrix.",
      color: "success",
      icon: "i-lucide-sparkles",
    });
  } catch (error) {
    toast.add({
      title: "Prioritization failed",
      description: getErrorMessage(error, "The Orchestrator agent could not build a battle plan."),
      color: "error",
      icon: "i-lucide-alert-circle",
    });
  }
}
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-2">
          <div class="flex items-center gap-2 text-primary">
            <UIcon name="i-lucide-layout-grid" class="size-5" />
            <p class="text-[10px] font-bold uppercase tracking-[0.2em]">
              Eisenhower Matrix
            </p>
          </div>
          <h3 class="text-lg font-bold tracking-tight text-highlighted">
            Prioritize across the current task scope
          </h3>
          <p class="max-w-2xl text-sm text-muted">
            {{ matrixStatus.description }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UBadge :color="matrixStatus.tone" variant="soft" class="rounded-full">
            {{ matrixStatus.label }}
          </UBadge>
          <UBadge
            v-if="operationState.pending"
            color="neutral"
            variant="soft"
            class="rounded-full"
          >
            <span class="inline-flex items-center gap-1.5">
              <UIcon name="i-lucide-loader-2" class="size-3.5 animate-spin" />
              Syncing
            </span>
          </UBadge>
          <UButton
            v-if="isOrchestratorNode"
            color="primary"
            variant="soft"
            size="sm"
            icon="i-lucide-plug-2"
            class="rounded-full px-4"
            aria-label="Manage connected sources"
            @click="sourcesModalOpen = true"
          >
            Manage Sources
          </UButton>
          <UButton
            color="neutral"
            variant="soft"
            size="sm"
            icon="i-lucide-rotate-ccw"
            class="rounded-full px-4"
            aria-label="Reset matrix filters"
            @click="resetFilters"
          >
            Reset Filters
          </UButton>
        </div>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <fieldset class="space-y-3">
          <legend class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
            Domain filters
          </legend>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="domain in domainFilters"
              :key="domain.key"
              type="button"
              size="sm"
              :color="domain.active ? 'primary' : 'neutral'"
              :variant="domain.active ? 'soft' : 'outline'"
              class="rounded-xl"
              :aria-pressed="domain.active"
              :aria-label="`${domain.active ? 'Disable' : 'Enable'} ${domain.label} domain filter`"
              @click="
                domain.key === 'unassigned'
                  ? toggleUnassigned()
                  : toggleDomain(domain.key)
              "
            >
              {{ domain.label }}
              <span class="ml-2 text-[10px] font-black opacity-60">
                {{ domain.count }}
              </span>
            </UButton>
          </div>
        </fieldset>

        <fieldset class="space-y-3">
          <legend class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
            Quadrant filters
          </legend>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="quadrant in quadrantFilters"
              :key="quadrant.key"
              type="button"
              size="sm"
              :color="quadrant.active ? 'primary' : 'neutral'"
              :variant="quadrant.active ? 'soft' : 'outline'"
              class="rounded-xl"
              :aria-pressed="quadrant.active"
              :aria-label="`${quadrant.active ? 'Disable' : 'Enable'} ${quadrant.label} quadrant filter`"
              @click="toggleQuadrant(quadrant.key)"
            >
              {{ quadrant.label }}
              <span class="ml-2 text-[10px] font-black opacity-60">
                {{ quadrant.count }}
              </span>
            </UButton>
          </div>
        </fieldset>
      </div>
    </section>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-3xl border border-primary/10 bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">
          Total Task Time
        </p>
        <p class="mt-2 text-2xl font-black tracking-tight text-primary sm:text-3xl">
          {{ formatDuration(summary.totalEstimateMinutes) }}
        </p>
      </div>

      <div class="rounded-3xl border border-error/10 bg-error/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-error/60">
          Overdue
        </p>
        <p class="mt-2 text-2xl font-black tracking-tight text-error sm:text-3xl">
          {{ summary.overdueCount }}
        </p>
      </div>

      <div class="rounded-3xl border border-success/10 bg-success/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-success/60">
          Completed
        </p>
        <p class="mt-2 text-2xl font-black tracking-tight text-success sm:text-3xl">
          {{ summary.completedCount }}
        </p>
      </div>

      <div class="rounded-3xl border border-secondary/10 bg-secondary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/60">
          Active Domains
        </p>
        <p class="mt-2 text-2xl font-black tracking-tight text-secondary sm:text-3xl">
          {{ summary.activeDomainCount }}
        </p>
      </div>
    </div>

    <div
      class="grid gap-4"
      :class="visibleQuadrants.length > 1 ? 'xl:grid-cols-2' : ''"
    >
      <article
        v-for="quadrant in visibleQuadrants"
        :key="quadrant.key"
        class="rounded-3xl border border-muted/20 p-5"
        :class="getQuadrantClassName(quadrant.key)"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
              {{ quadrant.label }}
            </p>
            <p class="mt-1 text-xs font-medium text-muted/80">
              {{ getQuadrantDescription(quadrant.key) }}
            </p>
          </div>

          <div class="text-right">
            <p class="text-2xl font-black tracking-tight text-highlighted">
              {{ quadrant.taskCount }}
            </p>
            <p class="text-[10px] font-bold uppercase tracking-widest text-muted/60">
              {{ formatDuration(quadrant.estimateMinutes) }}
            </p>
          </div>
        </div>

        <div
          v-if="quadrant.tasks.length === 0"
          class="mt-4 rounded-2xl border border-dashed border-muted/20 bg-elevated/5 py-8 text-center text-sm font-medium text-muted/60"
        >
          No tasks in this quadrant.
        </div>

        <div v-else class="mt-4 space-y-3">
          <article
            v-for="item in quadrant.tasks"
            :key="getCollectedTaskKey(item)"
            class="rounded-2xl border border-muted/20 bg-default/40 p-4"
          >
            <div class="flex items-start gap-3">
              <UCheckbox
                :model-value="item.task.completed"
                class="mt-1"
                @update:model-value="
                  toggleTaskCompleted(item, $event as boolean | string | undefined)
                "
              />

              <div class="min-w-0 flex-1 space-y-2">
                <p class="text-sm font-semibold text-highlighted">
                  {{ item.task.text }}
                </p>
                <div class="flex flex-wrap gap-2">
                  <UBadge
                    :class="getDomainPillClass(item.task.domain)"
                    variant="subtle"
                    size="sm"
                    class="rounded-lg"
                  >
                    {{ getWorkspaceTaskDomainLabel(item.task.domain) }}
                  </UBadge>
                  <UBadge color="neutral" variant="soft" size="sm" class="rounded-lg">
                    {{ formatDuration(item.task.estimateMinutes) }}
                  </UBadge>
                  <UBadge
                    color="neutral"
                    variant="soft"
                    size="sm"
                    class="rounded-lg"
                  >
                    {{ item.sourceNodeTitle }}
                  </UBadge>
                  <UBadge
                    v-if="isDerivedTask(item)"
                    color="secondary"
                    variant="soft"
                    size="sm"
                    class="rounded-lg"
                  >
                    Derived
                  </UBadge>
                  <UBadge
                    v-if="isOverdue(item.task)"
                    color="error"
                    variant="soft"
                    size="sm"
                    class="rounded-lg"
                  >
                    Overdue
                  </UBadge>
                </div>
                <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted/40">
                  {{ formatRelativeTaskMeta(item) }}
                </p>
              </div>
            </div>
          </article>
        </div>
      </article>
    </div>

    <section class="rounded-3xl border border-muted/20 bg-default/40 p-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-sm font-bold uppercase tracking-wider text-highlighted">
            Domain time allocation
          </h3>
          <p class="mt-1 text-xs text-muted">
            Open task load is grouped by domain so time concentration is visible at a glance.
          </p>
        </div>
      </div>

      <div
        v-if="summary.domainAllocation.length === 0"
        class="mt-6 rounded-2xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center text-sm font-medium text-muted/60"
      >
        No open task load yet.
      </div>

      <div v-else class="mt-6 space-y-5">
        <div
          v-for="allocation in summary.domainAllocation"
          :key="allocation.domain ?? 'unassigned'"
        >
          <div class="mb-2 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-highlighted">
                {{ allocation.label }}
              </span>
              <UBadge
                :class="getDomainPillClass(allocation.domain)"
                variant="subtle"
                size="sm"
                class="rounded-lg"
              >
                {{ allocation.taskCount }} tasks
              </UBadge>
            </div>
            <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
              {{ formatDuration(allocation.estimateMinutes) }}
            </span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-elevated/10">
            <div
              class="h-full rounded-full bg-primary transition-all"
              :style="{
                width: `${Math.max((allocation.estimateMinutes / Math.max(summary.totalEstimateMinutes, 1)) * 100, 4)}%`,
              }"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-muted/20 bg-default/40 p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 class="text-sm font-bold uppercase tracking-wider text-highlighted">
            Task editor
          </h3>
          <p class="mt-1 text-xs text-muted">
            {{ taskEditorDescription }}
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-lucide-plus"
            class="rounded-full px-4"
            size="sm"
            @click="addTask"
          >
            Add Task
          </UButton>
          <UButton
            color="primary"
            variant="subtle"
            icon="i-lucide-sparkles"
            class="rounded-full px-4"
            size="sm"
            :disabled="filteredCollectedTasks.length === 0 || operationState.pending"
            :loading="operationState.pending"
            @click="prioritizeWithAi"
          >
            {{ operationState.pending ? (operationState.label || "Running analysis") : "AI Prioritize" }}
          </UButton>
        </div>
      </div>

      <div
        v-if="summary.prioritizedTasks.length === 0"
        class="mt-6 rounded-3xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center text-sm font-medium text-muted/60"
      >
        {{
          scopedCollectedTasks.length === 0
            ? "No tasks to prioritize yet."
            : "No tasks match the current filters."
        }}
      </div>

      <div v-else class="mt-6 space-y-4">
        <article
          v-for="item in summary.prioritizedTasks"
          :key="getCollectedTaskKey(item)"
          class="rounded-2xl border border-muted/20 bg-elevated/5 p-4"
        >
          <div class="grid gap-4 xl:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,0.7fr)]">
            <div class="flex items-start pt-2">
              <UCheckbox
                :model-value="item.task.completed"
                @update:model-value="
                  toggleTaskCompleted(item, $event as boolean | string | undefined)
                "
              />
            </div>

            <div class="space-y-4">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge color="neutral" variant="soft" size="sm" class="rounded-lg">
                  {{ item.sourceNodeTitle }}
                </UBadge>
                <UBadge
                  color="neutral"
                  variant="soft"
                  size="sm"
                  class="rounded-lg"
                >
                  {{ item.blockTitle }}
                </UBadge>
                <UBadge
                  v-if="isDerivedTask(item)"
                  color="secondary"
                  variant="soft"
                  size="sm"
                  class="rounded-lg"
                >
                  Content pipeline
                </UBadge>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-arrow-up-right"
                  class="rounded-lg"
                  @click="navigateToTaskSource(item)"
                >
                  Open source
                </UButton>
              </div>

              <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted/40">
                {{ formatRelativeTaskMeta(item) }}
              </p>

              <p
                v-if="isDerivedTask(item)"
                class="text-xs text-muted"
              >
                Urgency, importance, estimate, and due date are derived from the source content
                pipeline and are read-only here.
              </p>

              <div class="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
                <UInput
                  :model-value="item.task.text"
                  placeholder="Task name"
                  variant="subtle"
                  class="rounded-xl"
                  @update:model-value="
                    updateTaskText(item, $event as string | number | undefined)
                  "
                />

                <USelect
                  v-if="!isDerivedTask(item)"
                  :model-value="item.task.domain ?? ''"
                  :items="domainOptions"
                  variant="subtle"
                  class="rounded-xl"
                  @update:model-value="
                    updateTaskDomain(item, $event as string | undefined)
                  "
                />
                <UInput
                  v-else
                  :model-value="getWorkspaceTaskDomainLabel(item.task.domain)"
                  variant="subtle"
                  class="rounded-xl"
                  disabled
                />
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div class="space-y-2 rounded-xl border border-muted/20 bg-default/40 p-3">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
                      Urgency
                    </span>
                    <span class="text-sm font-black text-highlighted">
                      {{ item.task.urgency }}/10
                    </span>
                  </div>
                  <input
                    :value="item.task.urgency"
                    type="range"
                    min="1"
                    max="10"
                    :disabled="isDerivedTask(item)"
                    class="h-1.5 w-full appearance-none rounded-full bg-error/20 accent-error disabled:cursor-not-allowed disabled:opacity-50"
                    @input="updateTaskUrgency(item, getInputValue($event))"
                  />
                </div>

                <div class="space-y-2 rounded-xl border border-muted/20 bg-default/40 p-3">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
                      Importance
                    </span>
                    <span class="text-sm font-black text-highlighted">
                      {{ item.task.importance }}/10
                    </span>
                  </div>
                  <input
                    :value="item.task.importance"
                    type="range"
                    min="1"
                    max="10"
                    :disabled="isDerivedTask(item)"
                    class="h-1.5 w-full appearance-none rounded-full bg-primary/20 accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                    @input="updateTaskImportance(item, getInputValue($event))"
                  />
                </div>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-[minmax(0,0.65fr)_minmax(0,0.35fr)_auto] xl:grid-cols-1">
              <div class="space-y-1">
                <label class="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
                  Time Estimate
                </label>
                <UInput
                  :model-value="String(item.task.estimateMinutes)"
                  type="number"
                  variant="subtle"
                  class="rounded-xl"
                  :disabled="isDerivedTask(item)"
                  @update:model-value="
                    updateTaskEstimate(item, $event as string | number | null | undefined)
                  "
                />
              </div>

              <div class="space-y-1">
                <label class="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
                  Due Date
                </label>
                <UInput
                  :model-value="item.task.dueDate ?? ''"
                  type="date"
                  variant="subtle"
                  class="rounded-xl"
                  :disabled="isDerivedTask(item)"
                  @update:model-value="
                    updateTaskDueDate(item, $event as string | undefined)
                  "
                />
              </div>

              <div class="flex items-end justify-end">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  class="rounded-lg hover:bg-error/10 hover:text-error"
                  size="sm"
                  @click="removeTaskItem(item)"
                />
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="rounded-3xl border border-primary/20 bg-primary/5 p-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-sm font-bold uppercase tracking-wider text-highlighted">
            AI battle plan
          </h3>
          <p class="mt-1 text-xs text-muted">
            The Orchestrator agent turns the current filtered matrix scope into a concrete
            sequencing recommendation.
          </p>
        </div>

        <p
          v-if="block.battlePlanUpdatedAt"
          class="text-[10px] font-bold uppercase tracking-widest text-muted/60"
        >
          Last updated {{ formatDateTime(block.battlePlanUpdatedAt) }}
        </p>
      </div>

      <div
        class="prose prose-sm dark:prose-invert mt-6 max-w-none rounded-2xl border border-muted/20 bg-default/60 p-5 text-sm leading-relaxed text-toned shadow-sm"
        v-html="
          renderSimpleMarkdown(
            block.latestBattlePlan ||
              'Run AI Prioritize to generate a battle plan from the current filtered matrix scope.',
          )
        "
      />
    </section>

    <WorkspaceOrchestratorSourcesModal
      v-if="currentNode && isOrchestratorNode"
      :open="sourcesModalOpen"
      :orchestrator-node="currentNode"
      :all-nodes="allNodes"
      @update:open="sourcesModalOpen = $event"
      @connect="connectSource"
      @disconnect="disconnectSource"
      @mutate-task="handleMutateTask"
      @remove-task="removeCollectedTask"
      @add-task="addTaskToSource"
      @navigate-to-source="navigateToSource"
    />
  </div>
</template>
