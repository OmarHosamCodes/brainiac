import { useMemo, useState } from "react";

import type { AgencyTaskThreadMember } from "@/lib/schemas/agency-work";
import { UNASSIGNED_ASSIGNEE_VALUE } from "@/stores/agency-task-list";

type UseAgencyMemberChooserOptions = {
  value: string;
  onValueChange: (value: string) => void;
  members: AgencyTaskThreadMember[];
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentAlign?: "start" | "center" | "end";
  allowUnassigned?: boolean;
};

export type AgencyMemberChooserViewModel = {
  value: string;
  disabled: boolean;
  loading: boolean;
  placeholder: string;
  searchPlaceholder: string;
  className?: string;
  contentAlign: "start" | "center" | "end";
  allowUnassigned: boolean;
  open: boolean;
  searchTerm: string;
  selectedMember: AgencyTaskThreadMember | null;
  isUnassigned: boolean;
  filteredMembers: AgencyTaskThreadMember[];
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelectMember: (userId: string) => void;
};

export function useAgencyMemberChooser({
  value,
  onValueChange,
  members,
  disabled = false,
  loading = false,
  placeholder = "Assignee",
  searchPlaceholder = "Search members",
  className,
  open: controlledOpen,
  onOpenChange,
  contentAlign = "start",
  allowUnassigned = true,
}: UseAgencyMemberChooserOptions): AgencyMemberChooserViewModel {
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

  const isUnassigned = value === UNASSIGNED_ASSIGNEE_VALUE || !value;

  const selectedMember = useMemo(
    () => (isUnassigned ? null : (members.find((member) => member.userId === value) ?? null)),
    [isUnassigned, members, value],
  );

  const filteredMembers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => member.userName.toLowerCase().includes(query));
  }, [members, searchTerm]);

  function selectMember(userId: string) {
    onValueChange(userId);
    setOpen(false);
  }

  return {
    value,
    disabled,
    loading,
    placeholder,
    searchPlaceholder,
    className,
    contentAlign,
    allowUnassigned,
    open,
    searchTerm,
    selectedMember,
    isUnassigned,
    filteredMembers,
    onOpenChange: setOpen,
    onSearchChange: setSearchTerm,
    onSelectMember: selectMember,
  };
}
