<script setup lang="ts">
definePageMeta({
    middleware: ["auth", "workspace"],
});

const {
    authSession,
    closeEditor,
    editorMode,
    editorOpen,
    isDraftValid,
    isWorkspaceInitialLoading,
    isWorkspaceRefreshing,
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

            <div class="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
                <div class="flex min-h-0 flex-col gap-4">
                    <div class="min-h-0 flex-1">
                        <InfiniteCanvas
                            v-model:nodes="nodes"
                            v-model:selected-node-ids="selectedNodeIds"
                            :loading="isWorkspaceInitialLoading"
                            @create-node="openCreateNode"
                            @edit-node="openEditNode"
                            @remove-node="removeNode"
                            @open-node="openNodePage"
                        >
                            <template #node="{ node, selected }">
                                <WorkspaceNodeCard
                                    :node="node"
                                    :selected="selected"
                                />
                            </template>
                        </InfiniteCanvas>
                    </div>

                    <WorkspaceBoardStatus
                        v-if="!isWorkspaceInitialLoading"
                        :badge="saveBadge"
                        :nodes-count="nodes.length"
                        :user-name="authSession.value?.data?.user?.name"
                    />
                </div>

                <DashboardAgentChatPanel :nodes="nodes" />
            </div>

            <div
                v-if="isWorkspaceRefreshing"
                class="pointer-events-none fixed right-6 top-20 z-20"
            >
                <div
                    class="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-muted/70 bg-default/90 px-3 py-2 text-xs font-medium text-toned shadow-lg shadow-black/5 backdrop-blur-md"
                >
                    <UIcon
                        name="i-lucide-loader-2"
                        class="size-3.5 animate-spin text-primary"
                    />
                    Refreshing workspace
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
