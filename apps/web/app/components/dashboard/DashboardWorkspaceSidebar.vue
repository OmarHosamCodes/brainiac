<script setup lang="ts">
import { dashboardLabelClass, dashboardPanelClass } from "~/utils/dashboard-ui";

type TeamOption = {
  label: string;
  value: string;
};

type DashboardSelectedNode = {
  title?: string | null;
  visibility?: string | null;
  teamId?: string | null;
};

const props = defineProps<{
  compact: boolean;
  teamsCount: number;
  newTeamName: string;
  createTeamPending?: boolean;
  selectedTeamId: string;
  selectedTeamName: string;
  teamItems: TeamOption[];
  selectedTeam: unknown;
  selectedNode: DashboardSelectedNode | null;
  canInvite: boolean;
  canManageSelectedNodeSharing: boolean;
  selectedNodeTeamRole: string | null;
  isSelectedNodeShared: boolean;
  isNodeShareActionPending: boolean;
  nodeShareActionLabel: string;
  nodeShareActionDisabled: boolean;
}>();

const emit = defineEmits<{
  "update:compact": [value: boolean];
  "update:newTeamName": [value: string];
  "update:selectedTeamId": [value: string];
  createTeam: [];
  openTeamSettings: [];
  toggleSelectedNodeSharing: [];
}>();

const sidebarClass = computed(() =>
  props.compact ? "dashboard-sidebar-compact w-14" : "w-[22rem] overflow-y-auto px-4 py-4 xl:w-[23rem]",
);

const canCreateTeam = computed(
  () => props.newTeamName.trim().length > 0 && !props.createTeamPending,
);

const nodeShareStatus = computed(() => {
  if (!props.selectedNode) {
    return "Click a node on the canvas to share it.";
  }

  if (props.selectedNode.visibility === "team") {
    if (props.canManageSelectedNodeSharing) {
      const teamLabel = props.selectedTeamName || "team";
      return `Shared to ${teamLabel}`;
    }
    return "Team-shared node";
  }

  return "Private node";
});
</script>

<template>
  <aside
    class="dashboard-sidebar border-r border-default bg-elevated"
    :class="sidebarClass"
  >
    <div v-if="compact" class="flex h-full flex-col items-center gap-3 py-4">
      <UButton
        icon="i-lucide-users"
        variant="ghost"
        color="neutral"
        size="md"
        square
        aria-label="Expand workspace sidebar"
        @click="emit('update:compact', false)"
      />
      <span
        class="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted [writing-mode:vertical-rl]"
      >
        Team
      </span>
    </div>

    <template v-else>
      <div class="flex items-center justify-between gap-3">
        <h2 :class="dashboardLabelClass">Workspace</h2>
        <div class="flex items-center gap-2">
          <span class="text-[11px] font-medium text-muted">{{ teamsCount }} total</span>
          <UButton
            icon="i-lucide-panel-left-close"
            variant="ghost"
            color="neutral"
            size="sm"
            square
            aria-label="Compact workspace sidebar"
            @click="emit('update:compact', true)"
          />
        </div>
      </div>

      <div class="mt-4 flex items-center gap-2">
        <UInput
          :model-value="newTeamName"
          type="text"
          placeholder="New team name"
          size="sm"
          class="flex-1"
          @update:model-value="emit('update:newTeamName', String($event ?? ''))"
          @keydown.enter.prevent="canCreateTeam && emit('createTeam')"
        />
        <UButton
          label="Create"
          color="neutral"
          variant="soft"
          size="sm"
          :loading="createTeamPending"
          :disabled="!canCreateTeam"
          @click="emit('createTeam')"
        />
      </div>

      <div class="mt-4">
        <label :class="['mb-1 block', dashboardLabelClass]"> Team for sharing </label>
        <USelectMenu
          :model-value="selectedTeamId"
          :items="teamItems"
          value-key="value"
          placeholder="Select a team"
          size="sm"
          class="w-full"
          :search-input="{ placeholder: 'Find team' }"
          @update:model-value="emit('update:selectedTeamId', String($event ?? ''))"
        />
        <p class="mt-1.5 text-xs text-muted">Nodes you share will appear in this team.</p>
      </div>

      <section :class="dashboardPanelClass">
        <p :class="dashboardLabelClass">Team management</p>

        <p class="mt-2 text-xs text-muted">
          Open team settings to manage members and access rules.
        </p>

        <UButton
          label="Manage team"
          color="primary"
          variant="solid"
          block
          size="sm"
          class="mt-3"
          :disabled="!selectedTeam"
          @click="emit('openTeamSettings')"
        />

        <div v-if="selectedTeam && !canInvite" class="mt-3 flex items-center gap-2">
          <UBadge color="neutral" variant="subtle" size="sm">Requires owner</UBadge>
          <p class="text-xs text-muted">Owner role is required for member and role changes.</p>
        </div>
      </section>

      <section :class="dashboardPanelClass">
        <p :class="dashboardLabelClass">Selected node</p>
        <p class="mt-1 truncate text-sm font-semibold text-highlighted">
          {{ selectedNode?.title ?? "No node selected" }}
        </p>
        <p class="mt-1 text-xs text-muted">
          {{ nodeShareStatus }}
        </p>
        <p v-if="selectedNode && !canManageSelectedNodeSharing" class="mt-1 text-xs text-muted">
          Role {{ selectedNodeTeamRole ?? "viewer" }} can edit content, but only owners can change
          sharing.
        </p>
      </section>

      <div v-if="canManageSelectedNodeSharing" class="mt-4">
        <UButton
          :label="nodeShareActionLabel"
          block
          size="sm"
          :color="isSelectedNodeShared ? 'neutral' : 'primary'"
          :variant="isSelectedNodeShared ? 'outline' : 'solid'"
          :loading="isNodeShareActionPending"
          :disabled="nodeShareActionDisabled"
          :aria-busy="isNodeShareActionPending"
          @click="emit('toggleSelectedNodeSharing')"
        />
      </div>
    </template>
  </aside>
</template>

<style scoped>
.dashboard-sidebar {
  transition: width 0.2s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-sidebar {
    transition: none;
  }
}
</style>
