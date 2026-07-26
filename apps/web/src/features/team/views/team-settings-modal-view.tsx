import { type ReactNode } from "react";
import {
  AlertTriangle,
  Box,
  Loader2,
  Mail,
  MoreHorizontal,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";

import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import type {
  TeamSettingsModalViewModel,
  TeamSettingsRole,
} from "@/features/team/hooks/use-team-settings-modal-actions";
import type { TeamSettingsPane } from "@/features/team/hooks/use-team-settings-modal-state";
import { getTeamAvatarPublicUrl } from "@/features/team/team-avatar-url";
import { getServerUrl } from "@/lib/env";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

const roleOptions: Array<{ value: TeamSettingsRole; label: string }> = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "owner", label: "Owner" },
];

type TeamSettingsModalViewProps = {
  viewModel: TeamSettingsModalViewModel;
};

type NavItem = {
  id: TeamSettingsPane;
  label: string;
  icon: typeof Box;
  visible: boolean;
};

function SettingsRow({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <Label htmlFor={htmlFor} className="shrink-0 text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">{children}</div>
    </div>
  );
}

export function TeamSettingsModalView({ viewModel }: TeamSettingsModalViewProps) {
  const {
    open,
    team,
    teamRole,
    displayMemberCount,
    sortedMembers,
    currentUserId,
    permissions: perms,
    pane,
    nameDraft,
    nameDirty,
    savingName,
    uploadingImage,
    inviteEmail,
    inviteRole,
    addingMember,
    confirmDelete,
    confirmRemoveUserId,
    deletingTeam,
    actionButtonDisabled,
    removeTargetName,
    onOpenChange,
    onPaneChange,
    onNameDraftChange,
    onSaveName,
    onPickImage,
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

  const serverUrl = getServerUrl();
  const teamAvatarUrl =
    team.image && serverUrl
      ? getTeamAvatarPublicUrl({
          baseUrl: serverUrl,
          teamId: team.id,
          storageKey: team.image,
        })
      : null;
  const teamInitial = team.name.charAt(0).toUpperCase();

  const navItems: NavItem[] = [
    { id: "general", label: "General", icon: Box, visible: true },
    { id: "members", label: "Members", icon: Users, visible: true },
    { id: "invite", label: "Invite", icon: Mail, visible: perms.canInvite },
    { id: "danger", label: "Danger", icon: AlertTriangle, visible: perms.canDeleteTeam },
  ];

  const visibleNav = navItems.filter((item) => item.visible);
  const activePane = visibleNav.some((item) => item.id === pane) ? pane : "general";

  const paneTitle =
    activePane === "general"
      ? "General"
      : activePane === "members"
        ? "Members"
        : activePane === "invite"
          ? "Invite"
          : "Danger";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogTitle className="sr-only">Team settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage {team.name} — profile, members, roles, and permissions.
        </DialogDescription>

        <div className="flex h-[min(32rem,85vh)] overflow-hidden">
          <nav
            className="flex w-48 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-muted/30 p-3"
            aria-label="Team settings sections"
          >
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const isActive = activePane === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                    shellFocusRingClass,
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onPaneChange(item.id)}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain p-6 pr-14">
            <h2 className="text-xl font-semibold tracking-tight text-foreground text-balance">
              {paneTitle}
            </h2>

            {activePane === "general" ? (
              <div className="mt-6 flex flex-col">
                <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">Agency profile</p>
                    <p className="text-xs text-muted-foreground">
                      Shown in the team switcher across Orch.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar size="lg" className="size-14 rounded-xl after:rounded-xl">
                      {teamAvatarUrl ? (
                        <AvatarImage
                          src={teamAvatarUrl}
                          alt=""
                          className="rounded-xl object-cover"
                        />
                      ) : null}
                      <AvatarFallback className="rounded-xl text-base font-semibold">
                        {teamInitial}
                      </AvatarFallback>
                    </Avatar>
                    {perms.canManageSelectedTeam ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={uploadingImage}
                        onClick={onPickImage}
                      >
                        {uploadingImage ? <Loader2 className="size-4 animate-spin" /> : null}
                        Change
                      </Button>
                    ) : null}
                  </div>
                </div>

                <SettingsRow label="Team name" htmlFor="team-name">
                  {perms.canManageSelectedTeam ? (
                    <>
                      <Input
                        id="team-name"
                        value={nameDraft || team.name}
                        placeholder="Team name"
                        className={cn("max-w-56", shellFocusRingClass)}
                        onChange={(e) => onNameDraftChange(e.target.value)}
                        onFocus={() => {
                          if (!nameDraft) onNameDraftChange(team.name);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && nameDirty) onSaveName();
                        }}
                      />
                      {nameDirty ? (
                        <Button size="sm" disabled={savingName} onClick={onSaveName}>
                          {savingName ? <Loader2 className="size-4 animate-spin" /> : null}
                          Save
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">{team.name}</span>
                  )}
                </SettingsRow>

                <SettingsRow label="Your role">
                  <Badge variant="secondary">
                    {teamRole === "owner" ? "Owner" : teamRole === "editor" ? "Editor" : "Viewer"}
                  </Badge>
                </SettingsRow>

                <SettingsRow label="Members">
                  <span className="text-sm text-muted-foreground">
                    {displayMemberCount} {displayMemberCount === 1 ? "member" : "members"}
                  </span>
                </SettingsRow>
              </div>
            ) : null}

            {activePane === "members" ? (
              <div className="mt-6 flex flex-col gap-1">
                {sortedMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members yet.</p>
                ) : (
                  sortedMembers.map((member) => {
                    const isSelf = member.userId === currentUserId;
                    const canAct = perms.canModifyRoles && !isSelf;
                    const isRemoving = confirmRemoveUserId === member.userId;

                    return (
                      <div
                        key={member.userId}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                          isRemoving ? "bg-destructive/5" : "hover:bg-muted/40",
                        )}
                      >
                        <AgencyMemberAvatar
                          name={member.userName || member.userEmail}
                          userId={member.userId}
                          avatarUrl={member.userAvatar}
                          size="md"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-foreground">
                              {member.userName || member.userEmail.split("@")[0]}
                            </span>
                            {isSelf ? (
                              <Badge variant="outline" className="text-[10px] leading-none">
                                You
                              </Badge>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {member.userEmail}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 border-l border-border pl-3">
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
                                    className="size-8 shrink-0 rounded-lg text-muted-foreground hover:bg-muted/40 hover:text-foreground"
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
                  })
                )}

                {confirmRemoveUserId ? (
                  <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-sm font-semibold text-destructive">
                      Remove {removeTargetName}?
                    </p>
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
                ) : null}
              </div>
            ) : null}

            {activePane === "invite" && perms.canInvite ? (
              <div className="mt-6 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
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

                <div className="flex flex-col gap-2">
                  <Label>Role</Label>
                  <div
                    className="inline-flex gap-1 rounded-lg border border-border bg-muted/20 p-1"
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
                          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                          shellFocusRingClass,
                          inviteRole === option.value
                            ? "bg-background text-foreground shadow-xs ring-1 ring-border"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        onClick={() => onInviteRoleChange(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  size="sm"
                  className="self-start"
                  disabled={actionButtonDisabled}
                  onClick={onAddMember}
                >
                  {addingMember ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Mail className="size-4" />
                  )}
                  Add member
                </Button>
              </div>
            ) : null}

            {activePane === "danger" && perms.canDeleteTeam ? (
              <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/[0.03] p-4">
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
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
