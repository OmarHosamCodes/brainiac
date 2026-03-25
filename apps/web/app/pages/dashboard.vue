<script setup lang="ts">
import { WORKSPACE_NODE_LIMIT, type WorkspaceMarketplaceItem } from "@brainiac/workspace";
import { useQuery } from "@tanstack/vue-query";

import {
    cloneMarketplaceNodePayloadAsNode,
    getMarketplacePayloadSummary,
    getMarketplacePayloadTypeLabel,
} from "~/utils/workspace-marketplace";

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

const orpc = useOrpc();
const toast = useToast();

const marketplaceQuery = useQuery({
    ...orpc.workspace.marketplace.list.queryOptions(),
    enabled: computed(() => Boolean(authSession.value?.data?.user)),
    staleTime: 15_000,
});

const marketplaceSearch = ref("");
const normalizedMarketplaceSearch = computed(() =>
    marketplaceSearch.value.trim().toLowerCase(),
);
const marketplaceItems = computed(() => marketplaceQuery.data.value?.items ?? []);
const visibleMarketplaceItems = computed(() => {
    if (!normalizedMarketplaceSearch.value) {
        return marketplaceItems.value;
    }

    return marketplaceItems.value.filter((item) =>
        [
            item.title,
            item.summary,
            item.createdByName,
            getMarketplacePayloadTypeLabel(item.payload),
            getMarketplacePayloadSummary(item.payload),
        ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedMarketplaceSearch.value),
    );
});

function insertMarketplaceItem(item: WorkspaceMarketplaceItem) {
    if (nodes.value.length >= WORKSPACE_NODE_LIMIT) {
        toast.add({
            title: "Node limit reached",
            description: `A workspace can store up to ${WORKSPACE_NODE_LIMIT} nodes.`,
            color: "warning",
            icon: "i-lucide-alert-triangle",
        });
        return;
    }

    const nextNode = cloneMarketplaceNodePayloadAsNode(item.payload);
    const anchorNode = nodes.value[nodes.value.length - 1];
    nextNode.x = (anchorNode?.x ?? 0) + 56;
    nextNode.y = (anchorNode?.y ?? 0) + 56;

    nodes.value = [...nodes.value, nextNode];

    toast.add({
        title: "Node inserted",
        description: `${item.title} was added to your dashboard.`,
        color: "success",
        icon: "i-lucide-check",
    });
}
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

            <section class="rounded-2xl border border-muted/60 bg-default p-4 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p class="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                            Team Marketplace
                        </p>
                        <p class="mt-1 text-sm text-muted">
                            Insert saved nodes, tabs, and blocks as ready-to-edit nodes.
                        </p>
                    </div>
                    <UBadge color="neutral" variant="soft">
                        {{ marketplaceItems.length }} items
                    </UBadge>
                </div>

                <UInput
                    v-model="marketplaceSearch"
                    icon="i-lucide-search"
                    class="mt-3"
                    placeholder="Search marketplace"
                />

                <div
                    v-if="marketplaceQuery.isLoading.value"
                    class="mt-4 flex justify-center py-4"
                >
                    <UIcon
                        name="i-lucide-loader-2"
                        class="size-5 animate-spin text-muted"
                    />
                </div>

                <div
                    v-else-if="visibleMarketplaceItems.length === 0"
                    class="mt-4 rounded-xl border border-dashed border-muted/70 bg-elevated/20 p-4 text-sm text-muted"
                >
                    No marketplace items match this search.
                </div>

                <div v-else class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <div
                        v-for="item in visibleMarketplaceItems"
                        :key="item.id"
                        class="rounded-xl border border-muted/60 bg-elevated/30 p-3"
                    >
                        <div class="space-y-2">
                            <p class="truncate font-medium text-highlighted">
                                {{ item.title }}
                            </p>
                            <p class="text-sm text-muted">
                                {{ item.summary || getMarketplacePayloadSummary(item.payload) }}
                            </p>
                            <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                                <UBadge color="neutral" variant="subtle">
                                    {{ getMarketplacePayloadTypeLabel(item.payload) }}
                                </UBadge>
                                <span>{{ getMarketplacePayloadSummary(item.payload) }}</span>
                                <span>By {{ item.createdByName }}</span>
                            </div>
                            <UButton
                                color="primary"
                                variant="soft"
                                icon="i-lucide-download"
                                class="w-full justify-center"
                                @click="insertMarketplaceItem(item)"
                            >
                                Insert as node
                            </UButton>
                        </div>
                    </div>
                </div>
            </section>

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
                            :node="node"
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
