<script setup lang="ts">
import { dashboardErrorAlertClass, dashboardStatusBadgeClass } from "~/utils/dashboard-ui";
import { shellActionsSlotClass, shellTopbarControlClass } from "~/utils/app-shell-ui";

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

const canvasRef = ref<{ fitAllNodes: () => void; createNodeAtViewportCenter: () => void } | null>(
  null,
);

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
useAppShellContextSlot();
useAppShellActionsSlot();
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
  isSelectedNodeShared.value ? "Unshare node" : "Share node",
);

const selectedTeamName = computed(() => {
  const team = selectedTeam.value as { name?: string } | null;
  if (team?.name) return team.name;
  const match = teamItems.value.find((item) => item.value === selectedTeamId.value);
  return match?.label.split(" (")[0] ?? "";
});
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

function handleAddNode() {
  canvasRef.value?.createNodeAtViewportCenter();
}

function toggleSelectedNodeSharing() {
  if (isSelectedNodeShared.value) {
    unshareSelectedNode();
    return;
  }

  shareSelectedNode();
}
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-default selection:bg-primary/30">
    <Teleport to="#app-shell-actions" defer>
      <div :class="shellActionsSlotClass">
        <UButton
          :icon="isTeamAsideCompact ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
          color="neutral"
          variant="ghost"
          size="sm"
          :class="shellTopbarControlClass"
          @click="isTeamAsideCompact = !isTeamAsideCompact"
        >
          <span class="hidden lg:inline">Workspace</span>
        </UButton>
        <UButton
          label="Add"
          icon="i-lucide-plus"
          color="neutral"
          variant="soft"
          size="sm"
          :class="shellTopbarControlClass"
          @click="handleAddNode"
        />
      </div>
    </Teleport>

    <Teleport to="#app-shell-context" defer>
      <div class="hidden w-full max-w-[11rem] md:block lg:max-w-[12rem]">
        <USelectMenu
          v-model="selectedTeamId"
          :items="teamItems"
          value-key="value"
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
          :compact="isTeamAsideCompact"
          :teams-count="teams.length"
          :new-team-name="newTeamName"
          :create-team-pending="createTeamMutation.isPending.value"
          :selected-team-id="selectedTeamId"
          :selected-team-name="selectedTeamName"
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
      <div class="pointer-events-auto flex flex-wrap items-center gap-2">
        <span :class="[dashboardStatusBadgeClass, saveBadge.className]">
          {{ saveBadge.label }}
        </span>
        <UBadge
          v-if="isWorkspaceRefreshing && saveBadge.label !== 'Syncing'"
          color="primary"
          variant="soft"
          class="gap-1.5"
        >
          <UIcon name="i-lucide-loader-2" class="size-3 animate-spin" aria-hidden="true" />
          Refreshing
        </UBadge>
      </div>

      <UAlert
        v-if="saveError"
        color="error"
        variant="soft"
        icon="i-lucide-cloud-off"
        title="Couldn't save"
        :description="saveError"
        :class="dashboardErrorAlertClass"
        role="alert"
      />

      <UAlert
        v-if="workspaceQuery.status === 'error'"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        title="Couldn't load workspace"
        :description="workspaceQuery.error?.message"
        :class="dashboardErrorAlertClass"
        role="alert"
      />
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
