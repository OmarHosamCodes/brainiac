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

const props = defineProps<{
  members: TeamMember[];
  currentUserId: string;
  canModifyRoles: boolean;
  canRemoveMembers: boolean;
  updateRolePending: boolean;
  removeMemberPending: boolean;
}>();

const emit = defineEmits<{
  "role-change": [payload: { userId: string; role: TeamRole }];
  "remove-member": [userId: string];
}>();

const columns = [
  {
    accessorKey: "userName",
    header: "Member",
  },
  {
    accessorKey: "userEmail",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
  },
  {
    id: "actions",
    header: "Actions",
  },
];

function handleRoleChange(userId: string, event: Event) {
  const target = event.target as HTMLSelectElement | null;

  if (!target) {
    return;
  }

  const role = target.value;

  if (role !== "owner" && role !== "editor" && role !== "viewer") {
    return;
  }

  emit("role-change", { userId, role });
}

function getRoleBadgeColor(role: TeamRole) {
  if (role === "owner") {
    return "primary" as const;
  }

  if (role === "editor") {
    return "success" as const;
  }

  return "neutral" as const;
}
</script>

<template>
  <div class="space-y-3">
    <UAlert
      v-if="props.members.length === 0"
      color="neutral"
      variant="soft"
      icon="i-lucide-users"
      title="No members yet"
      description="Invite teammates to collaborate on this team's shared workspace nodes."
    />

    <UTable
      v-else
      :data="props.members"
      :columns="columns"
      :ui="{
        th: 'text-[11px] font-semibold uppercase tracking-[0.12em] text-muted',
        td: 'align-middle',
      }"
    >
      <template #userName-cell="{ row }">
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-highlighted">
            {{ row.original.userName }}
            <span
              v-if="row.original.userId === props.currentUserId"
              class="ml-1 text-xs font-medium text-muted"
            >
              (You)
            </span>
          </p>
        </div>
      </template>

      <template #userEmail-cell="{ row }">
        <p class="truncate text-sm text-muted">{{ row.original.userEmail }}</p>
      </template>

      <template #role-cell="{ row }">
        <div class="flex flex-wrap items-center gap-2">
          <UBadge :color="getRoleBadgeColor(row.original.role)" variant="soft" size="sm">
            {{ row.original.role }}
          </UBadge>
          <select
            :value="row.original.role"
            class="h-8 min-w-24 rounded-lg border border-muted bg-default px-2 text-xs text-highlighted focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!props.canModifyRoles || props.updateRolePending"
            @change="handleRoleChange(row.original.userId, $event)"
          >
            <option value="owner">Owner</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>

          <UBadge v-if="!props.canModifyRoles" color="neutral" variant="subtle" size="sm">
            Requires Owner
          </UBadge>
        </div>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex flex-wrap items-center justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            :disabled="!props.canRemoveMembers || props.removeMemberPending"
            @click="emit('remove-member', row.original.userId)"
          >
            Remove
          </UButton>

          <UBadge v-if="!props.canRemoveMembers" color="neutral" variant="subtle" size="sm">
            Requires Owner
          </UBadge>
        </div>
      </template>
    </UTable>
  </div>
</template>
