<script setup lang="ts">
import {
  getTaskListProgress,
  type WorkspaceTaskDomain,
  type WorkspaceTaskListBlock,
  type WorkspaceTaskPriority,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceTaskListBlock;
  tabId: string;
}>();

const { priorityOptions, domainOptions, addTask, mutateTask, removeTask, getPriorityBadgeClass } =
  useWorkspaceNodeEditorContext();

const progress = computed(() => getTaskListProgress(props.block));

const expandedTaskId = ref<string | null>(null);

function toggleTask(taskId: string) {
  expandedTaskId.value = expandedTaskId.value === taskId ? null : taskId;
}

function toTaskPriority(value: string): WorkspaceTaskPriority | null {
  return value === "low" || value === "medium" || value === "high" ? value : null;
}

function toTaskDomain(value: string): WorkspaceTaskDomain | null {
  const validDomains = [
    "strategy",
    "people",
    "sales",
    "content",
    "brand",
    "finance",
    "education",
    "orchestrator",
  ];
  return validDomains.includes(value) ? (value as WorkspaceTaskDomain) : null;
}

function clampTenPointScale(value: string) {
  const numeric = Number(value || 5);
  return Math.min(10, Math.max(1, Math.round(numeric)));
}

function clampEstimate(value: string) {
  const numeric = Number(value || 0);
  return Math.min(1440, Math.max(0, Math.round(numeric)));
}

function getCheckedValue(event: Event) {
  return (event.target as HTMLInputElement | null)?.checked ?? false;
}

function getInputValue(event: Event) {
  return (event.target as HTMLInputElement | null)?.value ?? "";
}

function getSelectValue(event: Event) {
  return (event.target as HTMLSelectElement | null)?.value ?? "";
}
</script>

<template>
  <div class="space-y-6">
    <!-- Progress Header -->
    <div class="flex items-center gap-6 rounded-3xl border border-muted/20 bg-elevated/10 p-5">
      <div
        class="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
      >
        <span class="text-xl sm:text-2xl font-black tracking-tight"
          >{{ Math.round((progress.completed / Math.max(progress.total, 1)) * 100) }}%</span
        >
      </div>

      <div class="flex-1 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
            Task Completion
          </p>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40">
            {{ progress.completed }} / {{ progress.total }}
          </p>
        </div>
        <UProgress
          :model-value="progress.completed"
          :max="Math.max(progress.total, 1)"
          size="sm"
          class="rounded-full"
        />
      </div>
    </div>

    <!-- Task List -->
    <div class="space-y-2">
      <div
        v-for="task in block.tasks"
        :key="task.id"
        class="group flex flex-col overflow-hidden rounded-2xl border border-muted/20 bg-default/40 transition-all hover:border-primary/20 hover:bg-default/60"
        :class="{ 'ring-1 ring-primary/30': expandedTaskId === task.id }"
      >
        <!-- Task Main Row -->
        <div class="flex items-center gap-3 p-3">
          <UCheckbox
            :model-value="task.completed"
            class="size-5 shrink-0"
            @update:model-value="
              mutateTask(tabId, block.id, task.id, (entry) => {
                entry.completed = !!$event;
              })
            "
          />

          <UInput
            :model-value="task.text"
            variant="none"
            placeholder="What needs to be done?"
            class="flex-1"
            :ui="{
              base: 'px-0 font-medium text-highlighted placeholder:text-muted/50 transition-all',
            }"
            @update:model-value="
              mutateTask(tabId, block.id, task.id, (entry) => {
                entry.text = ($event ?? '').slice(0, 240);
              })
            "
          />

          <div class="flex items-center gap-1">
            <UBadge
              v-if="task.priority"
              variant="subtle"
              :class="getPriorityBadgeClass(task.priority)"
              class="rounded-lg text-[9px] font-bold uppercase tracking-wider"
            >
              {{ task.priority }}
            </UBadge>

            <UButton
              color="neutral"
              variant="ghost"
              :icon="expandedTaskId === task.id ? 'i-lucide-chevron-up' : 'i-lucide-settings-2'"
              size="xs"
              class="rounded-lg opacity-0 group-hover:opacity-100"
              @click="toggleTask(task.id)"
            />

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              size="xs"
              class="rounded-lg opacity-0 hover:text-error group-hover:opacity-100"
              @click="removeTask(tabId, block.id, task.id)"
            />
          </div>
        </div>

        <!-- Task Details Panel -->
        <div
          v-if="expandedTaskId === task.id"
          class="grid gap-6 border-t border-muted/10 bg-elevated/5 p-5 transition-all lg:grid-cols-2"
        >
          <div class="space-y-4">
            <UFormField size="sm">
              <template #label>
                <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                  >Due Date</span
                >
              </template>
              <UInput
                :model-value="task.dueDate ?? ''"
                type="date"
                icon="i-lucide-calendar"
                class="rounded-xl"
                @update:model-value="
                  mutateTask(tabId, block.id, task.id, (entry) => {
                    entry.dueDate = $event || null;
                  })
                "
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-3">
              <UFormField size="sm">
                <template #label>
                  <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >Priority</span
                  >
                </template>
                <USelect
                  :model-value="task.priority ?? ''"
                  :items="priorityOptions"
                  class="rounded-xl"
                  @update:model-value="
                    mutateTask(tabId, block.id, task.id, (entry) => {
                      entry.priority = toTaskPriority($event);
                    })
                  "
                />
              </UFormField>

              <UFormField size="sm">
                <template #label>
                  <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >Domain</span
                  >
                </template>
                <USelect
                  :model-value="task.domain ?? ''"
                  :items="domainOptions"
                  class="rounded-xl"
                  @update:model-value="
                    mutateTask(tabId, block.id, task.id, (entry) => {
                      entry.domain = toTaskDomain($event);
                    })
                  "
                />
              </UFormField>
            </div>
          </div>

          <div class="space-y-5">
            <div class="grid grid-cols-2 gap-6">
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >Urgency</span
                  >
                  <span class="text-xs font-black text-primary">{{ task.urgency }}</span>
                </div>
                <input
                  :value="task.urgency"
                  type="range"
                  min="1"
                  max="10"
                  class="h-1.5 w-full appearance-none rounded-full bg-muted/20 accent-primary"
                  @input="
                    mutateTask(tabId, block.id, task.id, (entry) => {
                      entry.urgency = clampTenPointScale(getInputValue($event));
                    })
                  "
                />
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >Importance</span
                  >
                  <span class="text-xs font-black text-primary">{{ task.importance }}</span>
                </div>
                <input
                  :value="task.importance"
                  type="range"
                  min="1"
                  max="10"
                  class="h-1.5 w-full appearance-none rounded-full bg-muted/20 accent-primary"
                  @input="
                    mutateTask(tabId, block.id, task.id, (entry) => {
                      entry.importance = clampTenPointScale(getInputValue($event));
                    })
                  "
                />
              </div>
            </div>

            <UFormField size="sm">
              <template #label>
                <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                  >Estimate (min)</span
                >
              </template>
              <UInput
                :model-value="String(task.estimateMinutes)"
                type="number"
                min="0"
                step="5"
                icon="i-lucide-clock"
                class="rounded-xl font-mono font-bold"
                @update:model-value="
                  mutateTask(tabId, block.id, task.id, (entry) => {
                    entry.estimateMinutes = clampEstimate($event ?? '0');
                  })
                "
              />
            </UFormField>
          </div>
        </div>
      </div>

      <div
        v-if="block.tasks.length === 0"
        class="rounded-3xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center"
      >
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
          No tasks added yet
        </p>
      </div>
    </div>

    <UButton
      color="primary"
      variant="soft"
      icon="i-lucide-plus"
      class="w-full rounded-2xl py-3 text-sm font-bold shadow-sm"
      @click="addTask(tabId, block.id)"
    >
      Create Task
    </UButton>
  </div>
</template>
