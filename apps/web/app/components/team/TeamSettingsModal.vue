<script setup lang="ts">
type TeamRole = "owner" | "editor" | "viewer";

type TeamMember = {
  teamId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: TeamRole;
  joinedAt: string;
  updatedAt: string;
};

type TeamDetail = {
  id: string;
  name: string;
  role: TeamRole;
  createdByUserId: string;
  updatedAt: string;
  members: TeamMember[];
};

const props = defineProps<{
  open: boolean;
  selectedTeam: TeamDetail | null;
  teamNameDraft: string;
  memberEmail: string;
  memberRole: TeamRole;
  canInvite: boolean;
  canDeleteTeam: boolean;
  canModifyRoles: boolean;
  canRemoveMembers: boolean;
  addMemberPending: boolean;
  updateTeamPending: boolean;
  deleteTeamPending: boolean;
  updateRolePending: boolean;
  removeMemberPending: boolean;
  currentUserId: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  "update:teamNameDraft": [value: string];
  "update:memberEmail": [value: string];
  "update:memberRole": [value: TeamRole];
  "save-team-name": [];
  "delete-team": [];
  "add-member": [];
  "role-change": [payload: { userId: string; role: TeamRole }];
  "remove-member": [userId: string];
}>();

const canSaveTeamName = computed(() => {
  if (!props.selectedTeam) {
    return false;
  }

  return props.teamNameDraft.trim().length > 0 && props.teamNameDraft.trim() !== props.selectedTeam.name;
});

const selectedRoleDescription = computed(() => {
  if (!props.selectedTeam) {
    return "";
  }

  if (props.selectedTeam.role === "owner") {
    return "Owners can manage members, roles, and sharing controls.";
  }

  if (props.selectedTeam.role === "editor") {
    return "Editors can collaborate on shared nodes but cannot manage team permissions.";
  }

  return "Viewers can access shared nodes with restricted team management actions.";
});

function handleMemberRoleChange(event: Event) {
  const target = event.target as HTMLSelectElement | null;

  if (!target) {
    return;
  }

  const role = target.value;

  if (role !== "owner" && role !== "editor" && role !== "viewer") {
    return;
  }

  emit("update:memberRole", role);
}
</script>

<template>
  <UModal
    :open="props.open"
    title="Team Settings"
    description="Manage members, roles, and team-level permissions from one dedicated panel."
    :ui="{
      content: 'sm:max-w-4xl rounded-[28px] overflow-hidden',
      body: 'space-y-6 p-6',
      footer: 'flex items-center justify-end gap-3 border-t border-muted/20 bg-elevated/20 p-4',
    }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <UAlert
        v-if="!props.selectedTeam"
        color="neutral"
        variant="soft"
        icon="i-lucide-users"
        title="Select a team first"
        description="Choose a team from the sidebar, then reopen Team Settings to manage members and permissions."
      />

      <template v-else>
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-muted/30 bg-elevated/20 p-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted">Current Team</p>
            <h3 class="mt-1 text-lg font-semibold text-highlighted">{{ props.selectedTeam.name }}</h3>
            <p class="mt-1 text-xs text-muted">{{ selectedRoleDescription }}</p>
          </div>
          <UBadge color="neutral" variant="soft" size="sm">
            Role: {{ props.selectedTeam.role }}
          </UBadge>
        </div>

        <div class="rounded-2xl border border-muted/30 bg-default/60 p-4">
          <p class="text-sm font-semibold text-highlighted">Team Details</p>
          <p class="mt-1 text-sm text-muted">
            Rename the team or remove it if it is no longer needed.
          </p>

          <div class="mt-4 flex flex-wrap items-center gap-2">
            <UInput
              :model-value="props.teamNameDraft"
              class="min-w-52 flex-1"
              placeholder="Team name"
              :disabled="!props.canInvite"
              @update:model-value="emit('update:teamNameDraft', $event ?? '')"
            />
            <UButton
              color="neutral"
              :disabled="!props.canInvite || props.updateTeamPending || !canSaveTeamName"
              @click="emit('save-team-name')"
            >
              Save Name
            </UButton>
          </div>

          <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
            <UButton
              v-if="props.canDeleteTeam"
              color="error"
              variant="soft"
              :disabled="props.deleteTeamPending"
              @click="emit('delete-team')"
            >
              Delete Team
            </UButton>

            <div v-else class="flex items-center gap-2">
              <UBadge color="neutral" variant="subtle" size="sm">Requires Owner</UBadge>
              <p class="text-xs text-muted">Only owners can delete teams.</p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-muted/30 bg-default/60 p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="text-sm font-semibold text-highlighted">Members</p>
              <p class="mt-1 text-sm text-muted">Invite teammates and tune role access.</p>
            </div>

            <UBadge color="neutral" variant="soft" size="sm">
              {{ props.selectedTeam.members.length }} members
            </UBadge>
          </div>

          <div v-if="props.canInvite" class="mt-4 flex flex-wrap items-center gap-2">
            <UInput
              :model-value="props.memberEmail"
              class="min-w-56 flex-1"
              placeholder="teammate@example.com"
              @update:model-value="emit('update:memberEmail', $event ?? '')"
            />

            <select
              :value="props.memberRole"
              class="h-8 rounded-lg border border-muted bg-default px-2 text-xs text-highlighted focus:border-primary focus:outline-none"
              @change="handleMemberRoleChange"
            >
              <option value="owner">Owner</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>

            <UButton
              color="primary"
              :disabled="props.addMemberPending || !props.memberEmail.trim()"
              @click="emit('add-member')"
            >
              Add Member
            </UButton>
          </div>

          <div v-else class="mt-4 flex items-center gap-2">
            <UBadge color="neutral" variant="subtle" size="sm">Requires Owner</UBadge>
            <p class="text-xs text-muted">Only owners can invite new members.</p>
          </div>

          <div class="mt-4">
            <TeamMemberList
              :members="props.selectedTeam.members"
              :current-user-id="props.currentUserId"
              :can-modify-roles="props.canModifyRoles"
              :can-remove-members="props.canRemoveMembers"
              :update-role-pending="props.updateRolePending"
              :remove-member-pending="props.removeMemberPending"
              @role-change="emit('role-change', $event)"
              @remove-member="emit('remove-member', $event)"
            />
          </div>
        </div>
      </template>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" @click="emit('update:open', false)">Close</UButton>
    </template>
  </UModal>
</template>
