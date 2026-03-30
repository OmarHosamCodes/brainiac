<script setup lang="ts">
import { useMutation, useQuery } from "@tanstack/vue-query";
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
const orpc = useOrpc();
const toast = useToast();

const isChatVisible = ref(true);
const isTeamAsideCompact = ref(true);
const newTeamName = ref("");
const selectedTeamId = ref("");
const teamNameDraft = ref("");
const memberEmail = ref("");
const memberRole = ref<"owner" | "editor" | "viewer">("viewer");

const teamListQuery = useQuery(orpc.team.list.queryOptions());
const teamDetailQuery = useQuery(
  computed(() => ({
    ...orpc.team.get.queryOptions({ input: { teamId: selectedTeamId.value } }),
    enabled: Boolean(selectedTeamId.value),
  })),
);
const createTeamMutation = useMutation(orpc.team.create.mutationOptions());
const updateTeamMutation = useMutation(orpc.team.update.mutationOptions());
const deleteTeamMutation = useMutation(orpc.team.delete.mutationOptions());
const addTeamMemberMutation = useMutation(orpc.team.members.add.mutationOptions());
const updateTeamMemberRoleMutation = useMutation(orpc.team.members.updateRole.mutationOptions());
const removeTeamMemberMutation = useMutation(orpc.team.members.remove.mutationOptions());
const shareNodeMutation = useMutation(orpc.workspace.shareNode.mutationOptions());
const unshareNodeMutation = useMutation(orpc.workspace.unshareNode.mutationOptions());

const teams = computed(() => teamListQuery.data.value?.items ?? []);
const selectedTeam = computed(() => teamDetailQuery.data.value ?? null);
const selectedTeamMembers = computed(() => selectedTeam.value?.members ?? []);
const canManageSelectedTeam = computed(() => selectedTeam.value?.role === "owner");
const currentUserId = computed(() => authSession.value?.data?.user?.id ?? "");
const selectedNode = computed(() => {
  const nodeId = selectedNodeIds.value[0];

  if (!nodeId) {
    return null;
  }

  return nodes.value.find((node) => node.id === nodeId) ?? null;
});

watch(
  teams,
  (nextTeams) => {
    if (selectedTeamId.value && nextTeams.some((team) => team.id === selectedTeamId.value)) {
      return;
    }

    selectedTeamId.value = nextTeams[0]?.id ?? "";
  },
  { immediate: true },
);

watch(
  selectedTeam,
  (team) => {
    teamNameDraft.value = team?.name ?? "";
  },
  { immediate: true },
);

async function createTeam() {
  const teamName = newTeamName.value.trim();

  if (!teamName) {
    return;
  }

  try {
    await createTeamMutation.mutateAsync({ name: teamName });
    newTeamName.value = "";
    await teamListQuery.refetch();
    toast.add({
      title: "Team created",
      description: `Created ${teamName}.`,
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Failed to create team",
      description: error instanceof Error ? error.message : "Please try again.",
      color: "error",
    });
  }
}

async function refreshTeamData() {
  await Promise.all([teamListQuery.refetch(), teamDetailQuery.refetch()]);
}

async function saveTeamName() {
  const teamId = selectedTeamId.value;
  const name = teamNameDraft.value.trim();

  if (!teamId || !name) {
    return;
  }

  try {
    await updateTeamMutation.mutateAsync({ teamId, name });
    await refreshTeamData();
    toast.add({
      title: "Team updated",
      description: "Team name saved.",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Failed to update team",
      description: error instanceof Error ? error.message : "Please try again.",
      color: "error",
    });
  }
}

async function deleteSelectedTeam() {
  const teamId = selectedTeamId.value;

  if (!teamId) {
    return;
  }

  try {
    await deleteTeamMutation.mutateAsync({ teamId });
    await Promise.all([teamListQuery.refetch(), workspaceQuery.refetch()]);
    toast.add({
      title: "Team deleted",
      description: "Shared nodes were detached from this team.",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Failed to delete team",
      description: error instanceof Error ? error.message : "Please try again.",
      color: "error",
    });
  }
}

async function addTeamMember() {
  const teamId = selectedTeamId.value;
  const userEmail = memberEmail.value.trim();

  if (!teamId || !userEmail) {
    return;
  }

  try {
    await addTeamMemberMutation.mutateAsync({
      teamId,
      userEmail,
      role: memberRole.value,
    });
    memberEmail.value = "";
    memberRole.value = "viewer";
    await refreshTeamData();
    toast.add({
      title: "Member added",
      description: `${userEmail} has been added to the team.`,
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Failed to add member",
      description: error instanceof Error ? error.message : "Please try again.",
      color: "error",
    });
  }
}

async function updateMemberRole(userId: string, role: "owner" | "editor" | "viewer") {
  const teamId = selectedTeamId.value;

  if (!teamId) {
    return;
  }

  try {
    await updateTeamMemberRoleMutation.mutateAsync({ teamId, userId, role });
    await refreshTeamData();
    toast.add({
      title: "Role updated",
      description: "Member role has been updated.",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Failed to update role",
      description: error instanceof Error ? error.message : "Please try again.",
      color: "error",
    });
  }
}

async function removeMember(userId: string) {
  const teamId = selectedTeamId.value;

  if (!teamId) {
    return;
  }

  try {
    await removeTeamMemberMutation.mutateAsync({ teamId, userId });
    await Promise.all([refreshTeamData(), workspaceQuery.refetch()]);
    toast.add({
      title: "Member removed",
      description: "Member access has been revoked.",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Failed to remove member",
      description: error instanceof Error ? error.message : "Please try again.",
      color: "error",
    });
  }
}

function onMemberRoleChange(userId: string, event: Event) {
  const target = event.target as HTMLSelectElement | null;

  if (!target) {
    return;
  }

  const role = target.value;

  if (role !== "owner" && role !== "editor" && role !== "viewer") {
    return;
  }

  void updateMemberRole(userId, role);
}

async function shareSelectedNode() {
  if (!selectedNode.value || !selectedTeamId.value) {
    return;
  }

  try {
    await shareNodeMutation.mutateAsync({
      nodeId: selectedNode.value.id,
      teamId: selectedTeamId.value,
    });
    await workspaceQuery.refetch();
    toast.add({
      title: "Node shared",
      description: `${selectedNode.value.title} is now visible to team members.`,
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Failed to share node",
      description: error instanceof Error ? error.message : "Please try again.",
      color: "error",
    });
  }
}

async function unshareSelectedNode() {
  if (!selectedNode.value) {
    return;
  }

  try {
    await unshareNodeMutation.mutateAsync({ nodeId: selectedNode.value.id });
    await workspaceQuery.refetch();
    toast.add({
      title: "Node unshared",
      description: `${selectedNode.value.title} is private again.`,
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Failed to unshare node",
      description: error instanceof Error ? error.message : "Please try again.",
      color: "error",
    });
  }
}
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

    <aside
      class="fixed left-6 top-24 z-40 max-h-[calc(100vh-7rem)] rounded-2xl border border-neutral-200/60 bg-white/85 shadow-xl backdrop-blur-xl transition-all duration-300 dark:border-neutral-800/60 dark:bg-neutral-950/85"
      :class="isTeamAsideCompact ? 'w-14 p-2' : 'w-[24rem] overflow-y-auto p-4'"
    >
      <div v-if="isTeamAsideCompact" class="flex items-center justify-center">
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          aria-label="Expand team panel"
          @click="isTeamAsideCompact = false"
        >
          <UIcon name="i-lucide-users" class="size-4" />
        </button>
      </div>

      <template v-else>
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-xs font-bold uppercase tracking-[0.22em] text-neutral-500">Teams</h2>
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-medium text-neutral-500">{{ teams.length }} total</span>
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              aria-label="Compact team panel"
              @click="isTeamAsideCompact = true"
            >
              <UIcon name="i-lucide-users" class="size-4" />
            </button>
          </div>
        </div>

        <div class="mt-3 flex items-center gap-2">
        <input
          v-model="newTeamName"
          type="text"
          placeholder="New team name"
          class="h-9 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          @keydown.enter.prevent="createTeam"
        />
        <button
          type="button"
          class="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 px-3 text-xs font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          :disabled="createTeamMutation.isPending.value || !newTeamName.trim()"
          @click="createTeam"
        >
          Create
        </button>
        </div>

        <div class="mt-4">
          <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
            Share Target
          </label>
          <select
            v-model="selectedTeamId"
            class="h-9 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          >
            <option value="" disabled>Select a team</option>
            <option v-for="team in teams" :key="team.id" :value="team.id">
              {{ team.name }} ({{ team.role }})
            </option>
          </select>
        </div>

        <div class="mt-4 rounded-xl border border-neutral-200/80 bg-neutral-50/80 p-3 dark:border-neutral-800/80 dark:bg-neutral-900/70">
        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Team Details
        </p>

        <div v-if="selectedTeam" class="mt-2 space-y-3">
          <div class="flex items-center gap-2">
            <input
              v-model="teamNameDraft"
              type="text"
              class="h-9 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              :disabled="!canManageSelectedTeam"
            />
            <button
              type="button"
              class="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 px-3 text-xs font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
              :disabled="
                !canManageSelectedTeam ||
                updateTeamMutation.isPending.value ||
                !teamNameDraft.trim() ||
                teamNameDraft.trim() === selectedTeam.name
              "
              @click="saveTeamName"
            >
              Save
            </button>
          </div>

          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] text-neutral-500">Role: {{ selectedTeam.role }}</span>
            <button
              type="button"
              class="inline-flex h-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2.5 text-[11px] font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
              :disabled="!canManageSelectedTeam || deleteTeamMutation.isPending.value"
              @click="deleteSelectedTeam"
            >
              Delete Team
            </button>
          </div>
        </div>

        <p v-else class="mt-2 text-xs text-neutral-500">
          Select a team to manage members and permissions.
        </p>
        </div>

        <div class="mt-4 rounded-xl border border-neutral-200/80 bg-neutral-50/80 p-3 dark:border-neutral-800/80 dark:bg-neutral-900/70">
        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Members
        </p>

        <div v-if="selectedTeam" class="mt-2 space-y-3">
          <div class="flex items-center gap-2">
            <input
              v-model="memberEmail"
              type="email"
              placeholder="teammate@example.com"
              class="h-9 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              :disabled="!canManageSelectedTeam"
              @keydown.enter.prevent="addTeamMember"
            />
            <select
              v-model="memberRole"
              class="h-9 rounded-xl border border-neutral-200 bg-white px-2 text-xs text-neutral-900 focus:border-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              :disabled="!canManageSelectedTeam"
            >
              <option value="owner">Owner</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="button"
              class="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 px-2.5 text-xs font-semibold text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="
                !canManageSelectedTeam ||
                addTeamMemberMutation.isPending.value ||
                !memberEmail.trim()
              "
              @click="addTeamMember"
            >
              Add
            </button>
          </div>

          <div class="space-y-2">
            <div
              v-for="member in selectedTeamMembers"
              :key="member.userId"
              class="flex items-center gap-2 rounded-lg border border-neutral-200/80 bg-white/80 p-2 dark:border-neutral-700/80 dark:bg-neutral-950/80"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  {{ member.userName }}
                  <span v-if="member.userId === currentUserId" class="text-neutral-500">(You)</span>
                </p>
                <p class="truncate text-[11px] text-neutral-500">{{ member.userEmail }}</p>
              </div>
              <select
                :value="member.role"
                class="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-[11px] text-neutral-900 focus:border-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                :disabled="!canManageSelectedTeam || updateTeamMemberRoleMutation.isPending.value"
                @change="onMemberRoleChange(member.userId, $event)"
              >
                <option value="owner">Owner</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="button"
                class="inline-flex h-8 items-center justify-center rounded-lg border border-neutral-200 bg-white px-2 text-[11px] font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                :disabled="!canManageSelectedTeam || removeTeamMemberMutation.isPending.value"
                @click="removeMember(member.userId)"
              >
                Remove
              </button>
            </div>

            <p v-if="selectedTeamMembers.length === 0" class="text-xs text-neutral-500">
              No members yet.
            </p>
          </div>
        </div>

        <p v-else class="mt-2 text-xs text-neutral-500">
          Add a team first to invite members.
        </p>
        </div>

        <div class="mt-4 rounded-xl border border-neutral-200/80 bg-neutral-50/80 p-3 dark:border-neutral-800/80 dark:bg-neutral-900/70">
        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Selected Node
        </p>
        <p class="mt-1 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {{ selectedNode?.title ?? 'No node selected' }}
        </p>
        <p class="mt-1 text-xs text-neutral-500">
          {{
            selectedNode
              ? selectedNode.visibility === 'team'
                ? `Shared to ${selectedNode.teamId}`
                : 'Private node'
              : 'Click a node on canvas to share it.'
          }}
        </p>
        </div>

        <div class="mt-3 flex items-center gap-2">
        <button
          type="button"
          class="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-primary-600 px-3 text-xs font-semibold text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="
            !selectedNode ||
            !selectedTeamId ||
            shareNodeMutation.isPending.value ||
            teamListQuery.isLoading.value
          "
          @click="shareSelectedNode"
        >
          Share Node
        </button>
        <button
          type="button"
          class="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          :disabled="!selectedNode || selectedNode.visibility !== 'team' || unshareNodeMutation.isPending.value"
          @click="unshareSelectedNode"
        >
          Unshare
        </button>
        </div>
      </template>
    </aside>

    <!-- Floating Agent Chat Panel -->
    <div
      class="pointer-events-none fixed bottom-4 right-3 top-24 z-40 flex w-[min(26rem,calc(100vw-1.5rem))] flex-col transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] sm:bottom-6 sm:right-6"
      :class="
        isChatVisible ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-12 opacity-0'
      "
    >
      <div class="pointer-events-auto min-h-0 flex-1">
        <DashboardAgentChatPanel :nodes="nodes" @close="isChatVisible = false" />
      </div>
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

    <div v-if="isWorkspaceRefreshing" class="fixed right-6 top-8 z-60">
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
