<script setup lang="ts">
import { ref } from "vue";

definePageMeta({
    middleware: ["auth", "workspace"],
});

const {
    authSession,
    closeEditor,
    editorMode,
    editorOpen,
    editorBlockOptions,
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

const isChatVisible = ref(true);
</script>

<template>
    <div
        class="relative h-screen w-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950 selection:bg-blue-500/30"
    >
        <Header />

        <main class="h-full w-full">
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
                    <WorkspaceNodeCard :node="node" :selected="selected" />
                </template>
            </InfiniteCanvas>
        </main>

        <!-- Floating Agent Chat Panel -->
        <div
            class="fixed right-6 0 bottom-0 z-40 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            :class="[
                isChatVisible
                    ? 'w-96 translate-x-0 opacity-100'
                    : 'w-0 translate-x-12 opacity-0 pointer-events-none',
            ]"
        >
            <DashboardAgentChatPanel
                :nodes="nodes"
                @close="isChatVisible = false"
            />
        </div>

        <!-- Chat Toggle Button -->
        <button
            v-if="!isChatVisible"
            type="button"
            class="fixed bottom-8 right-8 z-50 flex size-14 items-center justify-center rounded-2xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-2xl shadow-black/20 hover:scale-110 active:scale-95 transition-all duration-300 ring-1 ring-white/10"
            @click="isChatVisible = true"
        >
            <UIcon name="i-lucide-sparkles" class="size-6" />
        </button>

        <!-- Overlay Notifications -->
        <div class="fixed left-6 bottom-6 z-50 flex flex-col gap-3">
            <WorkspaceBoardStatus
                v-if="!isWorkspaceInitialLoading"
                :badge="saveBadge"
                :nodes-count="nodes.length"
                :user-name="authSession.data?.user?.name"
                class="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border border-neutral-200/50 dark:border-neutral-800/50 rounded-2xl p-3 shadow-xl"
            />

            <UAlert
                v-if="saveError"
                color="error"
                variant="soft"
                icon="i-lucide-cloud-off"
                title="Save Failed"
                :description="saveError"
                class="max-w-xs shadow-xl backdrop-blur-xl bg-red-500/10 border-red-500/20"
            />

            <UAlert
                v-if="workspaceQuery.status === 'error'"
                color="error"
                icon="i-lucide-alert-circle"
                title="Workspace Error"
                :description="workspaceQuery.error?.message"
                class="max-w-xs shadow-xl backdrop-blur-xl bg-red-500/10 border-red-500/20"
            />
        </div>

        <div v-if="isWorkspaceRefreshing" class="fixed right-6 top-8 z-[60]">
            <div
                class="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 dark:border-blue-400/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 backdrop-blur-xl shadow-lg"
            >
                <UIcon name="i-lucide-loader-2" class="size-3 animate-spin" />
                Syncing
            </div>
        </div>

        <WorkspaceEditorModal
            :content="nodeDraft.content"
            :mode="editorMode"
            :open="editorOpen"
            :title="nodeDraft.title"
            :tint="nodeDraft.tint"
            :valid="isDraftValid"
            :available-blocks="editorBlockOptions"
            :featured-blocks="nodeDraft.featuredBlocks"
            @close="closeEditor"
            @submit="submitNodeEditor"
            @update:content="nodeDraft.content = $event"
            @update:featured-blocks="nodeDraft.featuredBlocks = $event"
            @update:tint="nodeDraft.tint = $event"
            @update:title="nodeDraft.title = $event"
        />
    </div>
</template>

<style scoped>
/* Smooth entrance for elements */
main,
aside {
    animation: fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fade-in {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
