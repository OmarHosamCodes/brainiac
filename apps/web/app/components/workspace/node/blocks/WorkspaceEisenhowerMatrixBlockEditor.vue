<script setup lang="ts">
import {
  buildEisenhowerBattlePlanPrompt,
  createWorkspaceTask,
  getEisenhowerMatrixSummary,
  getWorkspaceTaskDomainLabel,
  type WorkspaceTask,
  type WorkspaceTaskDomain,
  type WorkspaceTaskQuadrant,
  type WorkspaceEisenhowerMatrixBlock,
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
const { domainOptions, mutateBlock, runBlockAgentPrompt } = useWorkspaceNodeEditorContext();

const summary = computed(() => getEisenhowerMatrixSummary(props.block));
const isPrioritizing = ref(false);

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

function toTaskDomain(value: string) {
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

function mutateTask(taskId: string, mutator: (task: WorkspaceTask) => void) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "eisenhower-matrix") {
      return;
    }

    const task = block.tasks.find((entry) => entry.id === taskId);

    if (!task) {
      return;
    }

    mutator(task);
  });
}

function addTask() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "eisenhower-matrix") {
      return;
    }

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
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "eisenhower-matrix") {
      return;
    }

    block.tasks = block.tasks.filter((task) => task.id !== taskId);
  });
}

async function prioritizeWithAi() {
  if (props.block.tasks.length === 0) {
    return;
  }

  isPrioritizing.value = true;

  try {
    const response = await runBlockAgentPrompt(
      props.tabId,
      props.block.id,
      buildEisenhowerBattlePlanPrompt(props.block),
    );

    mutateBlock(props.tabId, props.block.id, (block, _tab, _node, timestamp) => {
      if (block.type !== "eisenhower-matrix") {
        return;
      }

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
  } finally {
    isPrioritizing.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">
          Total Task Time
        </p>
        <p class="mt-2 text-3xl font-black tracking-tight text-primary">
          {{ formatDuration(summary.totalEstimateMinutes) }}
        </p>
      </div>

      <div class="rounded-[28px] bg-error/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-error/70">Overdue</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-error">{{ summary.overdueCount }}</p>
      </div>

      <div class="rounded-[28px] bg-success/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-success/70">Completed</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-success">
          {{ summary.completedCount }}
        </p>
      </div>

      <div class="rounded-[28px] bg-secondary/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary/80">
          Active Domains
        </p>
        <p class="mt-2 text-4xl font-black tracking-tight text-secondary">
          {{ summary.activeDomainCount }}
        </p>
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-2">
      <article
        v-for="quadrant in quadrantMeta"
        :key="quadrant.key"
        class="rounded-[32px] border p-5"
        :class="quadrant.className"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">
              {{ quadrant.label }}
            </p>
            <p class="mt-1 text-sm text-muted">{{ quadrant.description }}</p>
          </div>

          <div class="text-right">
            <p class="text-2xl font-black tracking-tight text-highlighted">
              {{ summary.quadrants[quadrant.key].taskCount }}
            </p>
            <p class="text-xs text-muted">
              {{ formatDuration(summary.quadrants[quadrant.key].estimateMinutes) }}
            </p>
          </div>
        </div>

        <div
          v-if="summary.quadrants[quadrant.key].tasks.length === 0"
          class="mt-4 rounded-[24px] border border-dashed border-muted/40 bg-default/50 px-4 py-8 text-center text-sm font-medium text-muted"
        >
          No tasks in this quadrant.
        </div>

        <div v-else class="mt-4 space-y-3">
          <article
            v-for="task in summary.quadrants[quadrant.key].tasks"
            :key="task.id"
            class="rounded-[24px] border border-muted/25 bg-default/70 p-4"
          >
            <div class="flex items-start gap-3">
              <UCheckbox
                :model-value="task.completed"
                class="mt-1"
                @update:model-value="
                  mutateTask(task.id, (entry) => {
                    entry.completed = !!$event;
                  })
                "
              />

              <div class="min-w-0 flex-1 space-y-2">
                <p class="font-semibold text-highlighted">{{ task.text }}</p>
                <div class="flex flex-wrap gap-2">
                  <UBadge :class="getDomainPillClass(task.domain)" variant="subtle" size="sm">
                    {{ getWorkspaceTaskDomainLabel(task.domain) }}
                  </UBadge>
                  <UBadge color="neutral" variant="soft" size="sm">
                    {{ formatDuration(task.estimateMinutes) }}
                  </UBadge>
                  <UBadge v-if="isOverdue(task)" color="error" variant="soft" size="sm">
                    Overdue
                  </UBadge>
                </div>
              </div>
            </div>
          </article>
        </div>
      </article>
    </div>

    <section class="rounded-[32px] border border-muted/30 bg-default/70 p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-highlighted">Domain time allocation</p>
          <p class="text-sm text-muted">
            Open task load is grouped by domain so time concentration is visible at a glance.
          </p>
        </div>
      </div>

      <div
        v-if="summary.domainAllocation.length === 0"
        class="mt-4 rounded-[24px] border border-dashed border-muted/40 bg-elevated/15 px-4 py-8 text-center text-sm font-medium text-muted"
      >
        No open task load yet.
      </div>

      <div v-else class="mt-4 space-y-4">
        <div
          v-for="allocation in summary.domainAllocation"
          :key="allocation.domain ?? 'unassigned'"
        >
          <div class="mb-2 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-highlighted">{{ allocation.label }}</span>
              <UBadge :class="getDomainPillClass(allocation.domain)" variant="subtle" size="sm">
                {{ allocation.taskCount }} tasks
              </UBadge>
            </div>
            <span class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {{ formatDuration(allocation.estimateMinutes) }}
            </span>
          </div>
          <div class="h-3 overflow-hidden rounded-full bg-elevated/30">
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

    <section class="rounded-[32px] border border-muted/30 bg-default/70 p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-highlighted">Task editor</p>
          <p class="text-sm text-muted">
            Edit the task list directly and the matrix will re-sort itself instantly.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-plus"
            class="rounded-full px-4"
            @click="addTask"
          >
            Add Task
          </UButton>
          <UButton
            color="primary"
            variant="soft"
            icon="i-lucide-sparkles"
            class="rounded-full px-4"
            :disabled="block.tasks.length === 0"
            :loading="isPrioritizing"
            @click="prioritizeWithAi"
          >
            AI Prioritize
          </UButton>
        </div>
      </div>

      <div
        v-if="summary.prioritizedTasks.length === 0"
        class="mt-4 rounded-[24px] border border-dashed border-muted/40 bg-elevated/15 px-4 py-8 text-center text-sm font-medium text-muted"
      >
        No tasks to prioritize yet.
      </div>

      <div v-else class="mt-4 space-y-4">
        <article
          v-for="task in summary.prioritizedTasks"
          :key="task.id"
          class="rounded-[28px] border border-muted/25 bg-elevated/15 p-4"
        >
          <div class="grid gap-4 xl:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,0.7fr)]">
            <div class="flex items-start pt-1">
              <UCheckbox
                :model-value="task.completed"
                @update:model-value="
                  mutateTask(task.id, (entry) => {
                    entry.completed = !!$event;
                  })
                "
              />
            </div>

            <div class="space-y-4">
              <div class="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
                <UInput
                  :model-value="task.text"
                  placeholder="Task name"
                  class="rounded-2xl"
                  @update:model-value="
                    mutateTask(task.id, (entry) => {
                      entry.text = ($event ?? '').slice(0, 240);
                    })
                  "
                />

                <USelect
                  :model-value="task.domain ?? ''"
                  :items="domainOptions"
                  class="rounded-2xl"
                  @update:model-value="
                    mutateTask(task.id, (entry) => {
                      entry.domain = toTaskDomain($event);
                    })
                  "
                />
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div class="space-y-2 rounded-[22px] border border-muted/25 bg-default/70 p-3">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted"
                      >Urgency</span
                    >
                    <span class="text-sm font-semibold text-highlighted"
                      >{{ task.urgency }}/10</span
                    >
                  </div>
                  <input
                    :value="task.urgency"
                    type="range"
                    min="1"
                    max="10"
                    class="h-2 w-full appearance-none rounded-full bg-error/20 accent-error"
                    @input="
                      mutateTask(task.id, (entry) => {
                        entry.urgency = clampTenPointScale(getInputValue($event), entry.urgency);
                      })
                    "
                  />
                </div>

                <div class="space-y-2 rounded-[22px] border border-muted/25 bg-default/70 p-3">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted"
                      >Importance</span
                    >
                    <span class="text-sm font-semibold text-highlighted"
                      >{{ task.importance }}/10</span
                    >
                  </div>
                  <input
                    :value="task.importance"
                    type="range"
                    min="1"
                    max="10"
                    class="h-2 w-full appearance-none rounded-full bg-primary/20 accent-primary"
                    @input="
                      mutateTask(task.id, (entry) => {
                        entry.importance = clampTenPointScale(
                          getInputValue($event),
                          entry.importance,
                        );
                      })
                    "
                  />
                </div>
              </div>
            </div>

            <div
              class="grid gap-4 md:grid-cols-[minmax(0,0.65fr)_minmax(0,0.35fr)_auto] xl:grid-cols-1"
            >
              <UFormField label="Time Estimate" size="sm">
                <UInput
                  :model-value="String(task.estimateMinutes)"
                  type="number"
                  class="rounded-2xl"
                  @update:model-value="
                    mutateTask(task.id, (entry) => {
                      entry.estimateMinutes = clampEstimate($event, entry.estimateMinutes);
                    })
                  "
                />
              </UFormField>

              <UFormField label="Due Date" size="sm">
                <UInput
                  :model-value="task.dueDate ?? ''"
                  type="date"
                  class="rounded-2xl"
                  @update:model-value="
                    mutateTask(task.id, (entry) => {
                      entry.dueDate = $event || null;
                    })
                  "
                />
              </UFormField>

              <div class="flex items-end justify-end">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  class="rounded-xl hover:bg-error/10 hover:text-error"
                  @click="removeTask(task.id)"
                />
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="rounded-[32px] border border-primary/20 bg-primary/5 p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-highlighted">AI battle plan</p>
          <p class="text-sm text-muted">
            The Orchestrator agent turns the current matrix into a concrete sequencing
            recommendation.
          </p>
        </div>

        <p v-if="block.battlePlanUpdatedAt" class="text-xs font-medium text-muted">
          Last run {{ formatDateTime(block.battlePlanUpdatedAt) }}
        </p>
      </div>

      <div
        class="prose prose-sm dark:prose-invert mt-4 max-w-none rounded-[24px] border border-muted/30 bg-default/80 p-5 text-sm leading-7 text-toned"
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
