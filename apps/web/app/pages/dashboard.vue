<script setup lang="ts">
definePageMeta({
    middleware: ["auth"],
});

const {
    authSession,
    closeEditor,
    editorMode,
    editorOpen,
    isDraftValid,
    nodeDraft,
    nodes,
    openCreateNode,
    openEditNode,
    openNodePage,
    removeNode,
    saveBadge,
    saveError,
    selectedNodeIds,
    submitNodeEditor,
    workspaceQuery,
} = useWorkspaceBoard();
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
                        <WorkspaceNodeCard
                            :content="node.content"
                            :selected="selected"
                        />
                    </template>
                </InfiniteCanvas>
            </div>

            <WorkspaceBoardStatus
                :badge="saveBadge"
                :nodes-count="nodes.length"
                :user-name="authSession.value?.data?.user?.name"
            />

            <UAlert
                v-if="saveError"
                color="error"
                variant="soft"
                icon="i-lucide-cloud-off"
                title="Unable to persist workspace"
                :description="saveError"
            />
        </div>

        <WorkspaceEditorModal
            :content="nodeDraft.content"
            :mode="editorMode"
            :open="editorOpen"
            :title="nodeDraft.title"
            :valid="isDraftValid"
            @close="closeEditor"
            @submit="submitNodeEditor"
            @update:content="nodeDraft.content = $event"
            @update:title="nodeDraft.title = $event"
        />
    </div>
</template>
