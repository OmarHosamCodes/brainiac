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

const {
    priorityOptions,
    domainOptions,
    addTask,
    mutateTask,
    removeTask,
    getPriorityBadgeClass,
} = useWorkspaceNodeEditorContext();

const progress = computed(() => getTaskListProgress(props.block));

function toTaskPriority(value: string): WorkspaceTaskPriority | null {
    return value === "low" || value === "medium" || value === "high"
        ? value
        : null;
}

function toTaskDomain(value: string): WorkspaceTaskDomain | null {
    return value === "strategy" ||
        value === "people" ||
        value === "sales" ||
        value === "content" ||
        value === "brand" ||
        value === "finance" ||
        value === "education" ||
        value === "orchestrator"
        ? value
        : null;
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
    <div
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-muted/60 bg-elevated/40 p-4"
    >
        <div>
            <p class="text-sm font-medium text-highlighted">Progress</p>
            <p class="text-sm text-muted">
                {{ progress.completed }}/{{ progress.total }} tasks complete
            </p>
        </div>

        <div class="min-w-[220px] flex-1">
            <UProgress
                :model-value="progress.completed"
                :max="Math.max(progress.total, 1)"
                status
            />
        </div>
    </div>

    <div class="space-y-3">
        <div
            v-for="task in block.tasks"
            :key="task.id"
            class="space-y-4 rounded-2xl border border-muted/60 bg-default p-4"
        >
            <div
                class="grid gap-3 xl:grid-cols-[auto_minmax(0,1fr)_150px_120px_160px_auto]"
            >
                <label class="mt-2 flex items-start justify-center">
                    <input
                        :checked="task.completed"
                        type="checkbox"
                        class="size-4 rounded border border-muted/80 text-primary focus:ring-primary"
                        @change="
                            mutateTask(tabId, block.id, task.id, (entry) => {
                                entry.completed = getCheckedValue($event);
                            })
                        "
                    />
                </label>

                <UInput
                    :model-value="task.text"
                    placeholder="Task description"
                    @update:model-value="
                        mutateTask(tabId, block.id, task.id, (entry) => {
                            entry.text = ($event ?? '').slice(0, 240);
                        })
                    "
                />

                <input
                    :value="task.dueDate ?? ''"
                    type="date"
                    class="w-full rounded-xl border border-muted bg-default px-3 py-2 text-sm text-default outline-none ring-inset transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    @change="
                        mutateTask(tabId, block.id, task.id, (entry) => {
                            const value = getInputValue($event);
                            entry.dueDate = value || null;
                        })
                    "
                />

                <select
                    :value="task.priority ?? ''"
                    class="w-full rounded-xl border border-muted bg-default px-3 py-2 text-sm text-default outline-none ring-inset transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    @change="
                        mutateTask(tabId, block.id, task.id, (entry) => {
                            entry.priority = toTaskPriority(
                                getSelectValue($event),
                            );
                        })
                    "
                >
                    <option
                        v-for="option in priorityOptions"
                        :key="option.label"
                        :value="option.value"
                    >
                        {{ option.label }}
                    </option>
                </select>

                <select
                    :value="task.domain ?? ''"
                    class="w-full rounded-xl border border-muted bg-default px-3 py-2 text-sm text-default outline-none ring-inset transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    @change="
                        mutateTask(tabId, block.id, task.id, (entry) => {
                            entry.domain = toTaskDomain(getSelectValue($event));
                        })
                    "
                >
                    <option
                        v-for="option in domainOptions"
                        :key="option.label"
                        :value="option.value"
                    >
                        {{ option.label }}
                    </option>
                </select>

                <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-x"
                    @click="removeTask(tabId, block.id, task.id)"
                />
            </div>

            <div class="grid gap-3 md:grid-cols-3">
                <div
                    class="rounded-2xl border border-muted/60 bg-elevated/20 p-3"
                >
                    <div class="flex items-center justify-between gap-3">
                        <span
                            class="text-xs font-medium uppercase tracking-[0.15em] text-muted"
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
                        class="mt-3 w-full accent-primary"
                        @input="
                            mutateTask(tabId, block.id, task.id, (entry) => {
                                entry.urgency = clampTenPointScale(
                                    getInputValue($event),
                                );
                            })
                        "
                    />
                </div>

                <div
                    class="rounded-2xl border border-muted/60 bg-elevated/20 p-3"
                >
                    <div class="flex items-center justify-between gap-3">
                        <span
                            class="text-xs font-medium uppercase tracking-[0.15em] text-muted"
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
                        class="mt-3 w-full accent-primary"
                        @input="
                            mutateTask(tabId, block.id, task.id, (entry) => {
                                entry.importance = clampTenPointScale(
                                    getInputValue($event),
                                );
                            })
                        "
                    />
                </div>

                <div
                    class="rounded-2xl border border-muted/60 bg-elevated/20 p-3"
                >
                    <div class="flex items-center justify-between gap-3">
                        <span
                            class="text-xs font-medium uppercase tracking-[0.15em] text-muted"
                            >Estimate</span
                        >
                        <span class="text-sm font-semibold text-highlighted"
                            >{{ task.estimateMinutes }} min</span
                        >
                    </div>
                    <input
                        :value="task.estimateMinutes"
                        type="number"
                        min="0"
                        max="1440"
                        step="5"
                        class="mt-3 w-full rounded-xl border border-muted bg-default px-3 py-2 text-sm text-default outline-none ring-inset transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        @change="
                            mutateTask(tabId, block.id, task.id, (entry) => {
                                entry.estimateMinutes = clampEstimate(
                                    getInputValue($event),
                                );
                            })
                        "
                    />
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                <UBadge
                    color="neutral"
                    variant="subtle"
                    :class="getPriorityBadgeClass(task.priority)"
                >
                    {{ task.priority || "No priority" }}
                </UBadge>
                <UBadge color="neutral" variant="soft">
                    {{ task.domain || "Unassigned" }}
                </UBadge>
                <UBadge color="neutral" variant="soft"
                    >U{{ task.urgency }}</UBadge
                >
                <UBadge color="neutral" variant="soft"
                    >I{{ task.importance }}</UBadge
                >
                <span v-if="task.dueDate">Due {{ task.dueDate }}</span>
            </div>
        </div>
    </div>

    <UButton
        color="neutral"
        variant="soft"
        icon="i-lucide-plus"
        @click="addTask(tabId, block.id)"
    >
        Add task
    </UButton>
</template>
