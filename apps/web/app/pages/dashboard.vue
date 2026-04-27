<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "workspace"],
});

const {
  authSession,
  closeEditor,
  connectNodePair,
  disconnectNodePair,
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

const canvasRef = ref<{ fitAllNodes: () => void } | null>(null);

const stopAutoFit = watch(
  () => [isWorkspaceInitialLoading.value, canvasRef.value] as const,
  ([isLoading, canvas]) => {
    if (isLoading || !canvas) return;
    nextTick(() => canvas.fitAllNodes());
    stopAutoFit();
  },
  { immediate: true, flush: "post" },
);

const { isChatVisible, isTeamAsideCompact } = useDashboardLayout({
  chatVisibleByDefault: false,
});

const teamSelection = useTeamSelection();
const { newTeamName, selectedTeam, selectedTeamId, teamListQuery, teamNameDraft, teams } =
  teamSelection;

const teamManagement = useTeamManagement({
  teamSelection,
  workspaceQuery,
});
const {
  addTeamMember,
  addTeamMemberMutation,
  canDeleteTeam,
  canInvite,
  canModifyRoles,
  canRemoveMembers,
  createTeam,
  createTeamMutation,
  currentUserId,
  deleteSelectedTeam,
  deleteTeamMutation,
  memberEmail,
  memberRole,
  removeMember,
  removeTeamMemberMutation,
  saveTeamName,
  updateMemberRole,
  updateTeamMemberRoleMutation,
  updateTeamMutation,
} = teamManagement;

const isTeamSettingsModalOpen = ref(false);

const {
  canManageSelectedNodeSharing,
  selectedNode,
  selectedNodeTeamRole,
  shareNodeMutation,
  shareSelectedNode,
  unshareNodeMutation,
  unshareSelectedNode,
} = useNodeSharing({
  teamSelection,
  workspaceBoard: {
    nodes,
    selectedNodeIds,
    workspaceQuery,
  },
});

const teamItems = computed(() =>
  teams.value.map((team) => ({
    label: `${team.name} (${team.role})`,
    value: team.id,
  })),
);

const isSelectedNodeShared = computed(() => selectedNode.value?.visibility === "team");
const isNodeShareActionPending = computed(
  () => shareNodeMutation.isPending.value || unshareNodeMutation.isPending.value,
);
const nodeShareActionLabel = computed(() =>
  isSelectedNodeShared.value ? "Unshare Node" : "Share Node",
);
const nodeShareActionDisabled = computed(() => {
  if (
    !selectedNode.value ||
    isNodeShareActionPending.value ||
    !canManageSelectedNodeSharing.value
  ) {
    return true;
  }

  if (isSelectedNodeShared.value) {
    return false;
  }

  return !selectedTeamId.value || teamListQuery.isLoading.value;
});

function toggleSelectedNodeSharing() {
  if (isSelectedNodeShared.value) {
    unshareSelectedNode();
    return;
  }

  shareSelectedNode();
}
</script>

<template>
  <div
    class="relative h-screen w-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950 selection:bg-blue-500/30"
  >
    <Header />

    <main class="h-full w-full">
      <InfiniteCanvas
        ref="canvasRef"
        v-model:nodes="nodes"
        v-model:selected-node-ids="selectedNodeIds"
        :loading="isWorkspaceInitialLoading"
        @create-node="openCreateNode"
        @edit-node="openEditNode"
        @connect-node-pair="connectNodePair"
        @disconnect-node-pair="disconnectNodePair"
        @remove-node="removeNode"
        @open-node="openNodePage"
      >
        <template #node="{ node, selected, allNodes }">
          <WorkspaceNodeCard :node="node" :selected="selected" :all-nodes="allNodes" />
        </template>
      </InfiniteCanvas>
    </main>

    <aside
      class="fixed left-6 top-24 z-40 max-h-[calc(100vh-7rem)] rounded-2xl border border-neutral-200/60 bg-white/85 shadow-xl backdrop-blur-xl transition-all duration-300 dark:border-neutral-800/60 dark:bg-neutral-950/85"
      :class="isTeamAsideCompact ? 'w-14 p-2' : 'w-[24rem] overflow-y-auto p-4'"
    >
      <div v-if="isTeamAsideCompact" class="flex items-center justify-center">
        <UButton
          icon="i-lucide-users"
          variant="outline"
          color="neutral"
          size="md"
          square
          aria-label="Expand team panel"
          @click="isTeamAsideCompact = false"
        />
      </div>

      <template v-else>
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-xs font-bold uppercase tracking-[0.22em] text-neutral-500">Teams</h2>
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-medium text-neutral-500">{{ teams.length }} total</span>
            <UButton
              icon="i-lucide-users"
              variant="outline"
              color="neutral"
              size="md"
              square
              aria-label="Compact team panel"
              @click="isTeamAsideCompact = true"
            />
          </div>
        </div>

        <div class="mt-3 flex items-center gap-2">
          <UInput
            v-model="newTeamName"
            type="text"
            placeholder="New team name"
            size="sm"
            class="flex-1"
            @keydown.enter.prevent="createTeam"
          />
          <UButton
            label="Create"
            color="neutral"
            variant="solid"
            size="sm"
            :loading="createTeamMutation.isPending.value"
            :disabled="!newTeamName.trim()"
            @click="createTeam"
          />
        </div>

        <div class="mt-4">
          <label
            class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-500"
          >
            Share Target
          </label>
          <USelect
            v-model="selectedTeamId"
            :items="teamItems"
            placeholder="Select a team"
            size="sm"
            class="w-full"
          />
        </div>

        <div
          class="mt-4 rounded-xl border border-neutral-200/80 bg-neutral-50/80 p-3 dark:border-neutral-800/80 dark:bg-neutral-900/70"
        >
          <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Team Management
          </p>

          <p class="mt-2 text-xs text-neutral-500">
            Open the dedicated team settings modal to manage members and access rules.
          </p>

          <UButton
            label="Manage Team"
            color="primary"
            variant="solid"
            block
            size="sm"
            class="mt-3"
            :disabled="!selectedTeam"
            @click="isTeamSettingsModalOpen = true"
          />

          <div v-if="selectedTeam && !canInvite" class="mt-3 flex items-center gap-2">
            <UBadge color="neutral" variant="subtle" size="sm">Requires Owner</UBadge>
            <p class="text-xs text-neutral-500">
              Owner role is required for member and role changes.
            </p>
          </div>
        </div>

        <div
          class="mt-4 rounded-xl border border-neutral-200/80 bg-neutral-50/80 p-3 dark:border-neutral-800/80 dark:bg-neutral-900/70"
        >
          <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Selected Node
          </p>
          <p class="mt-1 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {{ selectedNode?.title ?? "No node selected" }}
          </p>
          <p class="mt-1 text-xs text-neutral-500">
            {{
              selectedNode
                ? selectedNode.visibility === "team"
                  ? canManageSelectedNodeSharing
                    ? `Shared to ${selectedNode.teamId}`
                    : "Team-shared node"
                  : "Private node"
                : "Click a node on canvas to share it."
            }}
          </p>
          <p
            v-if="selectedNode && !canManageSelectedNodeSharing"
            class="mt-1 text-xs text-neutral-500"
          >
            Role {{ selectedNodeTeamRole ?? "viewer" }} can edit content, but only owners can access
            sharing actions and team IDs.
          </p>
        </div>

        <div v-if="canManageSelectedNodeSharing" class="mt-3">
          <UButton
            :label="nodeShareActionLabel"
            block
            size="sm"
            :color="isSelectedNodeShared ? 'neutral' : 'primary'"
            :variant="isSelectedNodeShared ? 'outline' : 'solid'"
            :loading="isNodeShareActionPending"
            :disabled="nodeShareActionDisabled"
            @click="toggleSelectedNodeSharing"
          />
        </div>
      </template>
    </aside>

    <LazyTeamSettingsModal
      :open="isTeamSettingsModalOpen"
      :selected-team="selectedTeam"
      :team-name-draft="teamNameDraft"
      :member-email="memberEmail"
      :member-role="memberRole"
      :can-invite="canInvite"
      :can-delete-team="canDeleteTeam"
      :can-modify-roles="canModifyRoles"
      :can-remove-members="canRemoveMembers"
      :add-member-pending="addTeamMemberMutation.isPending.value"
      :update-team-pending="updateTeamMutation.isPending.value"
      :delete-team-pending="deleteTeamMutation.isPending.value"
      :update-role-pending="updateTeamMemberRoleMutation.isPending.value"
      :remove-member-pending="removeTeamMemberMutation.isPending.value"
      :current-user-id="currentUserId"
      @update:open="isTeamSettingsModalOpen = $event"
      @update:team-name-draft="teamNameDraft = $event"
      @update:member-email="memberEmail = $event"
      @update:member-role="memberRole = $event"
      @save-team-name="saveTeamName"
      @delete-team="deleteSelectedTeam"
      @add-member="addTeamMember"
      @role-change="updateMemberRole($event.userId, $event.role)"
      @remove-member="removeMember"
    />

    <div
      class="pointer-events-none fixed bottom-4 right-3 top-24 z-40 flex w-[min(26rem,calc(100vw-1.5rem))] flex-col sm:bottom-6 sm:right-6"
    >
      <Transition
        enter-active-class="transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        enter-from-class="translate-x-12 opacity-0"
        leave-active-class="transition-all duration-300 ease-in"
        leave-to-class="translate-x-12 opacity-0"
      >
        <div v-if="isChatVisible" class="pointer-events-auto min-h-0 flex-1">
          <LazyDashboardAgentChatPanel :nodes="nodes" @close="isChatVisible = false" />
        </div>
      </Transition>
    </div>

    <button
      v-if="!isChatVisible"
      type="button"
      class="fixed bottom-8 right-8 z-50 flex size-14 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-2xl shadow-black/20 ring-1 ring-white/10 transition-all duration-300 hover:scale-110 active:scale-95 dark:bg-neutral-100 dark:text-neutral-900"
      @click="isChatVisible = true"
    >
      <UIcon name="i-lucide-sparkles" class="size-6" />
    </button>

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

    <div v-if="isWorkspaceRefreshing" class="fixed right-6 top-8 z-60">
      <div
        class="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 dark:border-blue-400/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 backdrop-blur-xl shadow-lg"
      >
        <UIcon name="i-lucide-loader-2" class="size-3 animate-spin" />
        Syncing
      </div>
    </div>

    <LazyWorkspaceEditorModal
      :content="nodeDraft.content"
      :mode="editorMode"
      :node-type="nodeDraft.nodeType"
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
      @update:node-type="nodeDraft.nodeType = $event"
      @update:tint="nodeDraft.tint = $event"
      @update:title="nodeDraft.title = $event"
    />
  </div>
</template>

<style scoped>
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

@media (prefers-reduced-motion: reduce) {
  main,
  aside {
    animation: none;
  }
}
</style>
