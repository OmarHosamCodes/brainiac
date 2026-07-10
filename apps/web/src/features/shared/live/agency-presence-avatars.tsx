import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { useAgencyPresenceMembers } from "@/features/shared/agency-queries";
import { cn } from "@/lib/utils";

const GRID_CAPACITY = 4;

type AgencyPresenceAvatarsProps = {
  teamId: string;
  className?: string;
};

export function AgencyPresenceAvatars({ teamId, className }: AgencyPresenceAvatarsProps) {
  const { members } = useAgencyPresenceMembers(teamId);

  if (!teamId || members.length === 0) {
    return null;
  }

  const showOverflow = members.length > GRID_CAPACITY;
  const visibleMembers = showOverflow ? members.slice(0, 3) : members.slice(0, GRID_CAPACITY);
  const overflowCount = showOverflow ? members.length - 3 : 0;
  const groupLabel =
    members.length === 1
      ? `${members[0]?.userName ?? "Member"} is tracking time`
      : `${members.length} team members tracking time`;

  return (
    <div
      className={cn(
        "grid size-9 shrink-0 grid-cols-2 gap-px overflow-hidden rounded-md border border-default bg-elevated p-px",
        className,
      )}
      role="img"
      aria-label={groupLabel}
    >
      {visibleMembers.map((member) => (
        <span
          key={member.userId}
          className="size-full min-h-0 min-w-0 overflow-hidden rounded-[3px]"
          title={`${member.userName} · ${member.projectName}`}
        >
          <AgencyMemberAvatar
            name={member.userName}
            avatarUrl={member.userAvatar}
            size="sm"
            className="size-full rounded-[3px]"
          />
        </span>
      ))}
      {overflowCount > 0 ? (
        <span
          className="flex size-full items-center justify-center rounded-[3px] bg-muted text-[9px] font-bold leading-none text-foreground"
          title={`${overflowCount} more tracking time`}
          aria-hidden
        >
          +{overflowCount}
        </span>
      ) : null}
    </div>
  );
}
