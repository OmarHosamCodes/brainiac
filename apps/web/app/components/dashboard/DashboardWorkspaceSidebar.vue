<script setup lang="ts">
import {
  dashboardCardClass,
  dashboardCardHeaderClass,
  dashboardCardIconClass,
  dashboardLabelClass,
  dashboardSectionClass,
} from "~/utils/dashboard-ui";
import { shellFocusRingClass } from "~/utils/app-shell-ui";

type TeamRole = "owner" | "editor" | "viewer";

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
  selectedTeamName: string;
  selectedTeamRole: TeamRole | null;
  memberCount: number;
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
  createTeam: [];
  openTeamSettings: [];
  toggleSelectedNodeSharing: [];
}>();

const createTeamOpen = ref(false);

const sidebarClass = computed(() =>
  props.compact
    ? "dashboard-sidebar-compact w-14 shrink-0"
    : "w-72 shrink-0 overflow-y-auto xl:w-80",
);

const canCreateTeam = computed(
  () => props.newTeamName.trim().length > 0 && !props.createTeamPending,
);

const hasSelectedTeam = computed(() => Boolean(props.selectedTeam));

const roleBadgeColor = computed(() => {
  switch (props.selectedTeamRole) {
    case "owner":
      return "primary";
    case "editor":
      return "neutral";
    case "viewer":
      return "neutral";
    default:
      return "neutral";
  }
});

const roleLabel = computed(() => {
  switch (props.selectedTeamRole) {
    case "owner":
      return "Owner";
    case "editor":
      return "Editor";
    case "viewer":
      return "Viewer";
    default:
      return null;
  }
});

const nodeShareStatus = computed(() => {
  if (!props.selectedNode) {
    return {
      label: "No node selected",
      hint: "Select a node on the canvas to manage sharing.",
      tone: "muted" as const,
    };
  }

  if (props.selectedNode.visibility === "team") {
    const teamLabel = props.selectedTeamName || "team";
    return {
      label: `Shared with ${teamLabel}`,
      hint: props.canManageSelectedNodeSharing
        ? "Visible to all team members."
        : "Team-shared node.",
      tone: "shared" as const,
    };
  }

  return {
    label: "Private",
    hint: props.canManageSelectedNodeSharing
      ? "Only you can access this node."
      : `Your ${props.selectedNodeTeamRole ?? "viewer"} role cannot change sharing.`,
    tone: "private" as const,
  };
});

function handleCreateTeam() {
  if (!canCreateTeam.value) return;
  emit("createTeam");
  createTeamOpen.value = false;
}
</script>

<template>
  <aside
    class="dashboard-sidebar flex flex-col border-r border-default bg-default"
    :class="sidebarClass"
  >
    <div v-if="compact" class="flex h-full flex-col items-center gap-2 py-3">
      <ShellTopbarIconButton
        icon="i-lucide-panel-left-open"
        aria-label="Expand team panel"
        @click="emit('update:compact', false)"
      />
      <div
        class="flex size-9 items-center justify-center rounded-xl border border-default bg-muted/40 text-muted"
        :title="selectedTeamName || 'Team'"
      >
        <UIcon name="i-lucide-users" class="size-4" />
      </div>
      <div
        v-if="selectedNode"
        class="flex size-9 items-center justify-center rounded-xl border border-default bg-muted/40 text-muted"
        :title="selectedNode.title ?? 'Selected node'"
      >
        <UIcon :name="isSelectedNodeShared ? 'i-lucide-globe' : 'i-lucide-lock'" class="size-4" />
      </div>
    </div>

    <template v-else>
      <header class="flex items-center justify-between gap-2 border-b border-default px-4 py-3">
        <div class="min-w-0">
          <p :class="dashboardLabelClass">Team</p>
          <p class="truncate text-sm font-semibold text-highlighted">
            {{ selectedTeamName || "No team selected" }}
          </p>
        </div>
        <ShellTopbarIconButton
          icon="i-lucide-panel-left-close"
          aria-label="Collapse team panel"
          @click="emit('update:compact', true)"
        />
      </header>

      <div class="flex flex-1 flex-col gap-4 p-4">
        <section v-if="hasSelectedTeam" :class="dashboardSectionClass">
          <div :class="dashboardCardClass">
            <div :class="dashboardCardHeaderClass">
              <div :class="dashboardCardIconClass">
                <UIcon name="i-lucide-users" class="size-4.5" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-highlighted">
                  {{ selectedTeamName }}
                </p>
                <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <UBadge v-if="roleLabel" :color="roleBadgeColor" variant="subtle" size="sm">
                    {{ roleLabel }}
                  </UBadge>
                  <span class="text-xs text-muted">
                    {{ memberCount }} {{ memberCount === 1 ? "member" : "members" }}
                  </span>
                </div>
              </div>
            </div>

            <p class="mt-3 text-xs leading-relaxed text-muted">
              {{
                canInvite
                  ? "Manage members, roles, and who can access shared nodes."
                  : "View team details. Owner role is required to manage members."
              }}
            </p>

            <UButton
              label="Team settings"
              icon="i-lucide-settings-2"
              color="neutral"
              variant="soft"
              block
              size="sm"
              class="mt-3"
              @click="emit('openTeamSettings')"
            />
          </div>
        </section>

        <section v-else-if="teamsCount === 0" :class="dashboardSectionClass">
          <div :class="[dashboardCardClass, 'text-center']">
            <div
              class="mx-auto flex size-11 items-center justify-center rounded-2xl border border-dashed border-default bg-muted/20 text-muted"
            >
              <UIcon name="i-lucide-users" class="size-5" />
            </div>
            <p class="mt-3 text-sm font-semibold text-highlighted">Create your first team</p>
            <p class="mt-1 text-xs text-muted">
              Teams let you share nodes and collaborate with others.
            </p>
          </div>
        </section>

        <section v-else :class="dashboardSectionClass">
          <div :class="dashboardCardClass">
            <USkeleton class="h-4 w-2/3 rounded-lg" />
            <USkeleton class="mt-3 h-9 w-full rounded-xl" />
          </div>
        </section>

        <section :class="dashboardSectionClass">
          <UPopover v-model:open="createTeamOpen" :content="{ align: 'start', side: 'bottom' }">
            <UButton
              label="New team"
              icon="i-lucide-plus"
              color="neutral"
              variant="outline"
              block
              size="sm"
              :class="shellFocusRingClass"
            />

            <template #content>
              <div class="w-64 space-y-3 p-3">
                <p class="text-sm font-semibold text-highlighted">Create team</p>
                <UInput
                  :model-value="newTeamName"
                  type="text"
                  placeholder="Team name"
                  size="sm"
                  autofocus
                  @update:model-value="emit('update:newTeamName', String($event ?? ''))"
                  @keydown.enter.prevent="handleCreateTeam"
                />
                <div class="flex justify-end gap-2">
                  <UButton
                    label="Cancel"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    @click="createTeamOpen = false"
                  />
                  <UButton
                    label="Create"
                    color="primary"
                    size="sm"
                    :loading="createTeamPending"
                    :disabled="!canCreateTeam"
                    @click="handleCreateTeam"
                  />
                </div>
              </div>
            </template>
          </UPopover>

          <p v-if="teamsCount > 0" class="text-center text-[11px] text-muted">
            {{ teamsCount }} {{ teamsCount === 1 ? "team" : "teams" }} in workspace
          </p>
        </section>

        <section :class="dashboardSectionClass">
          <p :class="dashboardLabelClass">Selected node</p>

          <div :class="dashboardCardClass">
            <div :class="dashboardCardHeaderClass">
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-default bg-default text-muted"
              >
                <UIcon
                  :name="selectedNode ? 'i-lucide-box' : 'i-lucide-mouse-pointer-click'"
                  class="size-4.5"
                />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-highlighted">
                  {{ selectedNode?.title ?? "Nothing selected" }}
                </p>
                <div class="mt-1.5 flex items-center gap-1.5">
                  <span
                    class="inline-block size-1.5 rounded-full"
                    :class="
                      nodeShareStatus.tone === 'shared'
                        ? 'bg-success'
                        : nodeShareStatus.tone === 'private'
                          ? 'bg-muted'
                          : 'bg-transparent'
                    "
                    aria-hidden="true"
                  />
                  <span class="text-xs font-medium text-muted">{{ nodeShareStatus.label }}</span>
                </div>
              </div>
            </div>

            <p class="mt-3 text-xs leading-relaxed text-muted">
              {{ nodeShareStatus.hint }}
            </p>

            <UButton
              v-if="canManageSelectedNodeSharing"
              :label="nodeShareActionLabel"
              :icon="isSelectedNodeShared ? 'i-lucide-lock' : 'i-lucide-share-2'"
              block
              size="sm"
              class="mt-3"
              :color="isSelectedNodeShared ? 'neutral' : 'primary'"
              :variant="isSelectedNodeShared ? 'outline' : 'solid'"
              :loading="isNodeShareActionPending"
              :disabled="nodeShareActionDisabled"
              :aria-busy="isNodeShareActionPending"
              @click="emit('toggleSelectedNodeSharing')"
            />
          </div>
        </section>
      </div>
    </template>
  </aside>
</template>
