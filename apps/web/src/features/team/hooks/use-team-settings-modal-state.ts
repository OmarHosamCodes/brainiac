import { useState } from "react";

type TeamRole = "owner" | "editor" | "viewer";

export function useTeamSettingsModalState() {
  const [nameDraft, setNameDraft] = useState("");
  const [nameDirty, setNameDirty] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("viewer");
  const [addingMember, setAddingMember] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null);
  const [deletingTeam, setDeletingTeam] = useState(false);

  return {
    nameDraft,
    setNameDraft,
    nameDirty,
    setNameDirty,
    savingName,
    setSavingName,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    addingMember,
    setAddingMember,
    confirmDelete,
    setConfirmDelete,
    confirmRemoveUserId,
    setConfirmRemoveUserId,
    deletingTeam,
    setDeletingTeam,
  };
}
