import { useMemo, useState } from "react";

import { formatTaskAssigneeLabel } from "@brainiac/api/schemas/agency-ops";
import type { AgencyTaskThreadMember } from "@/lib/schemas/agency-work";
import { UNASSIGNED_ASSIGNEE_VALUE } from "@/stores/agency-task-list";

type AgencyMemberChooserBaseOptions = {
  members: AgencyTaskThreadMember[];
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentAlign?: "start" | "center" | "end";
};

type SingleAgencyMemberChooserOptions = AgencyMemberChooserBaseOptions & {
  mode?: "single";
  value: string;
  onValueChange: (value: string) => void;
  allowUnassigned?: boolean;
};

type MultipleAgencyMemberChooserOptions = AgencyMemberChooserBaseOptions & {
  mode: "multiple";
  assignedToTeam: boolean;
  selectedUserIds: string[];
  onAssignedToTeamChange: (assignedToTeam: boolean) => void;
  onSelectedUserIdsChange: (userIds: string[]) => void;
};

export type UseAgencyMemberChooserOptions =
  | SingleAgencyMemberChooserOptions
  | MultipleAgencyMemberChooserOptions;

export type AgencyMemberChooserViewModel = {
  mode: "single" | "multiple";
  disabled: boolean;
  loading: boolean;
  placeholder: string;
  searchPlaceholder: string;
  className?: string;
  contentAlign: "start" | "center" | "end";
  open: boolean;
  searchTerm: string;
  filteredMembers: AgencyTaskThreadMember[];
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  triggerLabel: string;
  single?: {
    value: string;
    allowUnassigned: boolean;
    selectedMember: AgencyTaskThreadMember | null;
    isUnassigned: boolean;
    onSelectMember: (userId: string) => void;
  };
  multiple?: {
    assignedToTeam: boolean;
    selectedUserIds: string[];
    onToggleEntireTeam: () => void;
    onToggleMember: (userId: string) => void;
    isMemberSelected: (userId: string) => boolean;
  };
};

function buildMultipleTriggerLabel(
  members: AgencyTaskThreadMember[],
  assignedToTeam: boolean,
  selectedUserIds: string[],
): string {
  if (assignedToTeam) return "Entire team";

  const selectedMembers = selectedUserIds
    .map((userId) => members.find((member) => member.userId === userId))
    .filter((member): member is AgencyTaskThreadMember => Boolean(member));

  return formatTaskAssigneeLabel({
    assignedToTeam: false,
    assignees: selectedMembers.map((member) => ({ userName: member.userName })),
  });
}

export function useAgencyMemberChooser(
  options: UseAgencyMemberChooserOptions,
): AgencyMemberChooserViewModel {
  const {
    members,
    disabled = false,
    loading = false,
    placeholder = "Assignee",
    searchPlaceholder = "Search members",
    className,
    open: controlledOpen,
    onOpenChange,
    contentAlign = "start",
  } = options;

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const open = controlledOpen ?? uncontrolledOpen;

  function setOpen(nextOpen: boolean) {
    onOpenChange?.(nextOpen);
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    if (!nextOpen) {
      setSearchTerm("");
    }
  }

  const filteredMembers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => member.userName.toLowerCase().includes(query));
  }, [members, searchTerm]);

  if (options.mode === "multiple") {
    const {
      assignedToTeam,
      selectedUserIds,
      onAssignedToTeamChange,
      onSelectedUserIdsChange,
    } = options;

    function toggleEntireTeam() {
      const nextAssignedToTeam = !assignedToTeam;
      onAssignedToTeamChange(nextAssignedToTeam);
      if (nextAssignedToTeam) {
        onSelectedUserIdsChange([]);
      }
      setOpen(false);
    }

    function toggleMember(userId: string) {
      if (assignedToTeam) {
        onAssignedToTeamChange(false);
        onSelectedUserIdsChange([userId]);
        return;
      }

      const next = selectedUserIds.includes(userId)
        ? selectedUserIds.filter((id: string) => id !== userId)
        : [...selectedUserIds, userId];
      onSelectedUserIdsChange(next);
    }

    return {
      mode: "multiple" as const,
      disabled,
      loading,
      placeholder,
      searchPlaceholder,
      className,
      contentAlign,
      open,
      searchTerm,
      filteredMembers,
      triggerLabel: buildMultipleTriggerLabel(members, assignedToTeam, selectedUserIds),
      onOpenChange: setOpen,
      onSearchChange: setSearchTerm,
      multiple: {
        assignedToTeam,
        selectedUserIds,
        onToggleEntireTeam: toggleEntireTeam,
        onToggleMember: toggleMember,
        isMemberSelected: (userId) => !assignedToTeam && selectedUserIds.includes(userId),
      },
    };
  }

  const { value, onValueChange, allowUnassigned = true } = options;
  const isUnassigned = value === UNASSIGNED_ASSIGNEE_VALUE || !value;
  const selectedMember = useMemo(
    () => (isUnassigned ? null : (members.find((member) => member.userId === value) ?? null)),
    [isUnassigned, members, value],
  );

  function selectMember(userId: string) {
    onValueChange(userId);
    setOpen(false);
  }

  const triggerLabel = loading
    ? "Loading…"
    : selectedMember
      ? selectedMember.userName
      : isUnassigned
        ? "Unassigned"
        : placeholder;

  return {
    mode: "single" as const,
    disabled,
    loading,
    placeholder,
    searchPlaceholder,
    className,
    contentAlign,
    open,
    searchTerm,
    filteredMembers,
    triggerLabel,
    onOpenChange: setOpen,
    onSearchChange: setSearchTerm,
    single: {
      value,
      allowUnassigned,
      selectedMember,
      isUnassigned,
      onSelectMember: selectMember,
    },
  };
}
