<script setup lang="ts">
import { useMutation, useQuery } from "@tanstack/vue-query";
import type { CanvasNodeModel } from "~/composables/useCanvas";

interface WorkspaceNode extends CanvasNodeModel {
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

const { $authClient, $orpc } = useNuxtApp();

definePageMeta({
    middleware: ["auth"],
});

const session = $authClient.useSession();

const nodes = ref<WorkspaceNode[]>([]);
const selectedNodeIds = ref<string[]>([]);
const editorOpen = ref(false);
const editorMode = ref<"create" | "edit">("create");
const activeNodeId = ref<string | null>(null);
const pendingNodePosition = ref<{ x: number; y: number } | null>(null);
const loadApplied = ref(false);
const isHydratingWorkspace = ref(false);
const saveState = ref<"idle" | "saving" | "saved" | "error">("idle");
const saveError = ref<string | null>(null);
const nodeDraft = reactive({
    title: "",
    content: "",
});

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let latestSaveRequest = 0;

const workspaceQuery = useQuery({
    ...$orpc.workspace.get.queryOptions(),
    enabled: computed(() => Boolean(session.value?.data?.user)),
    staleTime: Number.POSITIVE_INFINITY,
});

const saveWorkspace = useMutation($orpc.workspace.save.mutationOptions());

const workspaceReadyForEdits = computed(
    () =>
        Boolean(session.value?.data?.user) &&
        loadApplied.value &&
        !isHydratingWorkspace.value,
);
const editorTitle = computed(() =>
    editorMode.value === "create" ? "Create node" : "Edit node",
);
const editorDescription = computed(() =>
    editorMode.value === "create"
        ? "Define the title and content for a new workspace node."
        : "Update the selected node without leaving the canvas.",
);
const isDraftValid = computed(() => nodeDraft.title.trim().length > 0);
const saveBadge = computed(() => {
    switch (saveState.value) {
        case "saving":
            return {
                label: "Saving",
                className: "border-warning/40 bg-warning/10 text-warning",
            };
        case "saved":
            return {
                label: "Saved",
                className: "border-success/40 bg-success/10 text-success",
            };
        case "error":
            return {
                label: "Save failed",
                className: "border-error/40 bg-error/10 text-error",
            };
        default:
            return {
                label: "Ready",
                className: "border-muted/60 bg-elevated/80 text-toned",
            };
    }
});

function normalizeNode(node: WorkspaceNode): WorkspaceNode {
    return {
        ...node,
        content: node.content ?? "",
        label: node.label ?? node.title,
        minWidth: node.minWidth ?? 260,
        minHeight: node.minHeight ?? 180,
    };
}

function cloneNodes(source: WorkspaceNode[]) {
    return source.map((node) => ({ ...node }));
}

function resetDraft() {
    nodeDraft.title = "";
    nodeDraft.content = "";
}

function closeEditor() {
    editorOpen.value = false;
    activeNodeId.value = null;
    pendingNodePosition.value = null;
    resetDraft();
}

function findNode(nodeId: string) {
    return nodes.value.find((node) => node.id === nodeId) ?? null;
}

function createNodeId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function openCreateNode(payload: { x: number; y: number }) {
    if (!workspaceReadyForEdits.value) {
        return;
    }

    editorMode.value = "create";
    pendingNodePosition.value = payload;
    activeNodeId.value = null;
    resetDraft();
    editorOpen.value = true;
}

function openNodePage(payload: { nodeId: string }) {
    void navigateTo(`/node/${payload.nodeId}`);
}

function openEditNode(payload: { nodeId: string }) {
    if (!workspaceReadyForEdits.value) {
        return;
    }

    const node = findNode(payload.nodeId);

    if (!node) {
        return;
    }

    editorMode.value = "edit";
    activeNodeId.value = node.id;
    pendingNodePosition.value = null;
    nodeDraft.title = node.title;
    nodeDraft.content = node.content;
    editorOpen.value = true;
}

function removeNode(payload: { nodeId: string }) {
    if (!workspaceReadyForEdits.value) {
        return;
    }

    nodes.value = nodes.value.filter((node) => node.id !== payload.nodeId);
    selectedNodeIds.value = selectedNodeIds.value.filter(
        (nodeId) => nodeId !== payload.nodeId,
    );
}

function submitNodeEditor() {
    const title = nodeDraft.title.trim();

    if (!title) {
        return;
    }

    const content = nodeDraft.content.trim();
    const timestamp = new Date().toISOString();

    if (editorMode.value === "edit") {
        if (!activeNodeId.value) {
            return;
        }

        nodes.value = nodes.value.map((node) =>
            node.id === activeNodeId.value
                ? normalizeNode({
                      ...node,
                      title,
                      content,
                      label: title,
                      updatedAt: timestamp,
                  })
                : node,
        );

        closeEditor();
        return;
    }

    const position = pendingNodePosition.value ?? { x: 0, y: 0 };
    const nextNode = normalizeNode({
        id: createNodeId(),
        title,
        content,
        label: title,
        x: position.x - 160,
        y: position.y - 110,
        width: 320,
        height: 220,
        minWidth: 260,
        minHeight: 180,
        createdAt: timestamp,
        updatedAt: timestamp,
    });

    nodes.value = [...nodes.value, nextNode];
    selectedNodeIds.value = [nextNode.id];
    closeEditor();
}

async function persistWorkspace(snapshot: WorkspaceNode[]) {
    const requestId = ++latestSaveRequest;

    try {
        await saveWorkspace.mutateAsync({
            nodes: snapshot,
        });

        if (requestId === latestSaveRequest) {
            saveState.value = "saved";
            saveError.value = null;
        }
    } catch (error) {
        if (requestId === latestSaveRequest) {
            saveState.value = "error";
            saveError.value =
                error instanceof Error
                    ? error.message
                    : "Failed to save workspace";
        }
    }
}

function scheduleWorkspaceSave() {
    if (!workspaceReadyForEdits.value) {
        return;
    }

    if (saveTimer) {
        clearTimeout(saveTimer);
    }

    saveState.value = "saving";
    saveError.value = null;
    const snapshot = cloneNodes(nodes.value);

    saveTimer = setTimeout(() => {
        saveTimer = null;
        void persistWorkspace(snapshot);
    }, 250);
}

function formatTimestamp(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Unknown";
    }

    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

watch(
    () => workspaceQuery.data.value?.nodes,
    (remoteNodes) => {
        if (!remoteNodes) {
            return;
        }

        isHydratingWorkspace.value = true;
        nodes.value = remoteNodes.map((node) =>
            normalizeNode(node as WorkspaceNode),
        );
        selectedNodeIds.value = selectedNodeIds.value.filter((nodeId) =>
            nodes.value.some((node) => node.id === nodeId),
        );
        loadApplied.value = true;
        saveState.value = "idle";
        saveError.value = null;

        nextTick(() => {
            isHydratingWorkspace.value = false;
        });
    },
    { immediate: true },
);

watch(
    nodes,
    () => {
        if (!workspaceReadyForEdits.value) {
            return;
        }

        scheduleWorkspaceSave();
    },
    { deep: true },
);

onBeforeUnmount(() => {
    if (saveTimer) {
        clearTimeout(saveTimer);
    }
});
</script>

<template>
    <div class="h-full min-h-0 p-4 md:p-6">
        <div class="flex h-full min-h-0 flex-col gap-4">
            <UAlert
                v-if="workspaceQuery.status.value === 'error'"
                color="error"
                icon="i-lucide-alert-circle"
                title="Workspace unavailable"
                :description="
                    workspaceQuery.error.value?.message ||
                    'The user workspace could not be loaded.'
                "
            />

            <div class="min-h-0 flex-1">
                <InfiniteCanvas
                    v-model:nodes="nodes"
                    v-model:selected-node-ids="selectedNodeIds"
                    @create-node="openCreateNode"
                    @edit-node="openEditNode"
                    @remove-node="removeNode"
                    @open-node="openNodePage"
                >
                    <template #node="{ node, selected }">
                        <div
                            class="node-card flex h-full min-h-0 flex-col px-4 pb-4 pt-1"
                        >
                            <div
                                class="mb-2 flex shrink-0 items-center justify-end"
                            >
                                <span
                                    class="rounded-full border px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide"
                                    :class="
                                        selected
                                            ? 'border-primary/50 bg-primary/10 text-primary'
                                            : 'border-muted/60 bg-elevated/80 text-toned'
                                    "
                                >
                                    {{ selected ? "Selected" : "Saved" }}
                                </span>
                            </div>
                            <p
                                class="min-h-0 flex-1 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-toned"
                            >
                                {{
                                    node.content ||
                                    "No content yet. Right-click the card to edit."
                                }}
                            </p>
                        </div>
                    </template>
                </InfiniteCanvas>
            </div>

            <div
                class="pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2 px-4"
            >
                <div
                    class="pointer-events-auto flex items-center gap-3 rounded-full border border-muted/70 bg-default/90 px-4 py-2 shadow-lg shadow-black/5 backdrop-blur-md"
                >
                    <div>
                        <div
                            class="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted"
                        >
                            Workspace
                        </div>
                        <div class="text-sm font-semibold text-highlighted">
                            {{
                                session?.data?.user?.name
                                    ? `${session.data.user.name}'s board`
                                    : "Personal board"
                            }}
                        </div>
                    </div>
                    <div class="h-8 w-px bg-border" />
                    <div class="text-sm text-toned">
                        {{ nodes.length }} node{{
                            nodes.length === 1 ? "" : "s"
                        }}
                    </div>
                    <div
                        class="rounded-full border px-3 py-1 text-xs font-medium"
                        :class="saveBadge.className"
                    >
                        {{ saveBadge.label }}
                    </div>
                </div>
            </div>

            <UAlert
                v-if="saveError"
                color="error"
                variant="soft"
                icon="i-lucide-cloud-off"
                title="Unable to persist workspace"
                :description="saveError"
            />
        </div>

        <UModal
            v-model:open="editorOpen"
            :title="editorTitle"
            :description="editorDescription"
            :ui="{
                content: 'sm:max-w-lg',
                body: 'space-y-4',
                footer: 'flex items-center justify-end gap-3',
            }"
        >
            <template #body>
                <UFormField label="Title" name="title" required>
                    <UInput
                        v-model="nodeDraft.title"
                        placeholder="Strategy lane"
                        autofocus
                    />
                </UFormField>

                <UFormField
                    label="Content"
                    name="content"
                    description="Keep it concise enough to scan while navigating the board."
                >
                    <UTextarea
                        v-model="nodeDraft.content"
                        :rows="7"
                        autoresize
                        placeholder="Capture the idea, reminder, or workflow step for this node."
                    />
                </UFormField>
            </template>

            <template #footer>
                <UButton color="neutral" variant="ghost" @click="closeEditor"
                    >Cancel</UButton
                >
                <UButton
                    :disabled="!isDraftValid"
                    icon="i-lucide-save"
                    @click="submitNodeEditor"
                >
                    {{
                        editorMode === "create" ? "Create node" : "Save changes"
                    }}
                </UButton>
            </template>
        </UModal>
    </div>
</template>

<style scoped>
.node-card {
    height: 100%;
}
</style>
