import { useEffect, useState } from "react";

import { getDicebearGlyphAvatarUrl } from "@/lib/dicebear-avatar-url";
import { cn } from "@/lib/utils";

type AgencyMemberAvatarSize = "sm" | "md";

const sizeClasses: Record<AgencyMemberAvatarSize, string> = {
  sm: "size-5 rounded-md",
  md: "size-8 rounded-xl",
};

type AgencyMemberAvatarProps = {
  name: string;
  userId?: string | null;
  avatarUrl?: string | null;
  size?: AgencyMemberAvatarSize;
  className?: string;
  /** Empty string (default) marks the image decorative. */
  alt?: string;
};

export function AgencyMemberAvatar({
  name,
  userId,
  avatarUrl,
  size = "sm",
  className,
  alt = "",
}: AgencyMemberAvatarProps) {
  const seed = userId?.trim() || name.trim() || "orch";
  const fallbackUrl = getDicebearGlyphAvatarUrl(seed);
  const preferredUrl = avatarUrl?.trim() || fallbackUrl;
  const [src, setSrc] = useState(preferredUrl);

  useEffect(() => {
    setSrc(preferredUrl);
  }, [preferredUrl]);

  return (
    <img
      src={src}
      alt={alt}
      className={cn(sizeClasses[size], "shrink-0 object-cover bg-muted", className)}
      onError={() => {
        if (src !== fallbackUrl) {
          setSrc(fallbackUrl);
        }
      }}
    />
  );
}
