import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { useAgencyPresenceMembers } from "@/features/shared/agency-queries";
import { agencyAvatarStackRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

const STACK_CAPACITY = 3;

type AgencyPresenceAvatarsProps = {
  teamId: string;
  className?: string;
};

export function AgencyPresenceAvatars({ teamId, className }: AgencyPresenceAvatarsProps) {
  const { members } = useAgencyPresenceMembers(teamId);

  if (!teamId || members.length === 0) {
    return null;
  }

  const overflowCount = members.length > STACK_CAPACITY ? members.length - STACK_CAPACITY : 0;
  const visibleMembers = members.slice(0, STACK_CAPACITY);
  const groupLabel =
    members.length === 1
      ? `${members[0]?.userName ?? "Member"} is tracking time`
      : `${members.length} team members tracking time`;

  return (
    <div
      className={cn("inline-flex shrink-0 items-center", className)}
      role="img"
      aria-label={groupLabel}
    >
      {visibleMembers.map((member, index) => (
        <span
          key={member.userId}
          className={cn("relative", index > 0 && "-ml-1.5")}
          style={{ zIndex: index + 1 }}
          title={`${member.userName} · ${member.projectName}`}
        >
          <AgencyMemberAvatar
            name={member.userName}
            avatarUrl={member.userAvatar}
            size="sm"
            className={cn("size-6 rounded-full", agencyAvatarStackRingClass)}
          />
        </span>
      ))}
      {overflowCount > 0 ? (
        <span
          className={cn(
            "relative z-10 -ml-1.5 flex size-6 shrink-0 items-center justify-center rounded-full",
            "bg-muted text-[9px] font-bold text-foreground",
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
