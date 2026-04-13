<script setup lang="ts">
import {
    collectWorkspaceNodeTasks,
    getWorkspaceTaskDomainLabel,
    type WorkspaceCollectedTask,
    type WorkspaceNode,
    type WorkspaceTaskDomain,
} from "@brainiac/workspace";

import { getEligibleConnectionTargetIds } from "~/utils/workspace-node-connections";

const props = defineProps<{
    open: boolean;
    orchestratorNode: WorkspaceNode;
    allNodes: WorkspaceNode[];
}>();

const emit = defineEmits<{
    "update:open": [value: boolean];
    connect: [standardNodeId: string];
    disconnect: [standardNodeId: string];
    "mutate-task": [
        item: WorkspaceCollectedTask,
        mutator: (task: WorkspaceCollectedTask["task"]) => void,
    ];
    "remove-task": [item: WorkspaceCollectedTask];
    "add-task": [sourceNodeId: string];
    "navigate-to-source": [sourceNodeId: string];
}>();

type GroupMode = "source" | "domain" | "flat";

const groupMode = ref<GroupMode>("source");
const addSourceOpen = ref(false);
const selectedSourceId = ref<string | undefined>(undefined);

const connectedNodes = computed(() => {
    const nodeById = new Map(props.allNodes.map((n) => [n.id, n]));

    return props.orchestratorNode.connections.flatMap((connection) => {
        const target = nodeById.get(connection.targetNodeId);

        if (!target || target.nodeType === "orchestrator") {
            return [];
        }

        return [target];
    });
});

const collectedTasks = computed(() =>
    collectWorkspaceNodeTasks(props.orchestratorNode, props.allNodes).filter(
        ({ task }) => !task.completed,
    ),
);

const eligibleNodeIds = computed(() =>
    getEligibleConnectionTargetIds(props.allNodes, props.orchestratorNode.id),
);

const eligibleNodeOptions = computed(() =>
    eligibleNodeIds.value.flatMap((id) => {
        const node = props.allNodes.find((n) => n.id === id);

        if (!node) {
            return [];
        }

        return [{ label: node.title || "Untitled node", value: node.id }];
    }),
);

function sourceHasTaskBlocks(sourceNode: WorkspaceNode) {
    return sourceNode.tabs.some((tab) =>
        tab.blocks.some(
            (block) =>
                block.type === "task-list" ||
                block.type === "eisenhower-matrix",
        ),
    );
}

function getSourceTaskCount(sourceNodeId: string) {
    return collectedTasks.value.filter(
        (item) => item.sourceNodeId === sourceNodeId,
    ).length;
}

function getSourceBlockCount(sourceNode: WorkspaceNode) {
    return sourceNode.tabs.reduce(
        (count, tab) =>
            count +
            tab.blocks.filter(
                (block) =>
                    block.type === "task-list" ||
                    block.type === "eisenhower-matrix" ||
                    block.type === "content-pipeline",
            ).length,
        0,
    );
}

type TaskGroup = {
    key: string;
    label: string;
    sourceNodeId: string | null;
    items: WorkspaceCollectedTask[];
};

const groupedTasks = computed<TaskGroup[]>(() => {
    const tasks = collectedTasks.value;

    if (groupMode.value === "flat") {
        return [
            {
                key: "all",
                label: "All Tasks",
                sourceNodeId: null,
                items: tasks,
            },
        ];
    }

    if (groupMode.value === "domain") {
        const byDomain = new Map<string, WorkspaceCollectedTask[]>();

        for (const item of tasks) {
            const domain = item.task.domain ?? "unassigned";
            const group = byDomain.get(domain);

            if (group) {
                group.push(item);
            } else {
                byDomain.set(domain, [item]);
            }
        }

        return Array.from(byDomain.entries()).map(([domain, items]) => ({
            key: domain,
            label:
                domain === "unassigned"
                    ? "Unassigned"
                    : getWorkspaceTaskDomainLabel(
                          domain as WorkspaceTaskDomain,
                      ),
            sourceNodeId: null,
            items,
        }));
    }

    const bySource = new Map<string, WorkspaceCollectedTask[]>();

    for (const item of tasks) {
        const group = bySource.get(item.sourceNodeId);

        if (group) {
            group.push(item);
        } else {
            bySource.set(item.sourceNodeId, [item]);
        }
    }

    return Array.from(bySource.entries()).map(([nodeId, items]) => ({
        key: nodeId,
        label: items[0]?.sourceNodeTitle ?? "Unknown",
        sourceNodeId: nodeId,
        items,
    }));
});

function handleAddSource() {
    if (!selectedSourceId.value) return;
    emit("connect", selectedSourceId.value);
    selectedSourceId.value = undefined;
    addSourceOpen.value = false;
}

function handleDisconnect(nodeId: string) {
    emit("disconnect", nodeId);
}

function toggleCompletion(item: WorkspaceCollectedTask) {
    emit("mutate-task", item, (task) => {
        task.completed = !task.completed;
    });
}

function setPriority(
    item: WorkspaceCollectedTask,
    priority: "low" | "medium" | "high",
) {
    emit("mutate-task", item, (task) => {
        task.priority = priority;
    });
}

function handleDeleteTask(item: WorkspaceCollectedTask) {
    emit("remove-task", item);
}

function handleAddTask(sourceNodeId: string) {
    emit("add-task", sourceNodeId);
}

function handleNavigate(sourceNodeId: string) {
    emit("update:open", false);
    emit("navigate-to-source", sourceNodeId);
}

function canEditPriority(item: WorkspaceCollectedTask) {
    return item.blockType !== "content-pipeline";
}

function closeModal() {
    emit("update:open", false);
}

const priorityMenuItems = (item: WorkspaceCollectedTask) => [
    [
        {
            label: "High",
            icon: "i-lucide-arrow-up",
            onSelect: () => setPriority(item, "high"),
        },
        {
            label: "Medium",
            icon: "i-lucide-minus",
            onSelect: () => setPriority(item, "medium"),
        },
        {
            label: "Low",
            icon: "i-lucide-arrow-down",
            onSelect: () => setPriority(item, "low"),
        },
    ],
];
</script>

<template>
    <UModal
        :open="open"
        title="Manage Sources"
        description="Connect source nodes, browse and manage tasks across all connected sources."
        :ui="{
            content: 'sm:max-w-3xl',
            body: 'space-y-6 max-h-[70vh] overflow-y-auto',
        }"
        @update:open="closeModal"
    >
        <template #body>
            <!-- Connected Sources Section -->
            <section>
                <div class="flex items-center justify-between gap-3">
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >
                        Connected Sources
                    </p>
                    <UBadge
                        color="neutral"
                        variant="soft"
                        size="sm"
                        class="rounded-2xl"
                    >
                        {{ connectedNodes.length }} source{{
                            connectedNodes.length === 1 ? "" : "s"
                        }}
                    </UBadge>
                </div>

                <div
                    v-if="connectedNodes.length === 0"
                    class="mt-3 rounded-2xl border border-dashed border-muted/20 bg-elevated/5 py-8 text-center"
                >
                    <UIcon
                        name="i-lucide-plug-2"
                        class="mx-auto size-8 text-muted/30"
                    />
                    <p class="mt-2 text-sm text-muted">
                        No sources connected. Add a node to start aggregating
                        tasks.
                    </p>
                </div>

                <ul v-else class="mt-3 space-y-2">
                    <li
                        v-for="source in connectedNodes"
                        :key="source.id"
                        class="flex items-center justify-between gap-3 rounded-2xl border border-muted/20 bg-elevated/10 px-4 py-3"
                    >
                        <div class="flex min-w-0 items-center gap-3">
                            <UIcon
                                name="i-lucide-box"
                                class="size-4 shrink-0 text-muted/60"
                            />
                            <button
                                type="button"
                                class="min-w-0 truncate text-sm font-bold text-highlighted hover:text-primary transition-colors"
                                :title="`Open ${source.title || 'Untitled node'}`"
                                @click="handleNavigate(source.id)"
                            >
                                {{ source.title || "Untitled node" }}
                            </button>
                        </div>
                        <div class="flex items-center gap-2">
                            <UBadge
                                color="primary"
                                variant="soft"
                                size="sm"
                                class="rounded-lg"
                            >
                                {{ getSourceTaskCount(source.id) }} task{{
                                    getSourceTaskCount(source.id) === 1
                                        ? ""
                                        : "s"
                                }}
                            </UBadge>
                            <UBadge
                                color="neutral"
                                variant="soft"
                                size="sm"
                                class="rounded-lg"
                            >
                                {{ getSourceBlockCount(source) }} block{{
                                    getSourceBlockCount(source) === 1
                                        ? ""
                                        : "s"
                                }}
                            </UBadge>
                            <UButton
                                color="error"
                                variant="ghost"
                                size="xs"
                                icon="i-lucide-unlink"
                                class="rounded-lg"
                                aria-label="Disconnect source"
                                @click="handleDisconnect(source.id)"
                            />
                        </div>
                    </li>
                </ul>

                <!-- Add Source -->
                <div class="mt-3">
                    <div v-if="addSourceOpen" class="flex items-center gap-2">
                        <USelectMenu
                            v-model="selectedSourceId"
                            :items="eligibleNodeOptions"
                            value-key="value"
                            placeholder="Select a node…"
                            class="flex-1"
                        />
                        <UButton
                            color="primary"
                            variant="soft"
                            size="sm"
                            icon="i-lucide-plus"
                            class="rounded-xl"
                            :disabled="!selectedSourceId"
                            aria-label="Confirm add source"
                            @click="handleAddSource"
                        >
                            Add
                        </UButton>
                        <UButton
                            color="neutral"
                            variant="ghost"
                            size="sm"
                            icon="i-lucide-x"
                            class="rounded-xl"
                            aria-label="Cancel add source"
                            @click="addSourceOpen = false"
                        />
                    </div>
                    <UButton
                        v-else
                        color="neutral"
                        variant="soft"
                        size="sm"
                        icon="i-lucide-plus"
                        class="rounded-xl"
                        :disabled="eligibleNodeOptions.length === 0"
                        @click="addSourceOpen = true"
                    >
                        Add Source
                    </UButton>
                </div>
            </section>

            <!-- Separator -->
            <div class="border-t border-muted/10" />

            <!-- Task Browser Section -->
            <section>
                <div
                    class="flex flex-wrap items-center justify-between gap-3"
                >
                    <p
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >
                        Task Browser
                    </p>
                    <div class="flex items-center gap-1">
                        <UButton
                            v-for="mode in [
                                {
                                    key: 'source' as GroupMode,
                                    label: 'By Source',
                                    icon: 'i-lucide-box',
                                },
                                {
                                    key: 'domain' as GroupMode,
                                    label: 'By Domain',
                                    icon: 'i-lucide-layers',
                                },
                                {
                                    key: 'flat' as GroupMode,
                                    label: 'All',
                                    icon: 'i-lucide-list',
                                },
                            ]"
                            :key="mode.key"
                            size="xs"
                            :color="
                                groupMode === mode.key ? 'primary' : 'neutral'
                            "
                            :variant="
                                groupMode === mode.key ? 'soft' : 'ghost'
                            "
                            :icon="mode.icon"
                            class="rounded-lg"
                            :aria-pressed="groupMode === mode.key"
                            @click="groupMode = mode.key"
                        >
                            {{ mode.label }}
                        </UButton>
                    </div>
                </div>

                <div
                    v-if="collectedTasks.length === 0"
                    class="mt-3 rounded-2xl border border-dashed border-muted/20 bg-elevated/5 py-8 text-center"
                >
                    <UIcon
                        name="i-lucide-inbox"
                        class="mx-auto size-8 text-muted/30"
                    />
                    <p class="mt-2 text-sm text-muted">
                        No tasks found. Connected sources don't contain any
                        open tasks yet.
                    </p>
                </div>

                <div v-else class="mt-3 space-y-4">
                    <div
                        v-for="group in groupedTasks"
                        :key="group.key"
                        class="rounded-2xl border border-muted/20 bg-elevated/5"
                    >
                        <!-- Group Header -->
                        <div
                            class="flex items-center justify-between gap-3 px-4 py-3"
                        >
                            <div class="flex items-center gap-2">
                                <p
                                    class="text-sm font-bold text-highlighted"
                                >
                                    {{ group.label }}
                                </p>
                                <UBadge
                                    color="neutral"
                                    variant="soft"
                                    size="sm"
                                    class="rounded-lg"
                                >
                                    {{ group.items.length }}
                                </UBadge>
                            </div>
                            <UButton
                                v-if="
                                    group.sourceNodeId &&
                                    sourceHasTaskBlocks(
                                        allNodes.find(
                                            (n) =>
                                                n.id === group.sourceNodeId,
                                        )!,
                                    )
                                "
                                size="xs"
                                color="primary"
                                variant="ghost"
                                icon="i-lucide-plus"
                                class="rounded-lg"
                                aria-label="Add task to this source"
                                @click="handleAddTask(group.sourceNodeId!)"
                            />
                        </div>

                        <!-- Task Rows -->
                        <ul class="border-t border-muted/10">
                            <li
                                v-for="item in group.items"
                                :key="item.task.id"
                                class="flex items-center gap-3 border-b border-muted/10 px-4 py-2.5 last:border-b-0"
                            >
                                <!-- Completion Toggle -->
                                <button
                                    type="button"
                                    class="flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors"
                                    :class="
                                        item.task.completed
                                            ? 'border-primary bg-primary/20 text-primary'
                                            : 'border-muted/30 hover:border-primary/50'
                                    "
                                    :aria-label="
                                        item.task.completed
                                            ? 'Reopen task'
                                            : 'Complete task'
                                    "
                                    @click="toggleCompletion(item)"
                                >
                                    <UIcon
                                        v-if="item.task.completed"
                                        name="i-lucide-check"
                                        class="size-3"
                                    />
                                </button>

                                <!-- Task Text -->
                                <p
                                    class="min-w-0 flex-1 truncate text-sm"
                                    :class="
                                        item.task.completed
                                            ? 'text-muted line-through'
                                            : 'text-highlighted'
                                    "
                                >
                                    {{ item.task.text || "Untitled task" }}
                                </p>

                                <!-- Priority Dropdown -->
                                <UDropdownMenu
                                    v-if="canEditPriority(item)"
                                    :items="priorityMenuItems(item)"
                                >
                                    <UButton
                                        size="xs"
                                        variant="ghost"
                                        class="rounded-lg"
                                        :color="
                                            item.task.priority === 'high'
                                                ? 'error'
                                                : item.task.priority ===
                                                    'medium'
                                                  ? 'warning'
                                                  : 'neutral'
                                        "
                                    >
                                        {{
                                            item.task.priority
                                                ? item.task.priority
                                                      .charAt(0)
                                                      .toUpperCase() +
                                                  item.task.priority.slice(1)
                                                : "—"
                                        }}
                                    </UButton>
                                </UDropdownMenu>
                                <UButton
                                    v-else
                                    size="xs"
                                    variant="ghost"
                                    color="neutral"
                                    class="rounded-lg"
                                    disabled
                                    :title="
                                        'Priority is derived from content pipeline status and cannot be changed here.'
                                    "
                                >
                                    {{
                                        item.task.priority
                                            ? item.task.priority
                                                  .charAt(0)
                                                  .toUpperCase() +
                                              item.task.priority.slice(1)
                                            : "Derived"
                                    }}
                                </UButton>

                                <!-- Source Badge (clickable → navigate) -->
                                <button
                                    v-if="groupMode !== 'source'"
                                    type="button"
                                    class="max-w-28 truncate rounded-lg bg-elevated/20 px-2 py-0.5 text-[10px] font-bold text-muted/60 transition-colors hover:text-primary"
                                    :title="`Go to ${item.sourceNodeTitle}`"
                                    @click="
                                        handleNavigate(item.sourceNodeId)
                                    "
                                >
                                    {{ item.sourceNodeTitle }}
                                </button>

                                <!-- Delete -->
                                <UButton
                                    size="xs"
                                    color="error"
                                    variant="ghost"
                                    icon="i-lucide-trash-2"
                                    class="rounded-lg"
                                    aria-label="Delete task"
                                    @click="handleDeleteTask(item)"
                                />
                            </li>
                        </ul>
                    </div>
                </div>
            </section>
        </template>

        <template #footer>
            <UButton
                color="neutral"
                variant="ghost"
                class="rounded-xl"
                @click="closeModal"
            >
                Close
            </UButton>
        </template>
    </UModal>
</template>
