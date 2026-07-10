import { AgencyMemberAvatar } from "@/components/agency/agency-member-avatar";
import { useAgencyPresenceMembers } from "@/lib/queries/agency";
import { agencyAvatarStackRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

const STACK_AVATAR_LIMIT = 4;

type AgencyPresenceAvatarsProps = {
  teamId: string;
  className?: string;
};

export function AgencyPresenceAvatars({ teamId, className }: AgencyPresenceAvatarsProps) {
  const { members } = useAgencyPresenceMembers(teamId);

  if (!teamId || members.length === 0) {
    return null;
  }

  const visibleMembers = members.slice(0, STACK_AVATAR_LIMIT);
  const overflowCount = members.length - visibleMembers.length;
  const groupLabel =
    members.length === 1
      ? `${members[0]?.userName ?? "Member"} is tracking time`
      : `${members.length} team members tracking time`;

  return (
    <div className={cn("inline-flex items-center", className)} role="img" aria-label={groupLabel}>
      {visibleMembers.map((member, index) => (
        <span
          key={member.userId}
          className={cn(index > 0 && "-ml-2")}
          style={{ zIndex: index + 1 }}
          title={`${member.userName} · ${member.projectName}`}
        >
          <AgencyMemberAvatar
            name={member.userName}
            avatarUrl={member.userAvatar}
            size="sm"
            className={cn("size-7 rounded-full", agencyAvatarStackRingClass)}
          />
        </span>
      ))}
      {overflowCount > 0 ? (
        <span
          className={cn(
            "relative z-10 -ml-2 flex size-7 shrink-0 items-center justify-center rounded-full",
            "bg-muted text-[10px] font-bold text-foreground",
            agencyAvatarStackRingClass,
          )}
          title={`${overflowCount} more tracking time`}
          aria-hidden
        >
          +{overflowCount}
        </span>
      ) : null}
    </div>
  );
}
