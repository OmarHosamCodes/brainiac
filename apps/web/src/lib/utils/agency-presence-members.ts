import { getServerUrl } from "@/lib/env";
import { getUserAvatarPublicUrl } from "@/lib/user-avatar-url";

export type AgencyPresenceMember = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  projectName: string;
  description: string;
  startedAt: string;
};

type AgencyPresenceTimer = {
  teamId: string;
  userId: string;
  projectName: string;
  description: string;
  startedAt: string;
};

type AgencyPresenceSessionUser = {
  id: string;
  name?: string | null;
  image?: string | null;
};

export function mergeAgencyPresenceMembers(
  items: AgencyPresenceMember[],
  timer: AgencyPresenceTimer | null | undefined,
  teamId: string,
  user?: AgencyPresenceSessionUser | null,
): AgencyPresenceMember[] {
  if (!timer || timer.teamId !== teamId || !timer.userId) {
    return items;
  }

  if (items.some((member) => member.userId === timer.userId)) {
    return items;
  }

  const isCurrentUser = user?.id === timer.userId;
  const serverUrl = getServerUrl();

  return [
    {
      userId: timer.userId,
      userName: isCurrentUser ? (user?.name?.trim() || "You") : "Member",
      userAvatar:
        isCurrentUser && user?.image && user.id && serverUrl
          ? getUserAvatarPublicUrl({
              baseUrl: serverUrl,
              userId: user.id,
              storageKey: user.image,
            })
          : null,
      projectName: timer.projectName,
      description: timer.description,
      startedAt: timer.startedAt,
    },
    ...items,
  ];
}
