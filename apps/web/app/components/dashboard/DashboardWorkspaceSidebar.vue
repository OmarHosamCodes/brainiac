<script setup lang="ts">
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
  selectedTeamId: string;
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
  props.compact ? "w-14" : "w-[22rem] overflow-y-auto px-4 py-4 xl:w-[23rem]",
);
</script>

<template>
  <aside
    class="border-r border-neutral-200/80 bg-white/96 transition-[width] duration-200 ease-out dark:border-neutral-800/80 dark:bg-neutral-950/92"
    :class="sidebarClass"
  >
    <div v-if="compact" class="flex h-full flex-col items-center gap-3 py-4">
      <UButton
        icon="i-lucide-users"
        variant="ghost"
        color="neutral"
        size="md"
        square
        class="rounded-2xl"
        aria-label="Expand workspace sidebar"
        @click="emit('update:compact', false)"
      />
      <span
        class="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500 [writing-mode:vertical-rl]"
      >
        Team
      </span>
    </div>

    <template v-else>
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Workspace</h2>
        <div class="flex items-center gap-2">
          <span class="text-[11px] font-medium text-neutral-500">{{ teamsCount }} total</span>
          <UButton
            icon="i-lucide-panel-left-close"
            variant="ghost"
            color="neutral"
            size="sm"
            square
            class="rounded-xl"
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
          @keydown.enter.prevent="emit('createTeam')"
        />
        <UButton
          label="Create"
          color="neutral"
          variant="soft"
          size="sm"
          @click="emit('createTeam')"
        />
      </div>

      <div class="mt-4">
        <label
          class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-500"
        >
          Share Target
        </label>
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
      </div>

      <div
        class="mt-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-3 dark:border-neutral-800/80 dark:bg-neutral-900/70"
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
          @click="emit('openTeamSettings')"
        />

        <div v-if="selectedTeam && !canInvite" class="mt-3 flex items-center gap-2">
          <UBadge color="neutral" variant="subtle" size="sm">Requires Owner</UBadge>
          <p class="text-xs text-neutral-500">
            Owner role is required for member and role changes.
          </p>
        </div>
      </div>

      <div
        class="mt-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-3 dark:border-neutral-800/80 dark:bg-neutral-900/70"
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
          @click="emit('toggleSelectedNodeSharing')"
        />
      </div>
    </template>
  </aside>
</template>
