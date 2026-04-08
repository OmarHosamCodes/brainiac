<script setup lang="ts">
import {
    buildEisenhowerBattlePlanPrompt,
    createWorkspaceTask,
    getEisenhowerMatrixSummary,
    getWorkspaceTaskDomainLabel,
    type WorkspaceEisenhowerMatrixBlock,
    type WorkspaceTask,
    type WorkspaceTaskDomain,
    type WorkspaceTaskQuadrant,
} from "@brainiac/workspace";

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
  domainOptions,
  mutateTypedBlock,
  runBlockAgentPrompt,
  getBlockOperationState,
} = useWorkspaceNodeEditorContext();

const summary = computed(() => getEisenhowerMatrixSummary(props.block));
const operationState = computed(() => getBlockOperationState(props.tabId, props.block.id));

const matrixStatus = computed(() => {
  if (operationState.value.pending) {
    return {
      label: operationState.value.label || "Running analysis",
      tone: "primary" as const,
      description: "The Orchestrator is generating a battle plan from the current matrix.",
    };
  }

  if (summary.value.prioritizedTasks.length === 0) {
    return {
      label: "No tasks yet",
      tone: "warning" as const,
      description: "Add tasks so urgency and importance can map your priorities.",
    };
  }

  if (summary.value.overdueCount > 0) {
    return {
      label: "Overdue focus needed",
      tone: "warning" as const,
      description: `${summary.value.overdueCount} overdue task${summary.value.overdueCount === 1 ? "" : "s"} need immediate attention.`,
    };
  }

  if (summary.value.quadrants.do.taskCount === 0) {
    return {
      label: "No do-now tasks",
      tone: "primary" as const,
      description: "Nothing is currently in the urgent + important quadrant.",
    };
  }

  return {
    label: "Matrix ready",
    tone: "success" as const,
    description: "Priorities are distributed and ready for execution.",
  };
});

const quadrantMeta: Array<{
  key: WorkspaceTaskQuadrant;
  label: string;
  description: string;
  className: string;
}> = [
  {
    key: "do",
    label: "Do Now",
    description: "Urgent + important",
    className: "border-error/25 bg-error/5",
  },
  {
    key: "schedule",
    label: "Schedule",
    description: "Important, not urgent",
    className: "border-primary/25 bg-primary/5",
  },
  {
    key: "delegate",
    label: "Delegate",
    description: "Urgent, lower leverage",
    className: "border-warning/25 bg-warning/5",
  },
  {
    key: "eliminate",
    label: "Eliminate",
    description: "Low urgency + importance",
    className: "border-muted/35 bg-elevated/20",
  },
];

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
  return value === "strategy" ||
    value === "people" ||
    value === "sales" ||
    value === "content" ||
    value === "brand" ||
    value === "finance" ||
    value === "education" ||
    value === "orchestrator"
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

function mutateTask(taskId: string, mutator: (task: WorkspaceTask) => void) {
  mutateEisenhowerBlock((block) => {
    const task = block.tasks.find((entry) => entry.id === taskId);

    if (!task) {
      return;
    }

    mutator(task);
  });
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

function removeTask(taskId: string) {
  mutateEisenhowerBlock((block) => {
    block.tasks = block.tasks.filter((task) => task.id !== taskId);
  });
}

function toggleTaskCompleted(taskId: string, value: boolean | string | undefined) {
  mutateTask(taskId, (entry) => {
    entry.completed = Boolean(value);
  });
}

function updateTaskText(taskId: string, value: string | number | undefined) {
  mutateTask(taskId, (entry) => {
    entry.text = String(value ?? "").slice(0, 240);
  });
}

function updateTaskDomain(taskId: string, value: string | undefined) {
  mutateTask(taskId, (entry) => {
    entry.domain = toTaskDomain(value);
  });
}

function updateTaskUrgency(taskId: string, value: string | number | null | undefined) {
  mutateTask(taskId, (entry) => {
    entry.urgency = clampTenPointScale(value, entry.urgency);
  });
}

function updateTaskImportance(taskId: string, value: string | number | null | undefined) {
  mutateTask(taskId, (entry) => {
    entry.importance = clampTenPointScale(value, entry.importance);
  });
}

function updateTaskEstimate(taskId: string, value: string | number | null | undefined) {
  mutateTask(taskId, (entry) => {
    entry.estimateMinutes = clampEstimate(value, entry.estimateMinutes);
  });
}

function updateTaskDueDate(taskId: string, value: string | undefined) {
  mutateTask(taskId, (entry) => {
    entry.dueDate = value || null;
  });
}

async function prioritizeWithAi() {
  if (props.block.tasks.length === 0 || operationState.value.pending) {
    return;
  }

  try {
    const response = await runBlockAgentPrompt(
      props.tabId,
      props.block.id,
      buildEisenhowerBattlePlanPrompt(props.block),
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
        <div>
          <h3 class="text-sm font-semibold text-highlighted">Priority matrix</h3>
          <p class="mt-1 text-sm text-muted">{{ matrixStatus.description }}</p>
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
        </div>
      </div>
    </section>

    <!-- Summary Grid -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-3xl bg-primary/5 p-5 border border-primary/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">
          Total Task Time
        </p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-primary">
          {{ formatDuration(summary.totalEstimateMinutes) }}
        </p>
      </div>

      <div class="rounded-3xl bg-error/5 p-5 border border-error/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-error/60">Overdue</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-error">
          {{ summary.overdueCount }}
        </p>
      </div>

      <div class="rounded-3xl bg-success/5 p-5 border border-success/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-success/60">Completed</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-success">
          {{ summary.completedCount }}
        </p>
      </div>

      <div class="rounded-3xl bg-secondary/5 p-5 border border-secondary/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/60">
          Active Domains
        </p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-secondary">
          {{ summary.activeDomainCount }}
        </p>
      </div>
    </div>

    <!-- Quadrant Grid -->
    <div class="grid gap-4 xl:grid-cols-2">
      <article
        v-for="quadrant in quadrantMeta"
        :key="quadrant.key"
        class="rounded-3xl border border-muted/20 p-5"
        :class="quadrant.className"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
              {{ quadrant.label }}
            </p>
            <p class="mt-1 text-xs font-medium text-muted/80">{{ quadrant.description }}</p>
          </div>

          <div class="text-right">
            <p class="text-2xl font-black tracking-tight text-highlighted">
              {{ summary.quadrants[quadrant.key].taskCount }}
            </p>
            <p class="text-[10px] font-bold uppercase tracking-widest text-muted/60">
              {{ formatDuration(summary.quadrants[quadrant.key].estimateMinutes) }}
            </p>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="summary.quadrants[quadrant.key].tasks.length === 0"
          class="mt-4 border-dashed border-muted/20 rounded-2xl py-8 text-center bg-elevated/5 text-sm font-medium text-muted/60"
        >
          No tasks in this quadrant.
        </div>

        <div v-else class="mt-4 space-y-3">
          <article
            v-for="task in summary.quadrants[quadrant.key].tasks"
            :key="task.id"
            class="rounded-2xl border border-muted/20 bg-default/40 p-4"
          >
            <div class="flex items-start gap-3">
              <UCheckbox
                :model-value="task.completed"
                class="mt-1"
                @update:model-value="toggleTaskCompleted(task.id, $event as boolean | string | undefined)"
              />

              <div class="min-w-0 flex-1 space-y-2">
                <p class="font-semibold text-highlighted text-sm">{{ task.text }}</p>
                <div class="flex flex-wrap gap-2">
                  <UBadge :class="getDomainPillClass(task.domain)" variant="subtle" size="sm" class="rounded-lg">
                    {{ getWorkspaceTaskDomainLabel(task.domain) }}
                  </UBadge>
                  <UBadge color="neutral" variant="soft" size="sm" class="rounded-lg">
                    {{ formatDuration(task.estimateMinutes) }}
                  </UBadge>
                  <UBadge v-if="isOverdue(task)" color="error" variant="soft" size="sm" class="rounded-lg">
                    Overdue
                  </UBadge>
                </div>
              </div>
            </div>
          </article>
        </div>
      </article>
    </div>

    <!-- Domain Allocation -->
    <section class="rounded-3xl border border-muted/20 bg-default/40 p-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-sm font-bold text-highlighted uppercase tracking-wider">Domain time allocation</h3>
          <p class="text-xs text-muted mt-1">
            Open task load is grouped by domain so time concentration is visible at a glance.
          </p>
        </div>
      </div>

      <div
        v-if="summary.domainAllocation.length === 0"
        class="mt-6 border-dashed border-muted/20 rounded-2xl py-12 text-center bg-elevated/5 text-sm font-medium text-muted/60"
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
              <span class="text-sm font-bold text-highlighted">{{ allocation.label }}</span>
              <UBadge :class="getDomainPillClass(allocation.domain)" variant="subtle" size="sm" class="rounded-lg">
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

    <!-- Task Editor -->
    <section class="rounded-3xl border border-muted/20 bg-default/40 p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 class="text-sm font-bold text-highlighted uppercase tracking-wider">Task editor</h3>
          <p class="text-xs text-muted mt-1">
            Edit the task list directly and the matrix will re-sort itself instantly.
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
            :disabled="block.tasks.length === 0 || operationState.pending"
            :loading="operationState.pending"
            @click="prioritizeWithAi"
          >
            {{ operationState.pending ? (operationState.label || "Running analysis") : "AI Prioritize" }}
          </UButton>
        </div>
      </div>

      <div
        v-if="summary.prioritizedTasks.length === 0"
        class="mt-6 border-dashed border-muted/20 rounded-3xl py-12 text-center bg-elevated/5 text-sm font-medium text-muted/60"
      >
        No tasks to prioritize yet.
      </div>

      <div v-else class="mt-6 space-y-4">
        <article
          v-for="task in summary.prioritizedTasks"
          :key="task.id"
          class="rounded-2xl border border-muted/20 bg-elevated/5 p-4"
        >
          <div class="grid gap-4 xl:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,0.7fr)]">
            <div class="flex items-start pt-2">
              <UCheckbox
                :model-value="task.completed"
                @update:model-value="toggleTaskCompleted(task.id, $event as boolean | string | undefined)"
              />
            </div>

            <div class="space-y-4">
              <div class="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
                <UInput
                  :model-value="task.text"
                  placeholder="Task name"
                  variant="subtle"
                  class="rounded-xl"
                  @update:model-value="updateTaskText(task.id, $event as string | number | undefined)"
                />

                <USelect
                  :model-value="task.domain ?? ''"
                  :items="domainOptions"
                  variant="subtle"
                  class="rounded-xl"
                  @update:model-value="updateTaskDomain(task.id, $event as string | undefined)"
                />
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div class="space-y-2 rounded-xl border border-muted/20 bg-default/40 p-3">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                      >Urgency</span
                    >
                    <span class="text-sm font-black text-highlighted"
                      >{{ task.urgency }}/10</span
                    >
                  </div>
                  <input
                    :value="task.urgency"
                    type="range"
                    min="1"
                    max="10"
                    class="h-1.5 w-full appearance-none rounded-full bg-error/20 accent-error"
                    @input="updateTaskUrgency(task.id, getInputValue($event))"
                  />
                </div>

                <div class="space-y-2 rounded-xl border border-muted/20 bg-default/40 p-3">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                      >Importance</span
                    >
                    <span class="text-sm font-black text-highlighted"
                      >{{ task.importance }}/10</span
                    >
                  </div>
                  <input
                    :value="task.importance"
                    type="range"
                    min="1"
                    max="10"
                    class="h-1.5 w-full appearance-none rounded-full bg-primary/20 accent-primary"
                    @input="updateTaskImportance(task.id, getInputValue($event))"
                  />
                </div>
              </div>
            </div>

            <div
              class="grid gap-4 md:grid-cols-[minmax(0,0.65fr)_minmax(0,0.35fr)_auto] xl:grid-cols-1"
            >
              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 px-1">Time Estimate</label>
                <UInput
                  :model-value="String(task.estimateMinutes)"
                  type="number"
                  variant="subtle"
                  class="rounded-xl"
                  @update:model-value="updateTaskEstimate(task.id, $event as string | number | null | undefined)"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 px-1">Due Date</label>
                <UInput
                  :model-value="task.dueDate ?? ''"
                  type="date"
                  variant="subtle"
                  class="rounded-xl"
                  @update:model-value="updateTaskDueDate(task.id, $event as string | undefined)"
                />
              </div>

              <div class="flex items-end justify-end">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  class="rounded-lg hover:bg-error/10 hover:text-error"
                  size="sm"
                  @click="removeTask(task.id)"
                />
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- AI Battle Plan -->
    <section class="rounded-3xl border border-primary/20 bg-primary/5 p-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-sm font-bold text-highlighted uppercase tracking-wider">AI battle plan</h3>
          <p class="text-xs text-muted mt-1">
            The Orchestrator agent turns the current matrix into a concrete sequencing
            recommendation.
          </p>
        </div>

        <p v-if="block.battlePlanUpdatedAt" class="text-[10px] font-bold uppercase tracking-widest text-muted/60">
          Last updated {{ formatDateTime(block.battlePlanUpdatedAt) }}
        </p>
      </div>

      <div
        class="prose prose-sm dark:prose-invert mt-6 max-w-none rounded-2xl border border-muted/20 bg-default/60 p-5 text-sm leading-relaxed text-toned shadow-sm"
        v-html="
          renderSimpleMarkdown(
            block.latestBattlePlan ||
              'Run AI Prioritize to generate a battle plan from the current matrix.',
          )
        "
      />
    </section>
  </div>
</template>
