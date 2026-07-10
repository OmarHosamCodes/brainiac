import { initials } from "@/lib/utils/initials";
import { cn } from "@/lib/utils";

type AgencyMemberAvatarSize = "sm" | "md";

const sizeClasses: Record<AgencyMemberAvatarSize, { box: string; text: string }> = {
  sm: { box: "size-5 rounded-md", text: "text-[9px]" },
  md: { box: "size-8 rounded-xl", text: "text-[11px]" },
};

type AgencyMemberAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: AgencyMemberAvatarSize;
  className?: string;
};

export function AgencyMemberAvatar({
  name,
  avatarUrl,
  size = "sm",
  className,
}: AgencyMemberAvatarProps) {
  const { box, text } = sizeClasses[size];

  if (avatarUrl) {
    return <img src={avatarUrl} alt="" className={cn(box, "shrink-0 object-cover", className)} />;
  }

  return (
    <span
      className={cn(
        box,
        "flex shrink-0 items-center justify-center bg-muted font-bold text-foreground",
        text,
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
