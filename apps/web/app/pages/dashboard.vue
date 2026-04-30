<script setup lang="ts">
definePageMeta({
  layout: "app",
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

const { setAgentDockOpen } = useAppShell();
useAppShellPageTitle("Dashboard");
useAppShellCustomDock();
const { isTeamAsideCompact } = useDashboardLayout();

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
    class="relative h-full w-full overflow-hidden bg-neutral-50 dark:bg-neutral-950 selection:bg-blue-500/30"
  >
    <Teleport to="#app-shell-actions" defer>
      <div class="flex items-center gap-2">
        <UButton
          :icon="isTeamAsideCompact ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
          color="neutral"
          variant="ghost"
          class="rounded-2xl"
          @click="isTeamAsideCompact = !isTeamAsideCompact"
        >
          <span class="hidden lg:inline">Workspace</span>
        </UButton>
        <UButton
          label="Add"
          icon="i-lucide-plus"
          color="neutral"
          variant="soft"
          class="rounded-2xl"
          @click="openCreateNode()"
        />
      </div>
    </Teleport>

    <Teleport to="#app-shell-context" defer>
      <div class="hidden items-center gap-2 md:flex">
        <USelectMenu
          v-model="selectedTeamId"
          :items="teamItems"
          value-key="value"
          class="w-52"
          size="sm"
          :search-input="{ placeholder: 'Find team' }"
          placeholder="Team"
        />
      </div>
    </Teleport>

    <Teleport to="#app-shell-dock-content" defer>
      <div class="flex h-full min-h-0 flex-col">
        <LazyDashboardAgentChatPanel :nodes="nodes" @close="setAgentDockOpen(false)" />
      </div>
    </Teleport>

    <main class="h-full w-full">
      <div class="flex h-full w-full overflow-hidden">
        <DashboardWorkspaceSidebar
          class="hidden md:block"
          :compact="isTeamAsideCompact"
          :teams-count="teams.length"
          :new-team-name="newTeamName"
          :selected-team-id="selectedTeamId"
          :team-items="teamItems"
          :selected-team="selectedTeam"
          :selected-node="selectedNode"
          :can-invite="canInvite"
          :can-manage-selected-node-sharing="canManageSelectedNodeSharing"
          :selected-node-team-role="selectedNodeTeamRole"
          :is-selected-node-shared="isSelectedNodeShared"
          :is-node-share-action-pending="isNodeShareActionPending"
          :node-share-action-label="nodeShareActionLabel"
          :node-share-action-disabled="nodeShareActionDisabled"
          @update:compact="isTeamAsideCompact = $event"
          @update:new-team-name="newTeamName = $event"
          @update:selected-team-id="selectedTeamId = $event"
          @create-team="createTeam"
          @open-team-settings="isTeamSettingsModalOpen = true"
          @toggle-selected-node-sharing="toggleSelectedNodeSharing"
        />

        <div class="min-w-0 flex-1">
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
        </div>
      </div>
    </main>

    <USlideover
      :open="!isTeamAsideCompact"
      side="left"
      class="md:hidden"
      @update:open="isTeamAsideCompact = !$event"
    >
      <template #content>
        <DashboardWorkspaceSidebar
          :compact="false"
          :teams-count="teams.length"
          :new-team-name="newTeamName"
          :selected-team-id="selectedTeamId"
          :team-items="teamItems"
          :selected-team="selectedTeam"
          :selected-node="selectedNode"
          :can-invite="canInvite"
          :can-manage-selected-node-sharing="canManageSelectedNodeSharing"
          :selected-node-team-role="selectedNodeTeamRole"
          :is-selected-node-shared="isSelectedNodeShared"
          :is-node-share-action-pending="isNodeShareActionPending"
          :node-share-action-label="nodeShareActionLabel"
          :node-share-action-disabled="nodeShareActionDisabled"
          @update:new-team-name="newTeamName = $event"
          @update:selected-team-id="selectedTeamId = $event"
          @create-team="createTeam"
          @open-team-settings="isTeamSettingsModalOpen = true"
          @toggle-selected-node-sharing="toggleSelectedNodeSharing"
          @update:compact="isTeamAsideCompact = $event"
        />
      </template>
    </USlideover>

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
      class="pointer-events-none absolute left-4 bottom-4 z-30 flex max-w-xs flex-col gap-3 md:left-6 md:bottom-6"
    >
      <WorkspaceBoardStatus
        v-if="!isWorkspaceInitialLoading"
        :badge="saveBadge"
        :nodes-count="nodes.length"
        :user-name="authSession.data?.user?.name"
        class="pointer-events-auto rounded-2xl border border-neutral-200/80 bg-white/96 p-3 dark:border-neutral-800/80 dark:bg-neutral-900/96"
      />

      <UAlert
        v-if="saveError"
        color="error"
        variant="soft"
        icon="i-lucide-cloud-off"
        title="Save Failed"
        :description="saveError"
        class="pointer-events-auto max-w-xs border-red-500/20 bg-red-500/10"
      />

      <UAlert
        v-if="workspaceQuery.status === 'error'"
        color="error"
        icon="i-lucide-alert-circle"
        title="Workspace Error"
        :description="workspaceQuery.error?.message"
        class="pointer-events-auto max-w-xs border-red-500/20 bg-red-500/10"
      />
    </div>

    <div
      v-if="isWorkspaceRefreshing"
      class="pointer-events-none absolute right-4 top-4 z-30 md:right-6 md:top-6"
    >
      <div
        class="pointer-events-auto flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-400"
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
