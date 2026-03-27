<script setup lang="ts">
import {
    useWorkspaceNodeEditorContext,
    type WorkspaceSaveBadge,
} from "~/components/workspace/node/context";
import {
    getWorkspaceBlockRegistryEntry,
    workspacePrimaryBlockTypes,
} from "~/utils/workspace-block-registry";
import type {
    WorkspaceBlock,
    WorkspaceNode,
    WorkspaceNodeTab,
} from "@brainiac/workspace";

const props = defineProps<{
    node: WorkspaceNode;
    activeTab: WorkspaceNodeTab;
    activeTabId: string;
    saveBadge: WorkspaceSaveBadge;
    saveError: string | null;
    visibleBlocks: WorkspaceBlock[];
}>();

const {
    blockSearch,
    addBlockMenuItems,
    blockPresetMenuItems,
    tabEditor,
    setActiveTab,
    openTabEditor,
    closeTabEditor,
    submitTabEditor,
    deleteActiveTab,
    saveNodeToMarketplace,
    saveActiveTabToMarketplace,
    addBlockToActiveTab,
    getDisplayTabTitle,
} = useWorkspaceNodeEditorContext();

const primaryBlockTypes = workspacePrimaryBlockTypes;

const isSidebarOpen = ref(true);
</script>

<template>
    <div class="flex h-full w-full gap-0 overflow-hidden">
        <!-- Modern Sidebar -->
        <aside
            class="flex flex-col border-r border-muted/30 bg-default/40 transition-all duration-300 backdrop-blur-xl"
            :class="isSidebarOpen ? 'w-80' : 'w-0 opacity-0'"
        >
            <div class="flex flex-1 flex-col overflow-y-auto p-6">
                <!-- Node Context -->
                <div class="mb-8 space-y-4">
                    <UButton
                        to="/dashboard"
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-arrow-left"
                        class="px-0 hover:bg-transparent"
                    >
                        Dashboard
                    </UButton>
                    
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                             <span
                                class="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                :class="saveBadge.className"
                            >
                                {{ saveBadge.label }}
                            </span>
                        </div>
                        <h1 class="text-2xl font-bold tracking-tight text-highlighted">
                            {{ node.title }}
                        </h1>
                    </div>
                </div>

                <!-- Tabs Navigation -->
                <div class="mb-8 space-y-1">
                    <p class="mb-2 px-2 text-[11px] font-bold uppercase tracking-widest text-muted/60">
                        Workspaces
                    </p>
                    <button
                        v-for="tab in node.tabs"
                        :key="tab.id"
                        type="button"
                        class="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all"
                        :class="
                            tab.id === activeTabId
                                ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                                : 'text-toned hover:bg-elevated/50 hover:text-highlighted'
                        "
                        @click="setActiveTab(tab.id)"
                    >
                        <UIcon 
                            :name="tab.id === activeTabId ? 'i-lucide-folder-open' : 'i-lucide-folder'" 
                            class="size-4.5" 
                        />
                        <span class="truncate">{{ getDisplayTabTitle(tab) }}</span>
                    </button>

                    <button
                        type="button"
                        class="mt-2 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted transition-all hover:bg-elevated/50 hover:text-highlighted"
                        @click="openTabEditor('create')"
                    >
                        <UIcon name="i-lucide-plus" class="size-4.5" />
                        <span>Add workspace</span>
                    </button>
                </div>

                <!-- Quick Actions -->
                <div class="mt-auto space-y-1">
                    <p class="mb-2 px-2 text-[11px] font-bold uppercase tracking-widest text-muted/60">
                        Tab Options
                    </p>
                    <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-store"
                        class="w-full justify-start rounded-2xl"
                        @click="saveActiveTabToMarketplace"
                    >
                        Share template
                    </UButton>
                    <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-pencil"
                        class="w-full justify-start rounded-2xl"
                        @click="openTabEditor('rename')"
                    >
                        Rename
                    </UButton>
                    <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-trash-2"
                        class="w-full justify-start rounded-2xl hover:text-error"
                        @click="deleteActiveTab"
                    >
                        Delete
                    </UButton>
                </div>
            </div>
        </aside>

        <!-- Main Workspace Area -->
        <main class="relative flex flex-1 flex-col overflow-hidden bg-elevated/5">
            <!-- Header/Toolbar -->
            <header class="flex h-16 shrink-0 items-center justify-between border-b border-muted/20 bg-default/40 px-6 backdrop-blur-md">
                <div class="flex items-center gap-4">
                    <UButton
                        color="neutral"
                        variant="ghost"
                        :icon="isSidebarOpen ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'"
                        @click="isSidebarOpen = !isSidebarOpen"
                    />
                    <div class="h-4 w-px bg-muted/30" />
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold text-highlighted">
                            {{ getDisplayTabTitle(activeTab) }}
                        </span>
                        <span class="text-xs text-muted">
                            ({{ activeTab.blocks.length }} blocks)
                        </span>
                    </div>
                </div>

                <div class="flex items-center gap-4">
                    <div class="w-64">
                        <UInput
                            v-model="blockSearch"
                            icon="i-lucide-search"
                            placeholder="Quick search..."
                            size="md"
                            class="rounded-full"
                            :ui="{ base: 'rounded-full bg-elevated/50' }"
                        />
                    </div>
                    
                    <UDropdownMenu :items="addBlockMenuItems">
                        <UButton 
                            color="primary" 
                            icon="i-lucide-plus"
                            class="rounded-full px-5 shadow-lg shadow-primary/20"
                        >
                            Add Block
                        </UButton>
                    </UDropdownMenu>
                </div>
            </header>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto p-8 lg:p-12">
                <div class="mx-auto w-full max-w-4xl space-y-8">
                    <!-- Legacy Alert -->
                    <UAlert
                        v-if="node.customBlockTemplates.length > 0"
                        color="warning"
                        variant="soft"
                        icon="i-lucide-shapes"
                        title="Legacy custom templates detected"
                        description="This node still contains legacy form templates."
                        class="rounded-3xl border-warning/20"
                    />

                    <!-- Empty State -->
                    <div
                        v-if="activeTab.blocks.length === 0"
                        class="flex flex-col items-center justify-center rounded-[40px] border border-dashed border-muted/50 bg-default/40 py-24 text-center"
                    >
                        <div class="mb-6 flex size-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                            <UIcon name="i-lucide-layers" class="size-10" />
                        </div>
                        <h3 class="mb-2 text-xl font-bold text-highlighted">
                            Your workspace is a blank canvas
                        </h3>
                        <p class="mb-8 max-w-xs text-toned">
                            Add your first block to start organizing your thoughts and tasks.
                        </p>
                        
                        <div class="flex flex-wrap justify-center gap-3">
                            <UButton
                                v-for="type in primaryBlockTypes"
                                :key="type"
                                color="primary"
                                variant="soft"
                                class="rounded-2xl px-4 py-2.5"
                                :icon="getWorkspaceBlockRegistryEntry(type).icon"
                                @click="addBlockToActiveTab(type)"
                            >
                                {{ getWorkspaceBlockRegistryEntry(type).label }}
                            </UButton>
                        </div>
                    </div>

                    <!-- Filtered Empty State -->
                    <div
                        v-else-if="visibleBlocks.length === 0"
                        class="rounded-[40px] border border-dashed border-muted/50 bg-default/40 py-20 text-center"
                    >
                        <UIcon name="i-lucide-search-x" class="mx-auto mb-4 size-12 text-muted" />
                        <p class="text-lg font-bold text-highlighted">
                            No blocks match your search
                        </p>
                        <UButton
                            color="neutral"
                            variant="link"
                            @click="blockSearch = ''"
                        >
                            Clear search
                        </UButton>
                    </div>

                    <!-- Blocks List -->
                    <div v-else class="space-y-10">
                        <WorkspaceNodeBlockRenderer
                            v-for="block in visibleBlocks"
                            :key="block.id"
                            :block="block"
                            :tab-id="activeTab.id"
                        />
                    </div>
                </div>
            </div>

            <!-- Footer / Save Error -->
            <div v-if="saveError" class="p-6">
                <UAlert
                    color="error"
                    variant="soft"
                    icon="i-lucide-cloud-off"
                    title="Changes not saved"
                    :description="saveError"
                    class="rounded-3xl"
                />
            </div>
        </main>

        <!-- Modals -->
        <UModal
            :open="tabEditor.open"
            :title="tabEditor.mode === 'create' ? 'Create workspace' : 'Rename workspace'"
            :ui="{
                content: 'sm:max-w-md rounded-[32px] overflow-hidden',
                body: 'space-y-4 p-8',
                footer: 'flex items-center justify-end gap-3 p-6 bg-elevated/20',
            }"
            @update:open="(value) => !value && closeTabEditor()"
        >
            <template #body>
                <UFormField label="Workspace name">
                    <UInput
                        :model-value="tabEditor.title"
                        autofocus
                        placeholder="e.g. Design System"
                        size="xl"
                        class="rounded-2xl"
                        @update:model-value="tabEditor.title = $event ?? ''"
                    />
                </UFormField>
            </template>

            <template #footer>
                <UButton color="neutral" variant="ghost" class="rounded-xl" @click="closeTabEditor"
                    >Cancel</UButton
                >
                <UButton
                    color="primary"
                    icon="i-lucide-save"
                    class="rounded-xl px-6"
                    @click="submitTabEditor"
                >
                    {{
                        tabEditor.mode === "create" ? "Create" : "Save"
                    }}
                </UButton>
            </template>
        </UModal>
    </div>
</template>
