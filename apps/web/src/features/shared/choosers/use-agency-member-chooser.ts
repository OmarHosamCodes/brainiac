import { useMemo, useState } from "react";

import { formatTaskAssigneeLabel } from "@brainiac/api/schemas/agency-ops";
import type { AgencyTaskThreadMember } from "@/features/task-management/agency-work";
import { UNASSIGNED_ASSIGNEE_VALUE } from "@/features/task-management/stores/agency-task-list";

type AgencyMemberChooserBaseOptions = {
  members: AgencyTaskThreadMember[];
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  /** default: labeled pill. stack: overlapping avatars + plus (multiple mode). */
  triggerVariant?: "default" | "stack";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentAlign?: "start" | "center" | "end";
};

type SingleAgencyMemberChooserOptions = AgencyMemberChooserBaseOptions & {
  mode?: "single";
  value: string;
  onValueChange: (value: string) => void;
  allowUnassigned?: boolean;
  allowEmpty?: boolean;
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
  triggerVariant: "default" | "stack";
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
    allowEmpty: boolean;
    selectedMember: AgencyTaskThreadMember | null;
    isUnassigned: boolean;
    onSelectUnassigned: () => void;
    onSelectMember: (userId: string) => void;
    onClearSelection: () => void;
  };
  multiple?: {
    assignedToTeam: boolean;
    selectedUserIds: string[];
    selectedMembers: AgencyTaskThreadMember[];
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
    triggerVariant = "default",
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
    const { assignedToTeam, selectedUserIds, onAssignedToTeamChange, onSelectedUserIdsChange } =
      options;

    function toggleEntireTeam() {
      // Parent clears selectedUserIds when assignedToTeam becomes true.
      onAssignedToTeamChange(!assignedToTeam);
      setOpen(false);
    }

    function toggleMember(userId: string) {
      // Parent clears assignedToTeam when member selection changes.
      const baseIds = assignedToTeam ? [] : selectedUserIds;
      const next = baseIds.includes(userId)
        ? baseIds.filter((id: string) => id !== userId)
        : [...baseIds, userId];
      onSelectedUserIdsChange(next);
    }

    const selectedMembers = selectedUserIds
      .map((userId) => members.find((member) => member.userId === userId))
      .filter((member): member is AgencyTaskThreadMember => Boolean(member));

    return {
      mode: "multiple" as const,
      disabled,
      loading,
      placeholder,
      searchPlaceholder,
      className,
      triggerVariant,
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
        selectedMembers,
        onToggleEntireTeam: toggleEntireTeam,
        onToggleMember: toggleMember,
        isMemberSelected: (userId) => !assignedToTeam && selectedUserIds.includes(userId),
      },
    };
  }

  const { value, onValueChange, allowUnassigned = true, allowEmpty = false } = options;
  const isUnassigned = !allowEmpty && (value === UNASSIGNED_ASSIGNEE_VALUE || !value);
  const selectedMember = useMemo(
    () =>
      isUnassigned || !value ? null : (members.find((member) => member.userId === value) ?? null),
    [isUnassigned, members, value],
  );

  function selectMember(userId: string) {
    onValueChange(userId);
    setOpen(false);
  }

  function clearSelection() {
    onValueChange("");
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
    triggerVariant,
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
      allowEmpty,
      selectedMember,
      isUnassigned,
      onSelectUnassigned: () => selectMember(UNASSIGNED_ASSIGNEE_VALUE),
      onSelectMember: selectMember,
      onClearSelection: clearSelection,
    },
  };
}
