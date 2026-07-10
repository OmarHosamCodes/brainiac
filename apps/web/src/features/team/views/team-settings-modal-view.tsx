import { Loader2, Mail, MoreHorizontal, Trash2, UserMinus, Users } from "lucide-react";

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
import {
  dashboardCardClass,
  dashboardCardHeaderClass,
  dashboardCardIconClass,
  dashboardLabelClass,
  dashboardSectionClass,
} from "@/features/dashboard/dashboard-ui";
import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { cn } from "@/lib/utils";
import type {
  TeamSettingsModalViewModel,
  TeamSettingsRole,
} from "@/features/team/hooks/use-team-settings-modal-actions";

const roleOptions: Array<{ value: TeamSettingsRole; label: string }> = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "owner", label: "Owner" },
];

type TeamSettingsModalViewProps = {
  viewModel: TeamSettingsModalViewModel;
};

export function TeamSettingsModalView({ viewModel }: TeamSettingsModalViewProps) {
  const {
    open,
    team,
    teamRole,
    displayMemberCount,
    sortedMembers,
    currentUserId,
    permissions: perms,
    nameDraft,
    nameDirty,
    savingName,
    inviteEmail,
    inviteRole,
    addingMember,
    confirmDelete,
    confirmRemoveUserId,
    deletingTeam,
    actionButtonDisabled,
    removeTargetName,
    onOpenChange,
    onNameDraftChange,
    onSaveName,
    onInviteEmailChange,
    onInviteRoleChange,
    onAddMember,
    onUpdateMemberRole,
    onRequestRemoveMember,
    onRemoveMember,
    onCancelRemoveMember,
    onRequestDeleteTeam,
    onCancelDeleteTeam,
    onDeleteTeam,
  } = viewModel;

  if (!team) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                      onChange={(e) => onNameDraftChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && nameDirty) onSaveName();
                      }}
                    />
                    <Button size="sm" disabled={!nameDirty || savingName} onClick={onSaveName}>
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
                                      onClick={() =>
                                        onUpdateMemberRole(member.userId, option.value)
                                      }
                                    >
                                      Make {option.label}
                                    </DropdownMenuItem>
                                  ) : null,
                                )}
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => onRequestRemoveMember(member.userId)}
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
                <p className="text-sm font-semibold text-destructive">Remove {removeTargetName}?</p>
                <p className="mt-1 text-xs text-destructive/80">
                  This will revoke access to all shared nodes immediately.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onRemoveMember(confirmRemoveUserId)}
                  >
                    <UserMinus className="size-4" />
                    Remove
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onCancelRemoveMember}>
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
                      onChange={(e) => onInviteEmailChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !actionButtonDisabled) onAddMember();
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
                          onClick={() => onInviteRoleChange(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button size="sm" disabled={actionButtonDisabled} onClick={onAddMember}>
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
                      onClick={onDeleteTeam}
                    >
                      {deletingTeam ? <Loader2 className="size-4 animate-spin" /> : null}
                      Confirm delete
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={deletingTeam}
                      onClick={onCancelDeleteTeam}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={onRequestDeleteTeam}
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
