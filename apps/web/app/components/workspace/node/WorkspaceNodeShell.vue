<script setup lang="ts">
import type {
    WorkspaceBlock,
    WorkspaceNode,
    WorkspaceNodeTab,
} from "@brainiac/workspace";

import {
    useWorkspaceNodeEditorContext,
    type WorkspaceSaveBadge,
} from "~/components/workspace/node/context";
import {
    getWorkspaceBlockRegistryEntry,
    workspacePrimaryBlockTypes,
} from "~/utils/workspace-block-registry";

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
</script>

<template>
    <div class="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section
            class="rounded-2xl border border-muted/60 bg-default p-5 shadow-sm"
        >
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-3">
                    <UButton
                        to="/dashboard"
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-arrow-left"
                    >
                        Back
                    </UButton>
                    <span
                        class="rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em]"
                        :class="saveBadge.className"
                    >
                        {{ saveBadge.label }}
                    </span>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <UButton
                        color="neutral"
                        variant="soft"
                        icon="i-lucide-store"
                        @click="saveNodeToMarketplace"
                    >
                        Save node
                    </UButton>
                    <UButton
                        color="neutral"
                        variant="soft"
                        icon="i-lucide-store"
                        @click="saveActiveTabToMarketplace"
                    >
                        Save tab
                    </UButton>
                    <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-pencil"
                        @click="openTabEditor('rename')"
                    >
                        Rename tab
                    </UButton>
                    <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-trash-2"
                        @click="deleteActiveTab"
                    >
                        Delete tab
                    </UButton>
                    <UButton
                        color="primary"
                        variant="soft"
                        icon="i-lucide-plus"
                        @click="openTabEditor('create')"
                    >
                        New tab
                    </UButton>
                </div>
            </div>

            <div class="mt-4">
                <h1
                    class="text-2xl font-semibold tracking-tight text-highlighted md:text-3xl"
                >
                    {{ node.title }}
                </h1>
            </div>

            <div class="mt-4 flex flex-wrap items-center gap-2">
                <button
                    v-for="tab in node.tabs"
                    :key="tab.id"
                    type="button"
                    class="rounded-full border px-4 py-2 text-sm font-medium transition"
                    :class="
                        tab.id === activeTabId
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-muted/60 bg-elevated/70 text-toned hover:border-primary/30 hover:text-highlighted'
                    "
                    @click="setActiveTab(tab.id)"
                >
                    {{ getDisplayTabTitle(tab) }}
                </button>
            </div>
        </section>

        <div class="space-y-6">
            <section
                class="rounded-[24px] border border-muted/60 bg-default p-5 shadow-sm"
            >
                <div class="flex flex-col gap-4">
                    <div
                        class="space-y-4 rounded-2xl border border-muted/60 bg-elevated/30 p-4"
                    >
                        <div
                            class="flex flex-wrap items-center justify-between gap-2"
                        >
                            <p class="text-sm font-medium text-highlighted">
                                {{ getDisplayTabTitle(activeTab) }}
                            </p>
                            <p class="text-sm text-muted">
                                {{ visibleBlocks.length }} of
                                {{ activeTab.blocks.length }} block{{
                                    activeTab.blocks.length === 1 ? "" : "s"
                                }}
                            </p>
                        </div>

                        <UInput
                            v-model="blockSearch"
                            icon="i-lucide-search"
                            placeholder="Search blocks by title or content"
                            size="lg"
                        />

                        <div class="flex flex-wrap items-center gap-2">
                            <UButton
                                v-for="type in primaryBlockTypes"
                                :key="type"
                                color="primary"
                                variant="soft"
                                :icon="
                                    getWorkspaceBlockRegistryEntry(type).icon
                                "
                                @click="addBlockToActiveTab(type)"
                            >
                                {{ getWorkspaceBlockRegistryEntry(type).label }}
                            </UButton>
                            <UDropdownMenu :items="blockPresetMenuItems">
                                <UButton
                                    color="neutral"
                                    variant="soft"
                                    icon="i-lucide-layers-3"
                                >
                                    Preset packs
                                </UButton>
                            </UDropdownMenu>
                            <UDropdownMenu :items="addBlockMenuItems">
                                <UButton color="primary" icon="i-lucide-plus"
                                    >More</UButton
                                >
                            </UDropdownMenu>
                        </div>
                    </div>

                    <UAlert
                        v-if="node.customBlockTemplates.length > 0"
                        color="warning"
                        variant="soft"
                        icon="i-lucide-shapes"
                        title="Legacy custom templates detected"
                        description="This node still contains legacy form templates. New structured work should use Kanban, Timeline, and Scorecard blocks."
                    />

                    <div
                        v-if="activeTab.blocks.length === 0"
                        class="rounded-2xl border border-dashed border-muted/70 bg-elevated/30 p-10 text-center"
                    >
                        <p class="text-base font-medium text-highlighted">
                            This tab is empty.
                        </p>
                        <p class="mt-2 text-sm text-muted">
                            Add a block to start structuring tasks, notes,
                            decisions, or richer workflows.
                        </p>
                    </div>

                    <div
                        v-else-if="visibleBlocks.length === 0"
                        class="rounded-2xl border border-dashed border-muted/70 bg-elevated/30 p-10 text-center"
                    >
                        <p class="text-base font-medium text-highlighted">
                            No blocks match your search.
                        </p>
                        <p class="mt-2 text-sm text-muted">
                            Try a different term or clear the search to see all
                            blocks.
                        </p>
                    </div>

                    <div v-else class="space-y-5">
                        <WorkspaceNodeBlockRenderer
                            v-for="block in visibleBlocks"
                            :key="block.id"
                            :block="block"
                            :tab-id="activeTab.id"
                        />
                    </div>
                </div>
            </section>
        </div>

        <UAlert
            v-if="saveError"
            color="error"
            variant="soft"
            icon="i-lucide-cloud-off"
            title="Unable to persist node changes"
            :description="saveError"
        />

        <UModal
            :open="tabEditor.open"
            :title="tabEditor.mode === 'create' ? 'Create tab' : 'Rename tab'"
            :description="
                tabEditor.mode === 'create'
                    ? 'Create a new tab inside this node.'
                    : 'Update the active tab title.'
            "
            :ui="{
                content: 'sm:max-w-md',
                body: 'space-y-4',
                footer: 'flex items-center justify-end gap-3',
            }"
            @update:open="(value) => !value && closeTabEditor()"
        >
            <template #body>
                <UFormField label="Tab title">
                    <UInput
                        :model-value="tabEditor.title"
                        autofocus
                        placeholder="Overview"
                        @update:model-value="tabEditor.title = $event ?? ''"
                    />
                </UFormField>
            </template>

            <template #footer>
                <UButton color="neutral" variant="ghost" @click="closeTabEditor"
                    >Cancel</UButton
                >
                <UButton
                    color="primary"
                    icon="i-lucide-save"
                    @click="submitTabEditor"
                >
                    {{
                        tabEditor.mode === "create" ? "Create tab" : "Save tab"
                    }}
                </UButton>
            </template>
        </UModal>
    </div>
</template>
