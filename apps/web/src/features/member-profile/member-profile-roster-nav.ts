export type MemberProfileRosterMember = {
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
};

export type MemberProfileRosterNav = {
  members: MemberProfileRosterMember[];
  current: MemberProfileRosterMember | null;
  previous: MemberProfileRosterMember | null;
  next: MemberProfileRosterMember | null;
  index: number;
  total: number;
};

export function memberProfileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

/** Stable A→Z roster so prev/next order matches the picker list. */
export function sortMemberProfileRoster(
  members: MemberProfileRosterMember[],
): MemberProfileRosterMember[] {
  return [...members].sort((a, b) => {
    const byName = a.userName.localeCompare(b.userName, undefined, { sensitivity: "base" });
    if (byName !== 0) return byName;
    return a.userId.localeCompare(b.userId);
  });
}

export function resolveMemberProfileRosterNav(
  members: MemberProfileRosterMember[],
  subjectUserId: string,
): MemberProfileRosterNav {
  const sorted = sortMemberProfileRoster(members);
  const index = sorted.findIndex((member) => member.userId === subjectUserId);
  const current =
    index >= 0 ? (sorted[index] ?? null) : (sorted.find((m) => m.userId === subjectUserId) ?? null);
  const resolvedIndex = index >= 0 ? index : -1;

  return {
    members: sorted,
    current:
      current ??
      (subjectUserId
        ? {
            userId: subjectUserId,
            userName: "Member",
            userAvatarUrl: null,
          }
        : null),
    previous: resolvedIndex > 0 ? (sorted[resolvedIndex - 1] ?? null) : null,
    next:
      resolvedIndex >= 0 && resolvedIndex < sorted.length - 1
        ? (sorted[resolvedIndex + 1] ?? null)
        : null,
    index: resolvedIndex,
    total: sorted.length,
  };
}

export function filterMemberProfileRoster(
  members: MemberProfileRosterMember[],
  searchTerm: string,
): MemberProfileRosterMember[] {
  const needle = searchTerm.trim().toLowerCase();
  if (!needle) return members;
  return members.filter((member) => member.userName.toLowerCase().includes(needle));
}
