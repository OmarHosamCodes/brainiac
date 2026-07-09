import { Loader2, Mail, MoreHorizontal, Trash2, UserMinus, Users } from "lucide-react";
import { useMemo, useState } from "react";

import type { workspaceTeamRoleSchema } from "@brainiac/workspace";
import type { z } from "zod";

import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { authClient } from "@/lib/auth-client";
import {
  dashboardCardClass,
  dashboardCardHeaderClass,
  dashboardCardIconClass,
  dashboardLabelClass,
  dashboardSectionClass,
} from "@/lib/utils/dashboard-ui";
import { shellFocusRingClass } from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";
import { deriveTeamPermissions, useTeamStore } from "@/stores/team";

type TeamRole = z.infer<typeof workspaceTeamRoleSchema>;

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

type TeamSettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamDetail | null;
  onRefetchWorkspace: () => Promise<unknown>;
};

const roleOptions: Array<{ value: TeamRole; label: string }> = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "owner", label: "Owner" },
];

export function TeamSettingsModal({
  open,
  onOpenChange,
  team,
  onRefetchWorkspace,
}: TeamSettingsModalProps) {
  const session = authClient.useSession();
  const currentUserId = session.data?.user?.id ?? "";

  const saveTeamName = useTeamStore((s) => s.saveTeamName);
  const deleteSelectedTeam = useTeamStore((s) => s.deleteSelectedTeam);
  const addTeamMember = useTeamStore((s) => s.addTeamMember);
  const updateMemberRole = useTeamStore((s) => s.updateMemberRole);
  const removeMember = useTeamStore((s) => s.removeMember);
  const setMemberEmail = useTeamStore((s) => s.setMemberEmail);
  const setMemberRole = useTeamStore((s) => s.setMemberRole);

  const [nameDraft, setNameDraft] = useState("");
  const [nameDirty, setNameDirty] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("viewer");
  const [addingMember, setAddingMember] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null);
  const [deletingTeam, setDeletingTeam] = useState(false);

  const teamRole = team?.role ?? null;
  const perms = deriveTeamPermissions(teamRole);
  const displayMemberCount = team?.members.length ?? 0;

  const sortedMembers = useMemo(() => {
    if (!team) return [];
    const roleRank: Record<TeamRole, number> = { owner: 0, editor: 1, viewer: 2 };
    return [...team.members].sort(
      (a, b) => roleRank[a.role] - roleRank[b.role] || a.userName.localeCompare(b.userName),
    );
  }, [team]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setNameDraft("");
      setNameDirty(false);
      setInviteEmail("");
      setInviteRole("viewer");
      setConfirmDelete(false);
      setConfirmRemoveUserId(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleSaveName() {
    if (!team || !nameDraft.trim() || !nameDirty) return;
    setSavingName(true);
    try {
      await saveTeamName(team.id, nameDraft.trim());
      setNameDirty(false);
    } finally {
      setSavingName(false);
    }
  }

  async function handleAddMember() {
    if (!team || !inviteEmail.trim()) return;
    setMemberEmail(inviteEmail.trim());
    setMemberRole(inviteRole);
    setAddingMember(true);
    try {
      await addTeamMember(team.id);
      setInviteEmail("");
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!team) return;
    setConfirmRemoveUserId(null);
    await removeMember(team.id, userId, onRefetchWorkspace);
  }

  async function handleRoleChange(userId: string, role: TeamRole) {
    if (!team) return;
    await updateMemberRole(team.id, userId, role);
  }

  async function handleDeleteTeam() {
    if (!team) return;
    setDeletingTeam(true);
    try {
      await deleteSelectedTeam(team.id, onRefetchWorkspace);
      handleOpenChange(false);
    } finally {
      setDeletingTeam(false);
    }
  }

  if (!team) return null;

  const actionButtonDisabled = addingMember || !inviteEmail.trim();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Team settings</DialogTitle>
          <DialogDescription>
            Manage {team.name} — members, roles, and permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* General */}
          <section className={dashboardSectionClass}>
            <div className={dashboardCardClass}>
              <div className={dashboardCardHeaderClass}>
                <div className={dashboardCardIconClass}>
                  <Users className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={dashboardLabelClass}>Team</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">
                      {teamRole === "owner" ? "Owner" : teamRole === "editor" ? "Editor" : "Viewer"}
                    </Badge>
                    <span className="text-xs text-muted">
                      {displayMemberCount} {displayMemberCount === 1 ? "member" : "members"}
                    </span>
                  </div>
                </div>
              </div>

              {perms.canManageSelectedTeam ? (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="team-name">Team name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="team-name"
                      value={nameDraft}
                      placeholder="Team name"
                      className={shellFocusRingClass}
                      onChange={(e) => {
                        setNameDraft(e.target.value);
                        setNameDirty(e.target.value !== team.name);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && nameDirty) void handleSaveName();
                      }}
                    />
                    <Button size="sm" disabled={!nameDirty || savingName} onClick={handleSaveName}>
                      {savingName ? <Loader2 className="size-4 animate-spin" /> : null}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <p className={dashboardLabelClass}>Name</p>
                  <p className="mt-1 text-sm font-semibold text-highlighted">{team.name}</p>
                </div>
              )}
            </div>
          </section>

          {/* Members */}
          <section className={dashboardSectionClass}>
            <div className={dashboardCardClass}>
              <p className={dashboardLabelClass}>Members</p>
              {sortedMembers.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No members yet.</p>
              ) : (
                <div className="mt-3 max-h-64 space-y-1 overflow-y-auto overscroll-contain">
                  {sortedMembers.map((member) => {
                    const isSelf = member.userId === currentUserId;
                    const canAct = perms.canModifyRoles && !isSelf;
                    const isRemoving = confirmRemoveUserId === member.userId;

                    return (
                      <div
                        key={member.userId}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                          isRemoving ? "bg-destructive/5" : "hover:bg-muted/30",
                        )}
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-default bg-muted/40 text-xs font-semibold text-muted">
                          {(member.userName || member.userEmail).charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-highlighted">
                              {member.userName || member.userEmail.split("@")[0]}
                            </span>
                            {isSelf ? (
                              <Badge variant="outline" className="text-[10px] leading-none">
                                You
                              </Badge>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-muted">{member.userEmail}</p>
                        </div>

                        <div className="flex items-center gap-2 border-l border-default pl-3">
                          <Badge
                            variant={member.role === "owner" ? "default" : "secondary"}
                            className="shrink-0"
                          >
                            {member.role === "owner"
                              ? "Owner"
                              : member.role === "editor"
                                ? "Editor"
                                : "Viewer"}
                          </Badge>

                          {canAct ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                {isRemoving ? (
                                  <div className="flex items-center gap-1.5 text-xs text-destructive">
                                    <Loader2 className="size-3 animate-spin" />
                                    Removing
                                  </div>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 shrink-0 rounded-lg text-muted hover:text-highlighted hover:bg-muted/40"
                                    aria-label={`Actions for ${member.userName || member.userEmail}`}
                                  >
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                )}
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                {roleOptions.map((option) =>
                                  option.value !== member.role ? (
                                    <DropdownMenuItem
                                      key={option.value}
                                      onClick={() => handleRoleChange(member.userId, option.value)}
                                    >
                                      Make {option.label}
                                    </DropdownMenuItem>
                                  ) : null,
                                )}
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setConfirmRemoveUserId(member.userId)}
                                >
                                  Remove from team
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Confirm remove */}
          {confirmRemoveUserId && !sortedMembers.find((m) => m.userId === confirmRemoveUserId)
            ? null
            : null}
          {confirmRemoveUserId ? (
            <section className={dashboardSectionClass}>
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-semibold text-destructive">
                  Remove{" "}
                  {sortedMembers.find((m) => m.userId === confirmRemoveUserId)?.userName ||
                    "member"}
                  ?
                </p>
                <p className="mt-1 text-xs text-destructive/80">
                  This will revoke access to all shared nodes immediately.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveMember(confirmRemoveUserId)}
                  >
                    <UserMinus className="size-4" />
                    Remove
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmRemoveUserId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          {/* Invite */}
          {perms.canInvite ? (
            <section className={dashboardSectionClass}>
              <div className={dashboardCardClass}>
                <p className={dashboardLabelClass}>Invite member</p>
                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      placeholder="colleague@company.com"
                      className={shellFocusRingClass}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !actionButtonDisabled) void handleAddMember();
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <div
                      className="inline-flex gap-1 rounded-lg border border-muted/60 bg-elevated/20 p-1"
                      role="radiogroup"
                      aria-label="Invite role"
                    >
                      {roleOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={inviteRole === option.value}
                          className={cn(
                            "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                            shellFocusRingClass,
                            inviteRole === option.value
                              ? "bg-default text-highlighted shadow-xs ring-1 ring-primary/30"
                              : "text-muted hover:text-highlighted",
                          )}
                          onClick={() => setInviteRole(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button size="sm" disabled={actionButtonDisabled} onClick={handleAddMember}>
                    {addingMember ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Mail className="size-4" />
                    )}
                    Add member
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          {/* Danger zone */}
          {perms.canDeleteTeam ? (
            <section className={dashboardSectionClass}>
              <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive">
                    <Trash2 className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-destructive">Delete team</p>
                    <p className="mt-1 text-xs leading-relaxed text-destructive/70">
                      Permanently delete {team.name} and detach all shared nodes. This action cannot
                      be undone.
                    </p>
                  </div>
                </div>

                {confirmDelete ? (
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deletingTeam}
                      onClick={handleDeleteTeam}
                    >
                      {deletingTeam ? <Loader2 className="size-4 animate-spin" /> : null}
                      Confirm delete
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={deletingTeam}
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="size-4" />
                    Delete team
                  </Button>
                )}
              </div>
            </section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
